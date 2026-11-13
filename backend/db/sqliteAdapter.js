const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { getDialect } = require('./dialect');
const Logger = require('../utils/logger');

/**
 * SQLite 适配器
 *
 * - 所有写入（execute / transaction）串行化，避免 BEGIN ... COMMIT 被其它语句打断
 * - WAL + NORMAL 同步 + 自增 vacuum，兼顾并发读与文件体积
 * - 提供统一接口：query / execute / transaction / close / info
 */
class SqliteAdapter {
    constructor(options = {}) {
        this.driver = 'sqlite';
        this.dialect = getDialect('sqlite');
        this.file = path.isAbsolute(options.file || '')
            ? options.file
            : path.join(__dirname, '..', options.file || 'data/mcmotd.db');
        this.db = null;
        this._lock = Promise.resolve();
        this._closed = false;
    }

    _withLock(fn) {
        const run = this._lock.then(fn, fn);
        // 无论成功失败都要让队列继续
        this._lock = run.then(() => undefined, () => undefined);
        return run;
    }

    async init() {
        const dir = path.dirname(this.file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        await new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.file, (err) => (err ? reject(err) : resolve()));
        });

        // 这些 PRAGMA 是控制数据库文件体积的关键：
        // - WAL: 读写不互相阻塞
        // - auto_vacuum=INCREMENTAL: 允许 incremental_vacuum 回收空间（必须先设置，之后建表才生效）
        await this.run('PRAGMA journal_mode = WAL');
        await this.run('PRAGMA synchronous = NORMAL');
        await this.run('PRAGMA auto_vacuum = INCREMENTAL');
        await this.run('PRAGMA busy_timeout = 5000');
        await this.run('PRAGMA foreign_keys = ON');
        await this.run('PRAGMA wal_autocheckpoint = 512');
        // 新库可以用较小的 page_size 减少碎片浪费；已有库该设置被忽略
        await this.run('PRAGMA page_size = 4096');

        Logger.info('[DB]', `SQLite 已连接: ${this.file}`);
        return this;
    }

    _run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('数据库未初始化'));
            this.db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ affectedRows: this.changes, insertId: this.lastID });
            });
        });
    }

    /** 执行不关心结果集的语句（PRAGMA / BEGIN 等，不走写锁） */
    run(sql, params = []) {
        return this._run(sql, params);
    }

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject(new Error('数据库未初始化'));
            this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
        });
    }

    /** 写入类语句走写锁，保证同一时刻只有一个写事务 */
    execute(sql, params = []) {
        return this._withLock(() => this._run(sql, params));
    }

    /**
     * 事务：回调内所有语句必须使用 tx 对象，避免绕过锁。
     * @param {(tx: {query:Function, execute:Function}) => Promise<any>} fn
     */
    transaction(fn) {
        return this._withLock(async () => {
            await this._run('BEGIN IMMEDIATE');
            const tx = {
                query: (sql, params) => this.query(sql, params),
                execute: (sql, params) => this._run(sql, params),
            };
            try {
                const result = await fn(tx);
                await this._run('COMMIT');
                return result;
            } catch (err) {
                try { await this._run('ROLLBACK'); } catch (e) { /* ignore */ }
                throw err;
            }
        });
    }

    /** 执行多语句（建表用） */
    async execScript(statements) {
        for (const sql of statements) {
            await this.execute(sql);
        }
    }

    /** 表结构信息 */
    async tableInfo(table) {
        return this.query(`PRAGMA table_info(${table})`);
    }

    async listTables() {
        const rows = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        return rows.map(r => r.name);
    }

    async tableStats() {
        const tables = await this.listTables();
        const out = [];
        for (const t of tables) {
            let rows = 0;
            try {
                const r = await this.query(`SELECT COUNT(*) AS c FROM ${t}`);
                rows = Number(r?.[0]?.c) || 0;
            } catch (e) { /* ignore */ }
            out.push({ table: t, rows });
        }
        return out;
    }

    async size() {
        return this.dialect.sizeOf(this);
    }

    /** 把 WAL 合并回主库并截断，避免 -wal 文件越涨越大 */
    async checkpoint(mode = 'TRUNCATE') {
        return this._withLock(async () => {
            await this._run(`PRAGMA wal_checkpoint(${mode})`);
            return true;
        });
    }

    /** 回收空间：incremental 模式下逐块回收，再 checkpoint 把 WAL 截断 */
    async compact() {
        return this._withLock(async () => {
            await this._run('PRAGMA wal_checkpoint(TRUNCATE)');

            const before = await this.query('PRAGMA freelist_count');
            const free = Number(before?.[0]?.freelist_count) || 0;
            if (free <= 0) {
                await this._run('PRAGMA optimize');
                return true;
            }

            // 一次可以回收多页，这里循环到没有可回收页为止（最多 200 轮，避免长时间占用）
            for (let i = 0; i < 200; i++) {
                const cur = await this.query('PRAGMA freelist_count');
                const left = Number(cur?.[0]?.freelist_count) || 0;
                if (left <= 0) break;
                await this._run('PRAGMA incremental_vacuum(200)');
                const after = await this.query('PRAGMA freelist_count');
                if ((Number(after?.[0]?.freelist_count) || 0) >= left) break;
            }

            // 老库的 auto_vacuum 是 NONE，增量回收无能为力，只能整体重建一次
            const rest = await this.query('PRAGMA freelist_count');
            if ((Number(rest?.[0]?.freelist_count) || 0) > 0) {
                Logger.info('[DB]', '增量回收不可用，执行一次 VACUUM 重建数据库文件');
                await this._run('VACUUM');
                await this._run('PRAGMA wal_checkpoint(TRUNCATE)');
            }

            await this._run('PRAGMA optimize');
            return true;
        });
    }

    async close() {
        if (this._closed) return;
        this._closed = true;
        await this._withLock(async () => {
            if (!this.db) return;
            try { await this._run('PRAGMA wal_checkpoint(TRUNCATE)'); } catch (e) { /* ignore */ }
            await new Promise((resolve) => this.db.close(() => resolve()));
            this.db = null;
        });
    }
}

module.exports = SqliteAdapter;
