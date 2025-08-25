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

// 初始化数据库，创建日志表
const init = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS query_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                endpoint TEXT NOT NULL,
                ip_address TEXT NOT NULL,
                port INTEGER,
                client_ip TEXT,
                was_successful BOOLEAN NOT NULL,
                server_type TEXT
            )
        `);
        console.log('数据库初始化成功，日志表已准备就绪。');
    });
};

// 记录每一次 API 查询
const logQuery = (logData) => {
    // 检查配置文件中的开关是否为 true
    if (!config.analytics || !config.analytics.enable) {
        return; // 如果未启用，则不记录
    }

    const { endpoint, ip, port, clientIp, success, serverType } = logData;
    const stmt = db.prepare("INSERT INTO query_logs (endpoint, ip_address, port, client_ip, was_successful, server_type) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(endpoint, ip, port, clientIp, success, serverType);
    stmt.finalize();
};

// 获取统计数据
const getStats = () => {
    return new Promise((resolve, reject) => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const queries = {
            totalQueries: "SELECT COUNT(*) as count FROM query_logs",
            successfulQueries: "SELECT COUNT(*) as count FROM query_logs WHERE was_successful = 1",
            queriesLast24h: `SELECT COUNT(*) as count FROM query_logs WHERE timestamp >= datetime('now', '-24 hours')`,
            topServers: "SELECT ip_address, port, COUNT(*) as count FROM query_logs GROUP BY ip_address, port ORDER BY count DESC LIMIT 10",
            endpointUsage: "SELECT endpoint, COUNT(*) as count FROM query_logs GROUP BY endpoint",
            typeUsage: "SELECT server_type, COUNT(*) as count FROM query_logs WHERE was_successful = 1 AND server_type IS NOT NULL GROUP BY server_type",
            recentQueries: "SELECT * FROM query_logs ORDER BY timestamp DESC LIMIT 20",
            dailyCounts: `SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count FROM query_logs WHERE timestamp >= ? GROUP BY date ORDER BY date ASC`
        };

        Promise.all([
            new Promise((res, rej) => db.get(queries.totalQueries, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.get(queries.successfulQueries, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.get(queries.queriesLast24h, [], (e, r) => e ? rej(e) : res(r.count))),
            new Promise((res, rej) => db.all(queries.topServers, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.endpointUsage, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.typeUsage, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.recentQueries, [], (e, r) => e ? rej(e) : res(r))),
            new Promise((res, rej) => db.all(queries.dailyCounts, [sevenDaysAgo], (e, r) => e ? rej(e) : res(r)))
        ]).then(([total, successful, last24h, topServers, endpointCounts, typeCounts, recent, daily]) => {
            const stats = {
                totalQueries: total || 0,
                successfulQueries: successful || 0,
                successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : "0.0",
                queriesLast24h: last24h || 0,
                topServers: topServers || [],
                endpointUsage: endpointCounts.reduce((acc, row) => ({ ...acc, [row.endpoint]: row.count }), {}),
                typeUsage: typeCounts.reduce((acc, row) => ({ ...acc, [row.server_type]: row.count }), {}),
                recentQueries: recent || [],
                dailyCounts: daily || []
            };
            resolve(stats);
        }).catch(reject);
    });
};
module.exports = { init, logQuery, getStats };