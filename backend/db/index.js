const path = require('path');
const { getDialect } = require('./dialect');
const SqliteAdapter = require('./sqliteAdapter');
const MysqlAdapter = require('./mysqlAdapter');
const { ensureSchema } = require('./schema');
const Logger = require('../utils/logger');

/**
 * 数据库统一入口。
 *
 * 上层（analyticsService / cacheService / admin 路由）只依赖这里导出的
 * query / execute / transaction，具体跑 SQLite 还是 MySQL 由配置决定。
 */

let adapter = null;
let dialect = null;
let initPromise = null;

function defaultSqliteFile() {
    return path.join(__dirname, '..', 'data', 'mcmotd.db');
}

async function tableHasColumn(a, table, column) {
    try {
        const info = await a.tableInfo(table);
        return info.some(c => String(c.name).toLowerCase() === column.toLowerCase());
    } catch (e) {
        return false;
    }
}

/**
 * 旧版数据库结构迁移（只做结构，不动数据）：
 * - 旧 analytics.db 的 query_logs 使用 ip_address / timestamp 文本字段
 * - 旧 cache.db 的 server_cache 使用 timestamp 字段
 * 结构不一样无法原地升级，这里改名为 *_legacy 交给各服务自己导入。
 */
async function renameLegacyTables(a) {
    const tables = await a.listTables();

    if (tables.includes('query_logs')) {
        const isOld = await tableHasColumn(a, 'query_logs', 'ip_address');
        if (isOld) {
            if (tables.includes('query_logs_legacy')) {
                await a.execute('DROP TABLE query_logs_legacy');
            }
            await a.execute('ALTER TABLE query_logs RENAME TO query_logs_legacy');
            Logger.info('[DB]', '检测到旧版 query_logs，已重命名为 query_logs_legacy 等待导入');
        }
    }

    if (tables.includes('server_cache')) {
        const isOld = await tableHasColumn(a, 'server_cache', 'timestamp');
        const hasNew = await tableHasColumn(a, 'server_cache', 'ts');
        if (isOld && !hasNew) {
            if (tables.includes('server_cache_legacy')) {
                await a.execute('DROP TABLE server_cache_legacy');
            }
            await a.execute('ALTER TABLE server_cache RENAME TO server_cache_legacy');
            // 缓存是纯临时数据，直接丢弃即可
            await a.execute('DROP TABLE server_cache_legacy');
            Logger.info('[DB]', '旧版 server_cache 结构已废弃并清理（缓存可重建）');
        }
    }
}

async function init(databaseConfig = {}) {
    if (adapter) return adapter;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        const driver = String(databaseConfig.driver || 'sqlite').toLowerCase();
        dialect = getDialect(driver);

        if (driver === 'mysql') {
            adapter = new MysqlAdapter(databaseConfig.mysql || {});
        } else {
            const fs = require('fs');
            const file = databaseConfig.sqlite?.file || defaultSqliteFile();
            const target = path.isAbsolute(file) ? file : path.join(__dirname, '..', file);

            // 平滑升级：新库还没建、但历史上存在 data/analytics.db 时，直接把它复制成新库，
            // 旧表会被 renameLegacyTables 改名后由 analyticsService 导入到新结构里。
            const legacyAnalytics = path.join(__dirname, '..', 'data', 'analytics.db');
            if (!fs.existsSync(target) && fs.existsSync(legacyAnalytics) && path.resolve(legacyAnalytics) !== path.resolve(target)) {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.copyFileSync(legacyAnalytics, target);
                Logger.info('[DB]', `已把历史 analytics.db 复制到 ${path.basename(target)} 并在启动时自动迁移`);
            }

            adapter = new SqliteAdapter({ file: target });
        }

        await adapter.init();
        await renameLegacyTables(adapter);
        await ensureSchema(adapter, dialect);
        return adapter;
    })();

    return initPromise;
}

function getAdapter() {
    if (!adapter) throw new Error('数据库尚未初始化');
    return adapter;
}

function getDialectRef() {
    if (!dialect) throw new Error('数据库尚未初始化');
    return dialect;
}

const query = (sql, params) => getAdapter().query(sql, params);
const execute = (sql, params) => getAdapter().execute(sql, params);
const transaction = (fn) => getAdapter().transaction(fn);

function isReady() {
    return Boolean(adapter);
}

function driver() {
    return adapter ? adapter.driver : null;
}

async function info() {
    const a = getAdapter();
    let size = 0;
    try { size = await a.size(); } catch (e) { /* ignore */ }
    let tables = [];
    try { tables = await a.tableStats(); } catch (e) { /* ignore */ }
    return {
        driver: a.driver,
        target: a.driver === 'sqlite' ? a.file : `${a.options.host}:${a.options.port}/${a.options.database}`,
        sizeBytes: size,
        tables,
    };
}

async function close() {
    if (!adapter) return;
    await adapter.close();
    adapter = null;
    dialect = null;
    initPromise = null;
}

module.exports = {
    init,
    isReady,
    driver,
    query,
    execute,
    transaction,
    getAdapter,
    getDialect: getDialectRef,
    info,
    close,
};
