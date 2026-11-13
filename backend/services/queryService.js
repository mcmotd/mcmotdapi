const net = require('net');
const dns = require('dns');
const configService = require('./configService');
const PingMCServer = require('../utils/java').fetch;
const pingBedrock = require('../utils/bedrock');
const Logger = require('../utils/logger');
const { getCache, setCache } = require('./cacheService');

/**
 * 服务器状态查询
 *
 * 所有可调参数都从 configService 实时读取，改配置不需要重启。
 */

const SRV_CACHE_VERSION = 'v3';
const SRV_PREFIX = '_minecraft._tcp.';
// 这些错误码表示“确定没有这个记录”，可以缓存为无结果；超时类错误不能
const DEFINITIVE_DNS_ERRORS = new Set(['ENOTFOUND', 'ENODATA', 'ENONAME']);

function conf() {
    return configService.get('config');
}

function num(key, fallback) {
    const v = Number(conf()[key]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
}

function defaultJavaPort() {
    return num('javaDefaultPort', 25565);
}

function defaultBedrockPort() {
    return num('bedrockDefaultPort', 19132);
}

function srvFallbackDns() {
    const list = conf().srvFallbackDns;
    return Array.isArray(list) && list.length ? list : ['223.5.5.5', '119.29.29.29'];
}

// 将 mcpe-ping 包装成 Promise
function pingBedrockPromise(ip, port, timeout) {
    return new Promise((resolve, reject) => {
        pingBedrock(ip, port,
            (err, res) => (err ? reject(err) : resolve(res)),
            timeout
        );
    });
}

/**
 * 一个通用的 MOTD 转换函数：把任何格式的 MOTD 转成纯文本并剥离 § 颜色码
 */
function motdToPlainText(motd) {
    if (!motd) return '';

    if (typeof motd === 'string') {
        return motd.replace(/§[0-9a-fk-or]/gi, '');
    }

    if (Array.isArray(motd)) {
        return motd.map(item => motdToPlainText(item)).join('').replace(/§[0-9a-fk-or]/gi, '');
    }

    if (typeof motd === 'object') {
        let plainText = '';

        function parseComponent(component) {
            if (component === null || component === undefined) return;
            if (typeof component === 'string') {
                plainText += component;
                return;
            }
            if (Array.isArray(component)) {
                component.forEach(parseComponent);
                return;
            }
            if (typeof component !== 'object') return;

            if (typeof component.text === 'string') {
                plainText += component.text;
            } else if (component.text !== undefined && component.text !== null) {
                plainText += String(component.text);
            }

            if (Array.isArray(component.extra)) {
                component.extra.forEach(parseComponent);
            }
        }

        parseComponent(motd);
        return plainText.replace(/§[0-9a-fk-or]/gi, '');
    }

    return '';
}

/**
 * 单次 SRV 查询（带硬超时），避免 c-ares 默认行为卡住几十秒
 */
function querySrvOnce(domain, servers, timeout) {
    return new Promise((resolve, reject) => {
        // 必须用回调版 dns.Resolver；dns.promises.Resolver 不接受回调，
        // 传回调会被忽略并产生未处理的 Promise 拒绝，直接把进程带崩。
        const resolver = new dns.Resolver({ timeout, tries: 1 });
        if (servers && servers.length) {
            try {
                resolver.setServers(servers);
            } catch (e) {
                // 无效的 DNS 配置，直接用系统默认
            }
        }

        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            const err = new Error('SRV 查询超时');
            err.code = 'ETIMEOUT';
            reject(err);
        }, timeout + 300);

        resolver.resolveSrv(SRV_PREFIX + domain, (err, records) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (err) return reject(err);
            resolve(Array.isArray(records) ? records : []);
        });
    });
}

/**
 * 解析 SRV 记录。
 * - 只缓存“确定的结果”（有记录 / 确定没有记录），超时不缓存，避免被一次抖动锁死
 * - 系统 DNS 与兜底 DNS 并行查询，谁先给出确定答案用谁
 * @returns {Promise<{host:string, port:number, priority:number}|null>}
 */
async function resolveSrvRecord(domain) {
    if (net.isIP(domain) !== 0 || !domain.includes('.')) return null;

    const caching = conf().caching || {};
    const ttl = Number(caching.srv_ttl_seconds) || 600;
    const negativeTtl = Number(caching.srv_negative_ttl_seconds) || 60;
    const cacheKey = `srv:${SRV_CACHE_VERSION}:${domain}`;

    try {
        const cached = await getCache(cacheKey, Math.max(ttl, negativeTtl));
        if (cached && typeof cached === 'object' && cached.expiresAt > Date.now()) {
            Logger.debug('[SRV]', `命中缓存: ${domain} -> ${cached.status}`);
            return cached.status === 'found' ? cached.data : null;
        }
    } catch (e) {
        Logger.debug('[SRV]', `读取缓存失败: ${e.message}`);
    }

    const timeout = num('srvTimeout', 1500);
    const resolvers = [null]; // null 表示使用系统 DNS
    for (const server of srvFallbackDns()) resolvers.push([server]);

    const outcome = await new Promise((resolve) => {
        let pending = resolvers.length;
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };

        for (const servers of resolvers) {
            querySrvOnce(domain, servers, timeout)
                .then(records => {
                    if (!records.length) return finish({ answer: 'none' });
                    // 按优先级排序，同优先级取权重高的
                    const sorted = records.slice().sort((a, b) => (a.priority - b.priority) || (b.weight - a.weight));
                    const best = sorted[0];
                    finish({
                        answer: 'found',
                        record: {
                            host: String(best.name || '').replace(/\.$/, ''),
                            port: Number(best.port),
                            priority: best.priority
                        }
                    });
                })
                .catch(err => {
                    if (DEFINITIVE_DNS_ERRORS.has(err.code)) {
                        // 系统 DNS 说没有，兜底 DNS 也许有；先等另一个结果
                        if (servers !== null) finish({ answer: 'none' });
                        else if (--pending === 0) finish({ answer: 'none' });
                        return;
                    }
                    if (--pending === 0) finish({ answer: 'error', error: err });
                });
        }
    });

    if (outcome.answer === 'found') {
        setCache(cacheKey, { status: 'found', data: outcome.record, expiresAt: Date.now() + ttl * 1000 });
        Logger.info('[SRV]', `${domain} -> ${outcome.record.host}:${outcome.record.port}`);
        return outcome.record;
    }

    if (outcome.answer === 'none') {
        setCache(cacheKey, { status: 'not_found', expiresAt: Date.now() + negativeTtl * 1000 });
        Logger.debug('[SRV]', `${domain} 无 SRV 记录`);
        return null;
    }

    Logger.warn('[SRV]', `解析失败(不缓存): ${domain}, ${outcome.error?.code || outcome.error?.message || '未知错误'}`);
    return null;
}

/**
 * 把外部传入的 serverType 归一化。
 * 前端下拉框里的 "srv" 只是“启用 SRV 解析”的意思，本质上仍然是查 Java。
 */
function normalizeServerType(serverType, isSRV) {
    const type = String(serverType || 'auto').trim().toLowerCase();
    if (type === 'srv') return 'je';
    if (type === 'je' || type === 'be' || type === 'auto') return type;
    return isSRV ? 'je' : 'auto';
}

/**
 * auto 模式下的“Java 优先”竞速：
 * Java 成功即返回；基岩版成功时再多等 graceMs，给慢一点的 Java 一个机会。
 * 两边都失败才整体失败。
 */
function preferJava(javaP, bedrockP, graceMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        let javaErr = null;
        let bedrockErr = null;
        let bedrockValue = null;
        let graceTimer = null;

        const done = (value) => {
            if (settled) return;
            settled = true;
            if (graceTimer) clearTimeout(graceTimer);
            resolve(value);
        };

        const maybeFail = () => {
            if (settled) return;
            if (javaErr && bedrockErr) {
                settled = true;
                const agg = new Error('所有查询方式都失败');
                agg.errors = [javaErr, bedrockErr];
                reject(agg);
            }
        };

        javaP.then(done).catch(err => {
            javaErr = err;
            // Java 已经失败，就不必再等宽限期了
            if (bedrockValue) return done(bedrockValue);
            maybeFail();
        });

        bedrockP.then(value => {
            bedrockValue = value;
            if (settled) return;
            if (graceMs <= 0 || javaErr) return done(value);
            graceTimer = setTimeout(() => done(bedrockValue), graceMs);
        }).catch(err => {
            bedrockErr = err;
            maybeFail();
        });
    });
}

/** 依次尝试多个 Java 目标（SRV 目标 -> 原始地址），只有全部失败才算失败 */function pingJavaWithFallback(targets, timeout) {
    return new Promise((resolve, reject) => {
        let index = 0;
        let lastError = null;

        const next = () => {
            if (index >= targets.length) {
                return reject(lastError || new Error('没有可用的 Java 查询目标'));
            }
            const target = targets[index++];
            PingMCServer(target.host, target.port, {
                connectTimeout: timeout,
                readTimeout: timeout,
                handshakeHost: target.handshakeHost
            })
                .then(data => resolve({ data, target }))
                .catch(err => {
                    lastError = err;
                    Logger.debug('[JAVA]', `目标失败 ${target.host}:${target.port} -> ${err.message}`);
                    next();
                });
        };

        next();
    });
}

function formatJavaResult({ data, target }, displayHost, iconUrl) {
    const players = (data && typeof data.players === 'object' && data.players) ? data.players : {};
    const version = data ? data.version : undefined;
    const sampleList = Array.isArray(players.sample) ? players.sample : [];
    const playersSample = sampleList
        .map(p => (p && (p.name || p.id)))
        .filter(Boolean)
        .join(', ') || '无';
    // 版本号里常带 § 颜色代码（例如 "§c开启1.9战斗时代"），展示前清掉
    const versionName = (version && version.name) || (typeof version === 'string' ? version : '未知');

    return {
        type: 'Java',
        status: 'online',
        host: displayHost,
        resolved: `${target.host}:${target.port}`,
        via_srv: Boolean(target.viaSrv),
        motd: data ? data.description : '',
        pureMotd: motdToPlainText(data ? data.description : '').trim(),
        version: String(versionName).replace(/§[0-9a-fk-or]/gi, '').trim(),
        protocol: (version && version.protocol !== undefined) ? version.protocol : null,
        players: {
            online: Number(players.online) || 0,
            max: Number(players.max) || 0,
            sample: playersSample
        },
        mod_info: data ? data.modinfo : undefined,
        icon: (data && data.favicon) ? data.favicon : iconUrl,
        delay: Date.now() - target.startedAt,
    };
}

function formatBedrockResult({ data, target }, displayHost, iconUrl) {
    const advertise = String((data && data.advertise) || '').split(';');
    return {
        type: 'Bedrock',
        status: 'online',
        host: displayHost,
        resolved: `${target.host}:${target.port}`,
        via_srv: false,
        motd: data ? data.name : '',
        pureMotd: data ? data.cleanName : '',
        version: data ? data.version : '',
        players: {
            online: Number(data && data.currentPlayers) || 0,
            max: Number(data && data.maxPlayers) || 0
        },
        gamemode: advertise[8] || null,
        delay: Date.now() - target.startedAt,
        protocol: advertise[2] || null,
        levelname: advertise[7] || null,
        icon: iconUrl,
    };
}

async function performLiveQuery(ip, port, iconUrl, serverType = 'auto', isSRV = false) {
    const now = Date.now();
    const queryTimeout = num('queryTimeout', 5000);
    const bedrockTimeout = num('bedrockTimeout', 2500);

    const explicitPort = (port !== undefined && port !== null && String(port).trim() !== '')
        ? parseInt(port, 10)
        : null;

    let type = normalizeServerType(serverType, isSRV);
    if (isSRV) type = 'je'; // 强制 SRV 查询时只查 Java

    // --- 步骤 1: SRV 解析 ---
    // 与原版客户端一致：没指定端口、或指定的就是默认端口时才查 SRV（显式 srv=true 则总是查）
    const wantSrv = type !== 'be' && (isSRV || explicitPort === null || explicitPort === defaultJavaPort());
    const srv = wantSrv ? await resolveSrvRecord(ip) : null;

    // --- 步骤 2: 组装查询目标 ---
    const javaTargets = [];
    if (srv && srv.host) {
        javaTargets.push({
            host: srv.host,
            port: srv.port || defaultJavaPort(),
            handshakeHost: ip, // 握手仍用玩家输入的域名
            viaSrv: true,
            startedAt: now
        });
    }

    const directTarget = {
        host: ip,
        port: explicitPort || defaultJavaPort(),
        handshakeHost: ip,
        viaSrv: false,
        startedAt: now
    };
    // SRV 目标与直连目标相同就不重复查了
    if (!srv || !srv.host || srv.host !== directTarget.host || (srv.port || defaultJavaPort()) !== directTarget.port) {
        javaTargets.push(directTarget);
    }

    const bedrockTarget = {
        host: ip,
        port: explicitPort || defaultBedrockPort(),
        startedAt: now
    };

    // 展示给用户的地址应该是他能直接填进游戏里的那个
    // Java：优先原样回显用户的输入；基岩版：必须带端口（前端拼 minecraft:// 链接要用）
    const javaDisplayHost = explicitPort ? `${ip}:${explicitPort}` : ip;
    const bedrockDisplayHost = `${ip}:${bedrockTarget.port}`;

    // --- 步骤 3: 并发查询 ---
    const javaTask = () => pingJavaWithFallback(javaTargets, queryTimeout)
        .then(res => formatJavaResult(res, javaDisplayHost, iconUrl));

    const bedrockTask = () => pingBedrockPromise(bedrockTarget.host, bedrockTarget.port, bedrockTimeout)
        .then(data => formatBedrockResult({ data, target: bedrockTarget }, bedrockDisplayHost, iconUrl));

    if (type === 'je') {
        return javaTask();
    }
    if (type === 'be') {
        return bedrockTask();
    }

    // auto：同一域名可能同时存在 Java 与基岩版。
    // 基岩版是 UDP，几乎总是比 Java（两次 TCP 往返）先回包，
    // 直接 Promise.any 会把 Java 服判成 Bedrock。这里改成“Java 优先”：
    // - Java 一旦成功立刻返回
    // - 基岩版先成功时，再多等 autoJavaGraceMs 给 Java 一个机会
    const graceMs = Math.max(0, Number(conf().autoJavaGraceMs) || 0);
    try {
        return await preferJava(javaTask(), bedrockTask(), graceMs);
    } catch (err) {
        const reasons = (err && Array.isArray(err.errors) ? err.errors : [])
            .map(e => (e && (e.message || e.description)) || String(e))
            .filter(Boolean)
            .join(' | ');
        Logger.warn('[QUERY]', `全部查询方式均失败 ${ip}:${port || '默认端口'} (${type}) => ${reasons || err.message}`);
        const wrapped = new Error('所有服务器查询都失败了。');
        wrapped.reason = reasons || err.message;
        wrapped.durationMs = Date.now() - now;
        throw wrapped;
    }
}

function cacheKeyOf(ip, port, serverType, isSRV, iconUrl) {
    // icon 参数决定了“服务器没有 favicon 时用什么图标”，不带上会导致缓存里图标串台
    return `s:${String(ip).toLowerCase()}:${port ?? ''}:${serverType || 'auto'}:${isSRV ? 1 : 0}:${iconUrl ? 1 : 0}`;
}

async function queryServerStatus(ip, port, iconUrl, serverType = 'auto', isSRV = false, isInternalRequest = false) {
    const caching = conf().caching || {};
    const cachingOn = caching.enable !== false;
    const ttl = Number(caching.ttl_seconds) || 60;
    const negativeTtl = Number(caching.negative_ttl_seconds) || 0;

    const useCache = cachingOn && !isInternalRequest;
    const cacheKey = cacheKeyOf(ip, port, serverType, isSRV, iconUrl);

    if (useCache) {
        try {
            const cached = await getCache(cacheKey, Math.max(ttl, negativeTtl || 0));
            if (cached) {
                if (cached.__offline) {
                    // 短时间内重复查询同一个挂掉的服务器，直接返回上次的失败结果，避免每次都等满超时
                    const err = new Error(cached.reason || '服务器离线');
                    err.cachedOffline = true;
                    throw err;
                }
                Logger.debug('[CACHE]', `命中缓存: ${cacheKey}`);
                return { ...cached, cached: true };
            }
        } catch (e) {
            if (e.cachedOffline) throw e;
            Logger.debug('[CACHE]', `读取缓存异常，继续实时查询: ${e.message}`);
        }
    } else if (isInternalRequest) {
        Logger.debug('[CACHE]', '内部请求，绕过缓存。');
    }

    try {
        const liveData = await performLiveQuery(ip, port, iconUrl, serverType, isSRV);
        if (useCache) setCache(cacheKey, liveData, ttl);
        return { ...liveData, cached: false };
    } catch (error) {
        if (useCache && negativeTtl > 0) {
            setCache(cacheKey, {
                __offline: true,
                reason: error.reason || error.message,
                at: Date.now(),
            }, negativeTtl);
        }
        throw error;
    }
}

module.exports = { queryServerStatus, resolveSrvRecord, motdToPlainText };
