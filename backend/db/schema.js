const Logger = require('../utils/logger');

/**
 * 表结构定义与自愈式升级。
 *
 * 设计要点（对比旧的“一条查询一行日志”格式）：
 * 1. 维度表归一化：host / referrer / client ip / endpoint 只存一份，日志表只存自增 ID。
 *    旧格式里每个请求都要重复写一次 "mc.hypixel.net" + "/api/status_img" + IP 字符串。
 * 2. 时间用整数：ts 为 epoch 毫秒（8 字节），day_key 为 20261113 这样的整数（4 字节），
 *    不再使用 "2026-11-13 08:47:39" 这样的 19 字节字符串，也不依赖各数据库的日期函数。
 * 3. 聚合表：stat_hourly / stat_daily 只记录“每小时/每天 + 服务器 + 端点 + 成功/缓存”的计数，
 *    数据量跟着“组合数”走而不是跟着“请求数”走，长期保留也不会爆炸。
 * 4. 原始日志只是短周期样本，按 retention 自动清理。
 */

const SCHEMA_VERSION = 3;

function buildStatements(d) {
    return {
        tables: [
            `CREATE TABLE IF NOT EXISTS meta (
                k ${d.varchar(64)} NOT NULL PRIMARY KEY,
                v ${d.text}
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS servers (
                ${d.autoId('id')},
                host ${d.varchar(255)} NOT NULL,
                port ${d.int} NOT NULL,
                kind ${d.varchar(16)},
                first_seen ${d.bigint} NOT NULL,
                last_seen ${d.bigint} NOT NULL,
                query_count ${d.bigint} NOT NULL DEFAULT 0,
                UNIQUE (host, port)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS referrers (
                ${d.autoId('id')},
                host ${d.varchar(255)} NOT NULL,
                UNIQUE (host)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS clients (
                ${d.autoId('id')},
                ip ${d.varchar(64)} NOT NULL,
                UNIQUE (ip)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS endpoints (
                ${d.autoId('id')},
                path ${d.varchar(64)} NOT NULL,
                UNIQUE (path)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS query_logs (
                ${d.autoId('id')},
                ts ${d.bigint} NOT NULL,
                endpoint_id ${d.int},
                server_id ${d.int},
                client_id ${d.int},
                referrer_id ${d.int},
                is_ok ${d.bool} NOT NULL DEFAULT 0,
                from_cache ${d.bool} NOT NULL DEFAULT 0,
                delay_ms ${d.int},
                error ${d.varchar(160)}
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS stat_hourly (
                bucket_ts ${d.bigint} NOT NULL,
                server_id ${d.int} NOT NULL,
                endpoint_id ${d.int} NOT NULL,
                is_ok ${d.bool} NOT NULL,
                from_cache ${d.bool} NOT NULL,
                hits ${d.bigint} NOT NULL DEFAULT 0,
                delay_sum ${d.bigint} NOT NULL DEFAULT 0,
                PRIMARY KEY (bucket_ts, server_id, endpoint_id, is_ok, from_cache)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS stat_daily (
                day_key ${d.int} NOT NULL,
                server_id ${d.int} NOT NULL,
                endpoint_id ${d.int} NOT NULL,
                is_ok ${d.bool} NOT NULL,
                from_cache ${d.bool} NOT NULL,
                hits ${d.bigint} NOT NULL DEFAULT 0,
                delay_sum ${d.bigint} NOT NULL DEFAULT 0,
                PRIMARY KEY (day_key, server_id, endpoint_id, is_ok, from_cache)
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS server_cache (
                id ${d.varchar(191)} NOT NULL PRIMARY KEY,
                data ${d.longtext} NOT NULL,
                icon_id ${d.int},
                ts ${d.bigint} NOT NULL,
                expires_at ${d.bigint} NOT NULL
            ) ${d.tableOptions}`,

            `CREATE TABLE IF NOT EXISTS icon_store (
                ${d.autoId('id')},
                hash ${d.varchar(32)} NOT NULL,
                data ${d.longtext} NOT NULL,
                created_at ${d.bigint} NOT NULL,
                UNIQUE (hash)
            ) ${d.tableOptions}`,
        ],
        indexes: [
            ['idx_logs_ts', 'query_logs', ['ts']],
            ['idx_logs_server', 'query_logs', ['server_id', 'ts']],
            ['idx_logs_ok', 'query_logs', ['is_ok', 'ts']],
            ['idx_logs_client', 'query_logs', ['client_id']],
            ['idx_logs_referrer', 'query_logs', ['referrer_id']],
            ['idx_cache_exp', 'server_cache', ['expires_at']],
            ['idx_hourly_server', 'stat_hourly', ['server_id', 'bucket_ts']],
            ['idx_daily_server', 'stat_daily', ['server_id', 'day_key']],
        ],
    };
}

async function createIndex(adapter, name, table, columns, existing) {
    if (existing.has(`${table}.${name}`)) return;
    const sql = `CREATE INDEX ${name} ON ${table} (${columns.join(', ')})`;
    try {
        await adapter.execute(sql);
    } catch (err) {
        const msg = String(err.message || '');
        // 已存在 / 重复键名都视为成功
        if (!/already exists|Duplicate key name|ER_DUP_KEYNAME/i.test(msg)) {
            Logger.debug('[DB]', `创建索引 ${name} 跳过: ${msg}`);
        }
    }
}

async function existingIndexes(adapter) {
    const set = new Set();
    try {
        if (adapter.driver === 'sqlite') {
            const tables = await adapter.listTables();
            for (const t of tables) {
                const rows = await adapter.query(`PRAGMA index_list(${t})`);
                for (const r of rows) set.add(`${t}.${r.name}`);
            }
        } else {
            const rows = await adapter.query(
                `SELECT DISTINCT TABLE_NAME AS t, INDEX_NAME AS i FROM information_schema.statistics WHERE table_schema = DATABASE()`
            );
            for (const r of rows) set.add(`${r.t}.${r.i}`);
        }
    } catch (e) {
        Logger.debug('[DB]', `读取索引列表失败: ${e.message}`);
    }
    return set;
}

/** 给已存在的表补齐新增列（例如旧版 server_cache 没有 expires_at / icon_id） */
async function ensureColumns(adapter, d) {
    const migrations = [
        ['server_cache', 'icon_id', `${d.int}`],
        ['server_cache', 'expires_at', `${d.bigint}`],
        ['query_logs', 'error', `${d.varchar(160)}`],
        ['query_logs', 'referrer_id', `${d.int}`],
    ];
    const tables = new Set(await adapter.listTables());
    for (const [table, column, type] of migrations) {
        if (!tables.has(table)) continue;
        const info = await adapter.tableInfo(table);
        if (info.some(c => c.name === column)) continue;
        try {
            await adapter.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            Logger.info('[DB]', `已为 ${table} 添加列 ${column}`);
        } catch (err) {
            Logger.warn('[DB]', `为 ${table} 添加列 ${column} 失败: ${err.message}`);
        }
    }
}

async function ensureSchema(adapter, d) {
    const { tables, indexes } = buildStatements(d);

    for (const sql of tables) {
        await adapter.execute(sql);
    }

    await ensureColumns(adapter, d);

    const existing = await existingIndexes(adapter);
    for (const [name, table, cols] of indexes) {
        await createIndex(adapter, name, table, cols, existing);
    }

    // 记录 schema 版本
    try {
        const rows = await adapter.query('SELECT v FROM meta WHERE k = ?', ['schema_version']);
        if (!rows.length) {
            await adapter.execute('INSERT INTO meta (k, v) VALUES (?, ?)', ['schema_version', String(SCHEMA_VERSION)]);
        } else if (Number(rows[0].v) !== SCHEMA_VERSION) {
            await adapter.execute('UPDATE meta SET v = ? WHERE k = ?', [String(SCHEMA_VERSION), 'schema_version']);
        }
    } catch (e) {
        Logger.debug('[DB]', `写入 schema 版本失败: ${e.message}`);
    }
}

module.exports = { ensureSchema, SCHEMA_VERSION };
