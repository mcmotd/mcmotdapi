const { getDialect } = require('./dialect');
const Logger = require('../utils/logger');

/**
 * MySQL 适配器
 *
 * mysql2 是可选依赖：只有把 config.database.driver 改成 mysql 时才会被 require，
 * 这样纯 sqlite 部署不需要安装任何额外依赖。
 */
class MysqlAdapter {
    constructor(options = {}) {
        this.driver = 'mysql';
        this.dialect = getDialect('mysql');
        this.options = {
            host: options.host || '127.0.0.1',
            port: Number(options.port) || 3306,
            user: options.user || 'root',
            password: options.password || '',
            database: options.database || 'mcmotd',
            connectionLimit: Number(options.connectionLimit) || 10,
            charset: 'utf8mb4',
            waitForConnections: true,
            queueLimit: 0,
            timezone: 'Z',
            supportBigNumbers: true,
            bigNumberStrings: false,
            multipleStatements: false,
        };
        this.pool = null;
    }

    async init() {
        let mysql;
        try {
            mysql = require('mysql2/promise');
        } catch (e) {
            throw new Error('使用 MySQL 需要先安装依赖：cd backend && npm install mysql2');
        }
        this._mysql = mysql;

        const { database, ...base } = this.options;

        // 先建库（连不上库时也能自愈），再建连接池
        try {
            const conn = await mysql.createConnection(base);
            await conn.query(
                `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
            );
            await conn.end();
        } catch (err) {
            throw new Error(`连接 MySQL 失败: ${err.code || err.message}`);
        }

        this.pool = mysql.createPool({ ...this.options });
        const conn = await this.pool.getConnection();
        await conn.query("SET SESSION sql_mode = CONCAT(@@sql_mode, ',STRICT_TRANS_TABLES')");
        conn.release();

        Logger.info('[DB]', `MySQL 已连接: ${this.options.host}:${this.options.port}/${this.options.database}`);
        return this;
    }

    _assertReady() {
        if (!this.pool) throw new Error('数据库未初始化');
    }

    async query(sql, params = []) {
        this._assertReady();
        const [rows] = await this.pool.query(sql, params);
        return Array.isArray(rows) ? rows : [];
    }

    async execute(sql, params = []) {
        this._assertReady();
        const [result] = await this.pool.query(sql, params);
        return {
            affectedRows: result?.affectedRows ?? 0,
            insertId: result?.insertId ?? 0,
        };
    }

    async transaction(fn) {
        this._assertReady();
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            const tx = {
                query: async (sql, params = []) => {
                    const [rows] = await conn.query(sql, params);
                    return Array.isArray(rows) ? rows : [];
                },
                execute: async (sql, params = []) => {
                    const [result] = await conn.query(sql, params);
                    return { affectedRows: result?.affectedRows ?? 0, insertId: result?.insertId ?? 0 };
                },
            };
            const result = await fn(tx);
            await conn.commit();
            return result;
        } catch (err) {
            try { await conn.rollback(); } catch (e) { /* ignore */ }
            throw err;
        } finally {
            conn.release();
        }
    }

    async execScript(statements) {
        for (const sql of statements) {
            // MySQL 的 CREATE INDEX IF NOT EXISTS 支持有限，建索引失败已单独 try
            await this.execute(sql);
        }
    }

    async tableInfo(table) {
        const rows = await this.query(
            `SELECT COLUMN_NAME AS name, DATA_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_KEY AS pk
             FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ORDINAL_POSITION`,
            [table]
        );
        return rows.map(r => ({
            name: r.name,
            type: r.type,
            notnull: r.nullable === 'NO' ? 1 : 0,
            pk: r.pk === 'PRI' ? 1 : 0,
        }));
    }

    async listTables() {
        const rows = await this.query('SHOW TABLES');
        return rows.map(r => Object.values(r)[0]);
    }

    async tableStats() {
        const tables = await this.listTables();
        const out = [];
        for (const t of tables) {
            try {
                const r = await this.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
                out.push({ table: t, rows: Number(r?.[0]?.c) || 0 });
            } catch (e) {
                out.push({ table: t, rows: 0 });
            }
        }
        return out;
    }

    async size() {
        return this.dialect.sizeOf(this);
    }

    async compact() {
        const tables = await this.listTables();
        for (const t of tables) {
            try {
                await this.execute(`OPTIMIZE TABLE \`${t}\``);
            } catch (e) {
                Logger.debug('[DB]', `OPTIMIZE ${t} 失败: ${e.message}`);
            }
        }
        return true;
    }

    async close() {
        if (!this.pool) return;
        await this.pool.end();
        this.pool = null;
    }
}

module.exports = MysqlAdapter;
