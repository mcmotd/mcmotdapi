const db = require('../db');
const configService = require('./configService');
const Logger = require('../utils/logger');

/**
 * 访问统计服务（重写版）
 *
 * 旧实现：每个请求 INSERT 一行，字段全是重复的长字符串（域名、IP、/api/status_img…），
 * 数据库随请求量线性膨胀，日志表一年能涨到几个 GB。
 *
 * 新实现：
 * 1. 内存缓冲 + 定时批量落盘（一个事务搞定一批），把写放大压到最低；
 * 2. 维度表归一化（servers / referrers / clients / endpoints），日志里只留 ID；
 * 3. 聚合表 stat_hourly / stat_daily 记录计数，长期趋势不再依赖原始日志；
 * 4. 原始日志只是“短期样本”，按 retention_days 自动清理，可采样、可跳过缓存命中；
 * 5. 定时清理 + 空间回收（incremental_vacuum / OPTIMIZE TABLE），文件不会越跑越大。
 */

const HOUR_MS = 3600 * 1000;
const MAX_BUFFER = 20000;

// 维度缓存：Map<字符串, id>
const dims = {
    servers: new Map(), // `${host}|${port}` -> id
    referrers: new Map(),
    clients: new Map(),
    endpoints: new Map(),
};

// 待落盘事件
let events = [];
let flushTimer = null;
let cleanupTimer = null;
let flushInFlight = null;
let ready = false;
let sampleCounter = 0;
let lastCompactAt = 0;

function cfg() {
    return configService.get('config').analytics || {};
}

function rawCfg() {
    return cfg().raw_log || {};
}

function dayKeyOf(ts) {
    const d = new Date(ts);
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function dayKeyToDate(key) {
    const s = String(key);
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// ---------------------------------------------------------------- 维度表

async function dimId(map, table, column, value) {
    const key = String(value);
    const cached = map.get(key);
    if (cached !== undefined) return cached;

    const d = db.getDialect();
    await db.execute(`${d.insertIgnore} INTO ${table} (${column}) VALUES (?)`, [key]);
    const rows = await db.query(`SELECT id FROM ${table} WHERE ${column} = ?`, [key]);
    const id = rows[0]?.id ?? null;
    if (id !== null) map.set(key, id);
    return id;
}

async function endpointId(path) {
    return dimId(dims.endpoints, 'endpoints', 'path', String(path || '/').slice(0, 64));
}

async function referrerId(host) {
    return dimId(dims.referrers, 'referrers', 'host', String(host).slice(0, 255).toLowerCase());
}

async function clientId(ip) {
    return dimId(dims.clients, 'clients', 'ip', String(ip).slice(0, 64));
}

async function serverId(host, port, kind, ts) {
    // 端口统一用 0 表示“未指定/默认端口”：
    // SQLite/MySQL 的 UNIQUE 索引都不会把多个 NULL 视为冲突，
    // 存 NULL 会让同一个服务器反复插入重复行，聚合也会被拆散。
    const p = (port === null || port === undefined || port === '') ? 0 : Number(port) || 0;
    const key = `${host}|${p}`;
    const known = dims.servers.get(key);
    if (known !== undefined) {
        touchServer(known, kind, ts);
        return known;
    }

    const d = db.getDialect();
    await db.execute(
        `${d.insertIgnore} INTO servers (host, port, kind, first_seen, last_seen, query_count) VALUES (?, ?, ?, ?, ?, 0)`,
        [String(host).slice(0, 255), p, kind || null, ts, ts]
    );
    const rows = await db.query('SELECT id FROM servers WHERE host = ? AND port = ?', [String(host), p]);
    const id = rows[0]?.id ?? null;
    if (id !== null) {
        dims.servers.set(key, id);
        touchServer(id, kind, ts);
    }
    return id;
}

// 每个 flush 周期合并一次 UPDATE，避免每请求一次更新
const serverTouches = new Map(); // id -> { last_seen, kind }

function touchServer(id, kind, ts) {
    const cur = serverTouches.get(id);
    if (cur) {
        if (ts > cur.last_seen) cur.last_seen = ts;
        if (kind) cur.kind = kind;
    } else {
        serverTouches.set(id, { last_seen: ts, kind: kind || null });
    }
}

async function loadDims() {
    const [servers, referrers, clients, endpoints] = await Promise.all([
        db.query('SELECT id, host, port FROM servers'),
        db.query('SELECT id, host FROM referrers'),
        db.query('SELECT id, ip FROM clients'),
        db.query('SELECT id, path FROM endpoints'),
    ]);
    for (const r of servers) dims.servers.set(`${r.host}|${r.port}`, r.id);
    for (const r of referrers) dims.referrers.set(String(r.host), r.id);
    for (const r of clients) dims.clients.set(String(r.ip), r.id);
    for (const r of endpoints) dims.endpoints.set(String(r.path), r.id);
    Logger.debug('[ANALYTICS]', `维度缓存: ${dims.servers.size} 服务器 / ${dims.clients.size} 客户端 / ${dims.referrers.size} 来源`);
}

// ---------------------------------------------------------------- 旧数据导入

async function importLegacy() {
    const tables = await db.getAdapter().listTables();
    if (!tables.includes('query_logs_legacy')) return 0;

    Logger.info('[ANALYTICS]', '发现旧版日志表，开始导入…');
    let imported = 0;
    const pageSize = 500;
    let offset = 0;

    while (true) {
        const rows = await db.query(
            `SELECT * FROM query_logs_legacy ORDER BY id ASC LIMIT ? OFFSET ?`,
            [pageSize, offset]
        );
        if (!rows.length) break;

        for (const row of rows) {
            // 旧表 timestamp 是 UTC 字符串（sqlite CURRENT_TIMESTAMP）
            const rawTs = String(row.timestamp || '').replace(' ', 'T');
            const ts = Date.parse(rawTs.endsWith('Z') ? rawTs : `${rawTs}Z`) || Date.now();
            const host = String(row.ip_address || '').toLowerCase();
            if (!host) continue;

            const sid = await serverId(host, row.port || null, row.server_type || null, ts);
            const eid = await endpointId(row.endpoint);
            const ok = Number(row.was_successful) ? 1 : 0;
            const cached = Number(row.from_cache) ? 1 : 0;
            const cid = row.client_ip ? await clientId(row.client_ip) : null;
            const rid = row.referrer ? await referrerId(row.referrer) : null;

            events.push({
                ts, sid, eid, cid, rid, ok, cached,
                delayMs: null,
                error: null,
                raw: true,
                kind: row.server_type || null,
            });
            imported++;
        }

        offset += pageSize;
        if (events.length >= 2000) await flush({ reason: 'legacy-import' });
    }

    await flush({ reason: 'legacy-import' });
    await db.execute('DROP TABLE query_logs_legacy');
    Logger.info('[ANALYTICS]', `旧日志导入完成，共 ${imported} 条`);
    return imported;
}

// ---------------------------------------------------------------- 写入

/**
 * 记录一次查询（同步、非阻塞）
 * @param {object} data {endpoint, ip, port, clientIp, success, serverType, referrer, from_cache, delayMs, error}
 */
function logQuery(data) {
    if (!ready) return;
    const conf = cfg();
    if (!conf.enable) return;

    const endpoint = String(data.endpoint || '/');
    const excluded = Array.isArray(conf.exclude_endpoints) ? conf.exclude_endpoints : [];
    if (excluded.includes(endpoint)) return;

    if (events.length >= MAX_BUFFER) {
        // 极端情况下丢最旧的，保证内存不无限增长
        events.splice(0, events.length - MAX_BUFFER + 1);
    }

    const ts = Date.now();
    events.push({
        ts,
        host: String(data.ip || '').toLowerCase(),
        port: data.port ?? null,
        kind: data.serverType || null,
        endpoint,
        clientIp: data.clientIp || null,
        referrer: data.referrer || null,
        ok: data.success ? 1 : 0,
        cached: data.from_cache ? 1 : 0,
        delayMs: Number.isFinite(data.delayMs) ? Math.round(data.delayMs) : null,
        error: data.error ? String(data.error).slice(0, 160) : null,
    });
}

/** 把事件里的维度解析成 ID，并按聚合键合并 */
async function prepareBatch(batch) {
    const conf = cfg();
    const rconf = rawCfg();
    const rawEnabled = rconf.enable !== false;
    const skipCacheHits = rconf.skip_cache_hits !== false;
    const sampleRate = Math.max(1, Number(rconf.sample_rate) || 1);

    const aggregated = new Map(); // key -> {bucket_ts, sid, eid, ok, cached, hits, delay_sum}
    const daily = new Map();
    const logs = [];

    for (const ev of batch) {
        const sid = ev.sid !== undefined
            ? ev.sid
            : await serverId(ev.host, ev.port, ev.kind, ev.ts);
        const eid = ev.eid !== undefined ? ev.eid : await endpointId(ev.endpoint);
        const cid = ev.cid !== undefined ? ev.cid : (ev.clientIp ? await clientId(ev.clientIp) : null);
        const rid = ev.rid !== undefined ? ev.rid : (ev.referrer ? await referrerId(ev.referrer) : null);

        if (sid === null || eid === null) continue;

        const bucket = Math.floor(ev.ts / HOUR_MS) * HOUR_MS;
        const dayKey = dayKeyOf(ev.ts);

        const aggKey = `${bucket}|${sid}|${eid}|${ev.ok}|${ev.cached}`;
        const agg = aggregated.get(aggKey);
        if (agg) {
            agg.hits += 1;
            agg.delay_sum += ev.delayMs || 0;
        } else {
            aggregated.set(aggKey, {
                bucket_ts: bucket, sid, eid, ok: ev.ok, cached: ev.cached,
                hits: 1, delay_sum: ev.delayMs || 0,
            });
        }

        const dayAggKey = `${dayKey}|${sid}|${eid}|${ev.ok}|${ev.cached}`;
        const dayAgg = daily.get(dayAggKey);
        if (dayAgg) {
            dayAgg.hits += 1;
            dayAgg.delay_sum += ev.delayMs || 0;
        } else {
            daily.set(dayAggKey, {
                day_key: dayKey, sid, eid, ok: ev.ok, cached: ev.cached,
                hits: 1, delay_sum: ev.delayMs || 0,
            });
        }

        if (!rawEnabled || ev.raw === false) continue;
        if (skipCacheHits && ev.cached) continue;
        if (sampleRate > 1) {
            sampleCounter = (sampleCounter + 1) % sampleRate;
            if (sampleCounter !== 0) continue;
        }

        logs.push({
            ts: ev.ts, endpoint_id: eid, server_id: sid, client_id: cid, referrer_id: rid,
            is_ok: ev.ok, from_cache: ev.cached, delay_ms: ev.delayMs, error: ev.error,
        });
    }

    return { aggregated: [...aggregated.values()], daily: [...daily.values()], logs };
}

async function flush({ reason = 'timer' } = {}) {
    if (!ready || !events.length) return { written: 0 };
    if (flushInFlight) return flushInFlight;

    flushInFlight = (async () => {
        const batch = events;
        events = [];
        const started = Date.now();

        try {
            const { aggregated, daily, logs } = await prepareBatch(batch);
            const d = db.getDialect();

            await db.transaction(async (tx) => {
                for (const a of aggregated) {
                    await tx.execute(
                        d.upsertAdd({
                            table: 'stat_hourly',
                            columns: ['bucket_ts', 'server_id', 'endpoint_id', 'is_ok', 'from_cache', 'hits', 'delay_sum'],
                            conflict: ['bucket_ts', 'server_id', 'endpoint_id', 'is_ok', 'from_cache'],
                            addCols: ['hits', 'delay_sum'],
                        }),
                        [a.bucket_ts, a.sid, a.eid, a.ok, a.cached, a.hits, a.delay_sum]
                    );
                }

                for (const a of daily) {
                    await tx.execute(
                        d.upsertAdd({
                            table: 'stat_daily',
                            columns: ['day_key', 'server_id', 'endpoint_id', 'is_ok', 'from_cache', 'hits', 'delay_sum'],
                            conflict: ['day_key', 'server_id', 'endpoint_id', 'is_ok', 'from_cache'],
                            addCols: ['hits', 'delay_sum'],
                        }),
                        [a.day_key, a.sid, a.eid, a.ok, a.cached, a.hits, a.delay_sum]
                    );
                }

                // 原始日志：多行一次插入
                const CHUNK = 200;
                for (let i = 0; i < logs.length; i += CHUNK) {
                    const chunk = logs.slice(i, i + CHUNK);
                    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
                    const params = [];
                    for (const l of chunk) {
                        params.push(l.ts, l.endpoint_id, l.server_id, l.client_id, l.referrer_id, l.is_ok, l.from_cache, l.delay_ms, l.error);
                    }
                    await tx.execute(
                        `INSERT INTO query_logs (ts, endpoint_id, server_id, client_id, referrer_id, is_ok, from_cache, delay_ms, error) VALUES ${placeholders}`,
                        params
                    );
                }

                for (const [id, t] of serverTouches) {
                    await tx.execute(
                        'UPDATE servers SET last_seen = ?, kind = COALESCE(?, kind), query_count = query_count + ? WHERE id = ?',
                        [t.last_seen, t.kind, 1, id]
                    );
                }
            });

            serverTouches.clear();

            Logger.debug('[ANALYTICS]', `落盘 ${batch.length} 个事件（聚合 ${aggregated.length} 行 / 日志 ${logs.length} 行, ${Date.now() - started}ms, ${reason}）`);
            return { written: batch.length, logs: logs.length };
        } catch (err) {
            Logger.error('[ANALYTICS]', `写入统计失败: ${err.message}`);
            // 放回缓冲区，下一轮重试（有上限，避免内存爆掉）
            if (events.length + batch.length > MAX_BUFFER) {
                events = batch.slice(-Math.floor(MAX_BUFFER / 2)).concat(events);
            } else {
                events = batch.concat(events);
            }
            return { written: 0, error: err.message };
        } finally {
            flushInFlight = null;
        }
    })();

    return flushInFlight;
}

// ---------------------------------------------------------------- 清理

async function cleanup({ compact = false } = {}) {
    if (!db.isReady()) return null;
    const conf = cfg();
    const rconf = rawCfg();
    const retention = conf.retention || {};
    const rawDays = Number(rconf.retention_days);
    const hourlyDays = Number(retention.hourly_days);
    const dailyDays = Number(retention.daily_days);
    const now = Date.now();
    const result = {};

    try {
        if (Number.isFinite(rawDays) && rawDays > 0) {
            const before = now - rawDays * 24 * HOUR_MS;
            const r = await db.execute('DELETE FROM query_logs WHERE ts < ?', [before]);
            result.query_logs = r.affectedRows;
        }

        if (Number.isFinite(hourlyDays) && hourlyDays > 0) {
            const before = now - hourlyDays * 24 * HOUR_MS;
            const r = await db.execute('DELETE FROM stat_hourly WHERE bucket_ts < ?', [before]);
            result.stat_hourly = r.affectedRows;
        }

        if (Number.isFinite(dailyDays) && dailyDays > 0) {
            const d = new Date(now - dailyDays * 24 * HOUR_MS);
            const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
            const r = await db.execute('DELETE FROM stat_daily WHERE day_key < ?', [key]);
            result.stat_daily = r.affectedRows;
        }

        // 过期缓存
        const c = await db.execute('DELETE FROM server_cache WHERE expires_at < ?', [now]);
        result.server_cache = c.affectedRows;

        // 孤立维度：没有任何日志/聚合引用的记录可以安全删除（保留服务器维度做历史）
        const orphanReferrers = await db.execute(
            'DELETE FROM referrers WHERE id NOT IN (SELECT DISTINCT referrer_id FROM query_logs WHERE referrer_id IS NOT NULL)'
        );
        result.referrers = orphanReferrers.affectedRows;
        const orphanClients = await db.execute(
            'DELETE FROM clients WHERE id NOT IN (SELECT DISTINCT client_id FROM query_logs WHERE client_id IS NOT NULL)'
        );
        result.clients = orphanClients.affectedRows;
        const orphanIcons = await db.execute(
            `DELETE FROM icon_store WHERE id NOT IN (SELECT DISTINCT icon_id FROM server_cache WHERE icon_id IS NOT NULL)`
        );
        result.icon_store = orphanIcons.affectedRows;

        if (compact && now - lastCompactAt > 6 * HOUR_MS) {
            lastCompactAt = now;
            await db.getAdapter().compact();
            result.compacted = true;
        } else if (db.driver() === 'sqlite') {
            // 即使不压缩，也要定期 truncate WAL，否则 -wal 文件会一直变大
            await db.getAdapter().checkpoint();
            result.checkpointed = true;
        }

        if (Object.values(result).some(v => typeof v === 'number' && v > 0)) {
            Logger.info('[ANALYTICS]', `清理完成: ${JSON.stringify(result)}`);
        }
        return result;
    } catch (err) {
        Logger.warn('[ANALYTICS]', `清理失败: ${err.message}`);
        return { error: err.message };
    }
}

// ---------------------------------------------------------------- 初始化

async function init() {
    if (ready) return;
    const config = configService.get('config');
    await db.init(config.database || {});
    await loadDims();

    // 导入阶段也要能触发 flush，所以先置位
    ready = true;
    await importLegacy();

    const interval = Number(cfg().flush_interval_ms) || 5000;
    flushTimer = setInterval(() => { flush({ reason: 'timer' }).catch(() => {}); }, interval);
    flushTimer.unref?.();

    cleanupTimer = setInterval(() => {
        cleanup({ compact: true }).catch(() => {});
    }, HOUR_MS);
    cleanupTimer.unref?.();
    setTimeout(() => { cleanup().catch(() => {}); }, 15000).unref?.();

    // 配置热更新后，flush 间隔也跟随变化
    configService.onChange((target) => {
        if (target !== 'config') return;
        const next = Number(cfg().flush_interval_ms) || 5000;
        if (flushTimer) clearInterval(flushTimer);
        flushTimer = setInterval(() => { flush({ reason: 'timer' }).catch(() => {}); }, next);
        flushTimer.unref?.();
    });

    Logger.info('[ANALYTICS]', `统计服务已启动（driver=${db.driver()}）`);
}

async function shutdown() {
    if (flushTimer) clearInterval(flushTimer);
    if (cleanupTimer) clearInterval(cleanupTimer);
    await flush({ reason: 'shutdown' });
}

// ---------------------------------------------------------------- 查询

function asNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

async function getStats() {
    if (!db.isReady()) throw new Error('数据库尚未初始化');
    const now = Date.now();
    const since24h = now - 24 * HOUR_MS;
    const since7d = now - 7 * 24 * HOUR_MS;

    const [totalRow] = await db.query('SELECT COALESCE(SUM(hits), 0) AS c FROM stat_daily');
    const [okRow] = await db.query('SELECT COALESCE(SUM(hits), 0) AS c FROM stat_daily WHERE is_ok = 1');
    const [cacheRow] = await db.query('SELECT COALESCE(SUM(hits), 0) AS c FROM stat_daily WHERE from_cache = 1');
    const [last24Row] = await db.query('SELECT COALESCE(SUM(hits), 0) AS c FROM stat_hourly WHERE bucket_ts >= ?', [since24h]);
    const [last24OkRow] = await db.query('SELECT COALESCE(SUM(hits), 0) AS c FROM stat_hourly WHERE bucket_ts >= ? AND is_ok = 1', [since24h]);
    const [delayRow] = await db.query(
        'SELECT COALESCE(SUM(delay_sum), 0) AS s, COALESCE(SUM(hits), 0) AS h FROM stat_daily'
    );

    const topServers = await db.query(
        `SELECT s.id, s.host, s.port, s.kind, COALESCE(SUM(d.hits), 0) AS count
         FROM stat_daily d JOIN servers s ON s.id = d.server_id
         GROUP BY s.id, s.host, s.port, s.kind
         ORDER BY count DESC LIMIT 10`
    );

    const topEndpoints = await db.query(
        `SELECT e.path, COALESCE(SUM(d.hits), 0) AS count
         FROM stat_daily d JOIN endpoints e ON e.id = d.endpoint_id
         GROUP BY e.path ORDER BY count DESC LIMIT 10`
    );

    const topReferrers = await db.query(
        `SELECT r.host AS referrer, COUNT(*) AS count
         FROM query_logs l JOIN referrers r ON r.id = l.referrer_id
         GROUP BY r.host ORDER BY count DESC LIMIT 10`
    );

    const recentRows = await db.query(
        `SELECT l.id, l.ts, s.host, s.port, s.kind, c.ip AS client_ip, e.path AS endpoint,
                l.is_ok, l.from_cache, l.delay_ms, l.error, r.host AS referrer
         FROM query_logs l
         LEFT JOIN servers s ON s.id = l.server_id
         LEFT JOIN clients c ON c.id = l.client_id
         LEFT JOIN endpoints e ON e.id = l.endpoint_id
         LEFT JOIN referrers r ON r.id = l.referrer_id
         ORDER BY l.ts DESC LIMIT 20`
    );

    const dailyRows = await db.query(
        `SELECT day_key, COALESCE(SUM(hits), 0) AS count
         FROM stat_daily WHERE day_key >= ? GROUP BY day_key ORDER BY day_key ASC`,
        [dayKeyOf(since7d)]
    );

    const hourlyRows = await db.query(
        `SELECT bucket_ts, COALESCE(SUM(hits), 0) AS count
         FROM stat_hourly WHERE bucket_ts >= ? GROUP BY bucket_ts ORDER BY bucket_ts ASC`,
        [now - 23 * HOUR_MS]
    );

    const [uniqueClientsRow] = await db.query(
        'SELECT COUNT(DISTINCT client_id) AS c FROM query_logs WHERE client_id IS NOT NULL'
    );
    const [rawCountRow] = await db.query('SELECT COUNT(*) AS c FROM query_logs');

    const total = asNumber(totalRow?.c);
    const okCount = asNumber(okRow?.c);
    const last24 = asNumber(last24Row?.c);
    const last24Ok = asNumber(last24OkRow?.c);
    const delaySum = asNumber(delayRow?.s);
    const delayHits = asNumber(delayRow?.h);

    return {
        // ---- 兼容旧前端的字段 ----
        totalQueries: total,
        successfulQueries: okCount,
        successRate: total > 0 ? ((okCount / total) * 100).toFixed(1) : '0.0',
        queriesLast24h: last24,
        topServers: topServers.map(r => ({
            ip_address: r.host,
            port: asNumber(r.port) || null,
            host: r.host,
            kind: r.kind,
            count: asNumber(r.count),
        })),
        topReferrers: topReferrers.map(r => ({ referrer: r.referrer, count: asNumber(r.count) })),
        recentQueries: recentRows.map(r => ({
            id: r.id,
            timestamp: new Date(asNumber(r.ts)).toISOString(),
            ip_address: r.host || '未知',
            port: asNumber(r.port) || null,
            client_ip: r.client_ip || null,
            was_successful: asNumber(r.is_ok),
            server_type: r.kind || null,
            referrer: r.referrer || null,
            from_cache: asNumber(r.from_cache),
            endpoint: r.endpoint || '',
            delay_ms: r.delay_ms,
            error: r.error || null,
        })),
        dailyCounts: dailyRows.map(r => ({ date: dayKeyToDate(r.day_key), count: asNumber(r.count) })),

        // ---- 新增指标 ----
        hourlyCounts: hourlyRows.map(r => ({ ts: asNumber(r.bucket_ts), count: asNumber(r.count) })),
        queriesLast24hOk: last24Ok,
        successRate24h: last24 > 0 ? ((last24Ok / last24) * 100).toFixed(1) : '0.0',
        cacheHitRate: total > 0 ? ((asNumber(cacheRow?.c) / total) * 100).toFixed(1) : '0.0',
        avgDelayMs: delayHits > 0 ? Math.round(delaySum / delayHits) : 0,
        uniqueClients: asNumber(uniqueClientsRow?.c),
        rawLogCount: asNumber(rawCountRow?.c),
        topEndpoints: topEndpoints.map(r => ({ path: r.path, count: asNumber(r.count) })),
        retention: {
            raw_log_days: Number(rawCfg().retention_days) || 0,
            hourly_days: Number(cfg().retention?.hourly_days) || 0,
            daily_days: Number(cfg().retention?.daily_days) || 0,
        },
        generatedAt: new Date().toISOString(),
    };
}

/** 管理端：分页查询原始日志 */
async function getLogs({ limit = 50, offset = 0, host, ok, endpoint } = {}) {
    const d = db.getDialect();
    const where = [];
    const params = [];
    if (host) {
        where.push('s.host = ?');
        params.push(String(host).toLowerCase());
    }
    if (ok === 0 || ok === 1 || ok === '0' || ok === '1') {
        where.push('l.is_ok = ?');
        params.push(Number(ok));
    }
    if (endpoint) {
        where.push('e.path = ?');
        params.push(String(endpoint));
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 500);
    const off = Math.max(Number(offset) || 0, 0);

    const rows = await db.query(
        `SELECT l.id, l.ts, s.host, s.port, s.kind, c.ip AS client_ip, e.path AS endpoint,
                l.is_ok, l.from_cache, l.delay_ms, l.error, r.host AS referrer
         FROM query_logs l
         LEFT JOIN servers s ON s.id = l.server_id
         LEFT JOIN clients c ON c.id = l.client_id
         LEFT JOIN endpoints e ON e.id = l.endpoint_id
         LEFT JOIN referrers r ON r.id = l.referrer_id
         ${whereSql}
         ORDER BY l.ts DESC ${d.limitOffset(lim, off)}`,
        params
    );

    const [totalRow] = await db.query(
        `SELECT COUNT(*) AS c FROM query_logs l
         LEFT JOIN servers s ON s.id = l.server_id
         LEFT JOIN endpoints e ON e.id = l.endpoint_id
         ${whereSql}`,
        params
    );

    return {
        total: asNumber(totalRow?.c),
        limit: lim,
        offset: off,
        items: rows.map(r => ({
            id: r.id,
            timestamp: new Date(asNumber(r.ts)).toISOString(),
            host: r.host || '未知',
            port: asNumber(r.port) || null,
            kind: r.kind,
            client_ip: r.client_ip || null,
            endpoint: r.endpoint || '',
            ok: asNumber(r.is_ok),
            from_cache: asNumber(r.from_cache),
            delay_ms: r.delay_ms,
            error: r.error || null,
            referrer: r.referrer || null,
        })),
    };
}

/** 管理端：清空原始日志（聚合数据保留） */
async function clearRawLogs() {
    const r = await db.execute('DELETE FROM query_logs');
    await db.execute('DELETE FROM referrers');
    await db.execute('DELETE FROM clients');
    dims.referrers.clear();
    dims.clients.clear();
    return r.affectedRows;
}

/** 管理端：清空全部统计数据（含聚合） */
async function resetAll() {
    await db.execute('DELETE FROM query_logs');
    await db.execute('DELETE FROM stat_hourly');
    await db.execute('DELETE FROM stat_daily');
    await db.execute('DELETE FROM referrers');
    await db.execute('DELETE FROM clients');
    await db.execute('UPDATE servers SET query_count = 0');
    dims.referrers.clear();
    dims.clients.clear();
    return true;
}

function pendingCount() {
    return events.length;
}

module.exports = {
    init,
    shutdown,
    logQuery,
    flush,
    cleanup,
    getStats,
    getLogs,
    clearRawLogs,
    resetAll,
    pendingCount,
};
