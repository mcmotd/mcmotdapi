const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/config.json'); 

// 确保 /data 目录存在，用于 Docker Volume 持久化
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const dbPath = path.join(dataDir, 'analytics.db');
const db = new sqlite3.Database(dbPath);


const init = () => {
    db.serialize(() => {
        // [核心修改] 在表中增加 referrer 字段
        db.run(`
            CREATE TABLE IF NOT EXISTS query_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                endpoint TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                port INTEGER,
                client_ip TEXT,
                was_successful BOOLEAN NOT NULL,
                server_type TEXT,
                referrer TEXT,
                from_cache BOOLEAN
            )
        `);
        console.log('数据库初始化成功，日志表已准备就绪。');
    });
};

// [核心修改] logQuery 函数现在接收 referrer
const logQuery = (logData) => {
    if (!config.analytics || !config.analytics.enable) {
        return;
    }
    const { endpoint, ip, port, clientIp, success, serverType, referrer, from_cache } = logData;
    const stmt = db.prepare("INSERT INTO query_logs (endpoint, ip_address, port, client_ip, was_successful, server_type, referrer, from_cache) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run(endpoint, ip, port, clientIp, success, serverType, referrer, from_cache);
    stmt.finalize();
};

const getStats = () => {
    return new Promise((resolve, reject) => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const queries = {
            totalQueries: "SELECT COUNT(*) as count FROM query_logs",
            successfulQueries: "SELECT COUNT(*) as count FROM query_logs WHERE was_successful = 1",
            queriesLast24h: `SELECT COUNT(*) as count FROM query_logs WHERE timestamp >= datetime('now', '-24 hours')`,
            topServers: "SELECT ip_address, port, COUNT(*) as count FROM query_logs GROUP BY ip_address, port ORDER BY count DESC LIMIT 10",
            topReferrers: "SELECT referrer, COUNT(*) as count FROM query_logs WHERE referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 10",
            recentQueries: "SELECT * FROM query_logs ORDER BY timestamp DESC LIMIT 20",
            dailyCounts: `SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count FROM query_logs WHERE timestamp >= ? GROUP BY date ORDER BY date ASC`
        };

        Promise.all([
            new Promise((res, rej) => db.get(queries.totalQueries, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.get(queries.successfulQueries, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.get(queries.queriesLast24h, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.all(queries.topServers, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.topReferrers, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.recentQueries, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.dailyCounts, [sevenDaysAgo], (e, r) => e ? rej(e) : res(r)))
        ]).then(([total, successful, last24h, topServers, topReferrers, recent, daily]) => {
            const stats = {
                totalQueries: total || 0,
                successfulQueries: successful || 0,
                successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : "0.0",
                queriesLast24h: last24h || 0,
                topServers: topServers || [],
                topReferrers: topReferrers || [],
                recentQueries: recent || [],
                dailyCounts: daily || []
            };
            resolve(stats);
        }).catch(reject);
    });
};

module.exports = { init, logQuery, getStats };