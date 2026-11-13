/**
 * SQL 方言助手
 *
 * 目的：让上层的建表 / 聚合写入语句只写一遍，由这里输出对应数据库的写法。
 * 目前支持 sqlite 与 mysql，两者都使用 `?` 占位符，这一层只处理 DDL 与 upsert 差异。
 */

const sqlite = {
    name: 'sqlite',
    int: 'INTEGER',
    bigint: 'INTEGER',
    bool: 'INTEGER',
    text: 'TEXT',
    longtext: 'TEXT',
    // sqlite 不强制字符串长度，统一用 TEXT
    varchar: () => 'TEXT',
    autoId(col = 'id') {
        return `${col} INTEGER PRIMARY KEY AUTOINCREMENT`;
    },
    tableOptions: '',
    // 维度表插入：冲突时忽略
    insertIgnore: 'INSERT OR IGNORE',
    // 聚合表累加（可同时累加多个列，例如 hits 与 delay_sum）
    upsertAdd({ table, columns, conflict, addCols }) {
        const cols = Array.isArray(addCols) ? addCols : [addCols];
        const placeholders = columns.map(() => '?').join(', ');
        const updates = cols.map(c => `${c} = ${c} + excluded.${c}`).join(', ');
        return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ` +
            `ON CONFLICT(${conflict.join(', ')}) DO UPDATE SET ${updates}`;
    },
    // 取当前时间的 SQL 表达式（只用于默认值，业务时间均由 JS 传入）
    now: 'CURRENT_TIMESTAMP',
    // 分页
    limitOffset: (limit, offset) => `LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    // 统计表体积 / 整理
    async sizeOf(adapter) {
        const rows = await adapter.query('PRAGMA page_count');
        const pageSize = await adapter.query('PRAGMA page_size');
        const pages = Number(rows?.[0]?.page_count) || 0;
        const size = Number(pageSize?.[0]?.page_size) || 0;
        return pages * size;
    },
};

const mysql = {
    name: 'mysql',
    int: 'INT',
    bigint: 'BIGINT',
    bool: 'TINYINT',
    text: 'TEXT',
    longtext: 'LONGTEXT',
    varchar: (n = 255) => `VARCHAR(${n})`,
    autoId(col = 'id') {
        return `${col} BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY`;
    },
    tableOptions: 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
    insertIgnore: 'INSERT IGNORE',
    upsertAdd({ table, columns, conflict, addCols }) {
        const cols = Array.isArray(addCols) ? addCols : [addCols];
        const placeholders = columns.map(() => '?').join(', ');
        // 注意：MySQL 8.0.20 起 VALUES() 被标记为废弃但依然可用；
        // 为了兼容 5.7 / 8.x 全系列，这里仍使用 VALUES()。
        const updates = cols.map(c => `${c} = ${c} + VALUES(${c})`).join(', ');
        return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ` +
            `ON DUPLICATE KEY UPDATE ${updates}`;
    },
    now: 'CURRENT_TIMESTAMP',
    limitOffset: (limit, offset) => `LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    async sizeOf(adapter) {
        const rows = await adapter.query(
            `SELECT COALESCE(SUM(data_length + index_length), 0) AS bytes
             FROM information_schema.tables WHERE table_schema = DATABASE()`
        );
        return Number(rows?.[0]?.bytes) || 0;
    },
};

const DIALECTS = { sqlite, mysql };

function getDialect(name) {
    const d = DIALECTS[String(name || 'sqlite').toLowerCase()];
    if (!d) throw new Error(`不支持的数据库类型: ${name}（可选: sqlite / mysql）`);
    return d;
}

module.exports = { getDialect, sqlite, mysql };
