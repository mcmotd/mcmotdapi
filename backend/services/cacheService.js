const crypto = require('crypto');
const db = require('../db');
const configService = require('./configService');
const Logger = require('../utils/logger');

/**
 * 缓存服务（重写版）
 *
 * 旧实现的问题：
 * 1. 表里只有 (id, data, timestamp)，过期数据只在“被再次读到”时才删除 →
 *    热门服务器永远不过期、冷门服务器永不回收，文件只会变大；
 * 2. data 里直接存 favicon 的 base64（单张 10~60KB），每次刷新都整段重写一遍，
 *    缓存库体积主要就是这些重复图标；
 * 3. REPLACE 语句没有错误回调，DB 出错会把进程带崩。
 *
 * 现在：
 * 1. 增加 expires_at，按 TTL 精确过期，并支持定时清理；
 * 2. 图标按 md5 去重存到 icon_store，server_cache 只存 4 字节的 icon_id；
 * 3. 写入全部走统一 DB 适配器，异常只记日志不影响主流程。
 */

const iconIds = new Map(); // md5 -> icon_store.id
let setCounter = 0;
let ready = false;

function cfg() {
    return configService.get('config').caching || {};
}

function defaultTtl() {
    return Number(cfg().ttl_seconds) || 60;
}

async function iconIdOf(dataUri) {
    const hash = crypto.createHash('md5').update(dataUri).digest('hex');
    if (iconIds.has(hash)) return iconIds.get(hash);

    const d = db.getDialect();
    await db.execute(
        `${d.insertIgnore} INTO icon_store (hash, data, created_at) VALUES (?, ?, ?)`,
        [hash, dataUri, Date.now()]
    );
    const rows = await db.query('SELECT id FROM icon_store WHERE hash = ?', [hash]);
    const id = rows[0]?.id ?? null;
    if (id !== null) iconIds.set(hash, id);
    return id;
}

async function init() {
    if (ready) return;
    const config = configService.get('config');
    await db.init(config.database || {});
    ready = true;
    Logger.debug('[CACHE]', '缓存服务已就绪');
}

/**
 * 写入缓存
 * @param {string} key
 * @param {any} value
 * @param {number} [ttlSeconds] 不传时优先用 value.expiresAt，再退回全局 ttl
 */
async function setCache(key, value, ttlSeconds) {
    if (!ready) return;
    if (!cfg().enable) return;

    const now = Date.now();
    let expiresAt;
    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
        expiresAt = now + ttlSeconds * 1000;
    } else if (value && typeof value === 'object' && Number.isFinite(value.expiresAt)) {
        expiresAt = value.expiresAt;
    } else {
        expiresAt = now + defaultTtl() * 1000;
    }

    let payload = value;
    let iconId = null;

    try {
        // 图标单独存，避免每次刷新都重写几十 KB 的 base64
        if (value && typeof value === 'object' && typeof value.icon === 'string' && value.icon.startsWith('data:image')) {
            iconId = await iconIdOf(value.icon);
            payload = { ...value, icon: null, _hasIcon: Boolean(iconId) };
        }

        const data = JSON.stringify(payload);
        await db.execute(
            'REPLACE INTO server_cache (id, data, icon_id, ts, expires_at) VALUES (?, ?, ?, ?, ?)',
            [String(key).slice(0, 191), data, iconId, now, expiresAt]
        );

        // 控制条目总量，避免无限增长
        if (++setCounter % 200 === 0) {
            await enforceMaxEntries();
        }
    } catch (e) {
        Logger.warn('[CACHE]', `写入缓存失败: ${e.message}`);
    }
}

async function enforceMaxEntries() {
    const max = Number(cfg().max_entries) || 5000;
    if (!max) return;
    try {
        const rows = await db.query('SELECT COUNT(*) AS c FROM server_cache');
        const count = Number(rows?.[0]?.c) || 0;
        if (count <= max) return;
        const overflow = count - max;
        // 先按过期时间淘汰最“老”的
        await db.execute(
            `DELETE FROM server_cache WHERE id IN (
                SELECT id FROM server_cache ORDER BY expires_at ASC LIMIT ?
            )`,
            [overflow]
        );
        Logger.debug('[CACHE]', `缓存条目超限，已淘汰 ${overflow} 条`);
    } catch (e) {
        Logger.debug('[CACHE]', `清理超限缓存失败: ${e.message}`);
    }
}

async function getCache(key, ttlSeconds) {
    if (!ready) return null;
    try {
        const rows = await db.query(
            'SELECT id, data, ts, expires_at, icon_id FROM server_cache WHERE id = ?',
            [String(key).slice(0, 191)]
        );
        if (!rows.length) return null;

        const row = rows[0];
        const ttl = Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : defaultTtl();
        const expiresAt = Number(row.expires_at) || (Number(row.ts) + ttl * 1000);

        if (Date.now() > expiresAt) {
            db.execute('DELETE FROM server_cache WHERE id = ?', [row.id ?? key]).catch(() => {});
            return null;
        }

        const value = JSON.parse(row.data);
        if (row.icon_id && value && value._hasIcon) {
            const icons = await db.query('SELECT data FROM icon_store WHERE id = ?', [row.icon_id]);
            if (icons.length) value.icon = icons[0].data;
            else value.icon = null;
        }
        return value;
    } catch (e) {
        Logger.warn('[CACHE]', `读取缓存失败: ${e.message}`);
        return null;
    }
}

async function stats() {
    const [row] = await db.query('SELECT COUNT(*) AS c FROM server_cache');
    const [expired] = await db.query('SELECT COUNT(*) AS c FROM server_cache WHERE expires_at < ?', [Date.now()]);
    const [icons] = await db.query('SELECT COUNT(*) AS c FROM icon_store');
    return {
        entries: Number(row?.c) || 0,
        expired: Number(expired?.c) || 0,
        icons: Number(icons?.c) || 0,
    };
}

async function clearExpired() {
    const r = await db.execute('DELETE FROM server_cache WHERE expires_at < ?', [Date.now()]);
    return r.affectedRows;
}

async function clearAll() {
    const r = await db.execute('DELETE FROM server_cache');
    await db.execute('DELETE FROM icon_store');
    iconIds.clear();
    return r.affectedRows;
}

module.exports = {
    init,
    getCache,
    setCache,
    stats,
    clearExpired,
    clearAll,
    enforceMaxEntries,
};
