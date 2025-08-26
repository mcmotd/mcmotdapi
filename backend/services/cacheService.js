const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}
const dbPath = path.join(dataDir, 'cache.db');
const db = new sqlite3.Database(dbPath);

const init = () => {
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS server_cache (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )
        `);
        console.log('数据库初始化成功，缓存表已准备就绪。');
    });
};

const getCache = (key, ttlSeconds) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT data, timestamp FROM server_cache WHERE id = ?", [key], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null); // 未命中缓存

            const isExpired = (Date.now() - row.timestamp) / 1000 > ttlSeconds;
            if (isExpired) {
                // 缓存已过期，从数据库中删除
                db.run("DELETE FROM server_cache WHERE id = ?", [key]);
                return resolve(null);
            }

            resolve(JSON.parse(row.data)); // 返回有效的缓存数据
        });
    });
};

const setCache = (key, value) => {
    const data = JSON.stringify(value);
    const timestamp = Date.now();
    db.run("REPLACE INTO server_cache (id, data, timestamp) VALUES (?, ?, ?)", [key, data, timestamp]);
};

module.exports = { init, getCache, setCache };