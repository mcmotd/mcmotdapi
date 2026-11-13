const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Logger = require('../utils/logger');

/**
 * 配置中心
 *
 * 旧代码里每个模块各读各的 config.json，导致：
 * - 改配置必须重启
 * - 有的模块读 admin，有的读 admins，直接读不到
 * - 配置项缺一半，编辑器保存时报错
 *
 * 现在统一走这里：启动时补齐默认值并落盘，运行期热重载，写文件用“临时文件 + rename”保证原子性。
 */

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const EXAMPLE_DIR = path.join(__dirname, '..', 'example');

const FILES = {
    config: { name: 'config.json', example: 'config.example.json' },
    front: { name: 'front.json', example: 'front.example.json' },
    pic: { name: 'pic.json', example: 'pic.example.json' },
};

// 只允许通过 API 修改这些顶层键，避免把 admins / auth.secret 之类的东西改坏
const CONFIG_EDITABLE_KEYS = new Set([
    'javaDefaultPort',
    'bedrockDefaultPort',
    'queryTimeout',
    'bedrockTimeout',
    'srvTimeout',
    'srvFallbackDns',
    'autoJavaGraceMs',
    'serverPort',
    'log_level',
    'analytics',
    'caching',
    'database',
]);

// 改了需要重启才能生效的键
const RESTART_REQUIRED_KEYS = new Set(['serverPort', 'database']);

const cache = { config: null, front: null, pic: null };
const watchers = {};
const listeners = new Set();
const writeTimers = {};

function filePath(target) {
    const meta = FILES[target];
    if (!meta) throw new Error(`未知的配置目标: ${target}`);
    return path.join(CONFIG_DIR, meta.name);
}

function ensureFile(target) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const targetPath = filePath(target);
    if (fs.existsSync(targetPath)) return;
    const examplePath = path.join(EXAMPLE_DIR, FILES[target].example);
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, targetPath);
        Logger.info('[CONFIG]', `已从 ${FILES[target].example} 创建 ${FILES[target].name}`);
    } else {
        fs.writeFileSync(targetPath, '{}\n', 'utf8');
        Logger.warn('[CONFIG]', `${FILES[target].example} 不存在，已创建空的 ${FILES[target].name}`);
    }
}

function readJson(target) {
    ensureFile(target);
    const raw = fs.readFileSync(filePath(target), 'utf8');
    return JSON.parse(raw);
}

function writeJson(target, data) {
    const targetPath = filePath(target);
    const tmpPath = `${targetPath}.tmp`;
    const content = JSON.stringify(data, null, 2) + '\n';
    fs.writeFileSync(tmpPath, content, 'utf8');
    try {
        if (fs.existsSync(targetPath)) fs.copyFileSync(targetPath, `${targetPath}.bak`);
    } catch (e) { /* 备份失败不影响主流程 */ }
    fs.renameSync(tmpPath, targetPath);
}

/** 生成并持久化 token 签名密钥（首次启动时） */
function ensureSecret(config) {
    if (!config.auth || typeof config.auth !== 'object') config.auth = {};
    if (!config.auth.secret || String(config.auth.secret).length < 16) {
        config.auth.secret = crypto.randomBytes(32).toString('hex');
        return true;
    }
    if (config.auth.tokenHours === undefined) {
        config.auth.tokenHours = 12;
        return true;
    }
    return false;
}

/** 补齐新增配置项，保证前端编辑器不会因为字段不存在而崩 */
function applyDefaults(config) {
    let changed = false;
    const setDefault = (obj, key, value) => {
        if (obj[key] === undefined) {
            obj[key] = value;
            changed = true;
        }
    };
    const setNested = (obj, key, value) => {
        if (obj[key] === undefined || obj[key] === null || typeof obj[key] !== 'object' || Array.isArray(obj[key])) {
            obj[key] = value;
            changed = true;
        }
    };

    // 旧版本写的是 admin，代码读的是 admins，这里统一成 admins
    if (config.admin && !config.admins) {
        config.admins = config.admin;
        delete config.admin;
        changed = true;
    }
    if (!Array.isArray(config.admins)) {
        config.admins = [{ username: 'admin', password: '5f4dcc3b5aa765d61d8327deb882cf99' }];
        changed = true;
    }

    setDefault(config, 'javaDefaultPort', 25565);
    setDefault(config, 'bedrockDefaultPort', 19132);
    setDefault(config, 'queryTimeout', 5000);
    setDefault(config, 'bedrockTimeout', 2500);
    setDefault(config, 'srvTimeout', 1500);
    setDefault(config, 'autoJavaGraceMs', 1500);
    setDefault(config, 'serverPort', 3123);
    setDefault(config, 'log_level', 2);
    if (!Array.isArray(config.srvFallbackDns) || !config.srvFallbackDns.length) {
        config.srvFallbackDns = ['223.5.5.5', '119.29.29.29'];
        changed = true;
    }

    setNested(config, 'auth', {});
    if (!config.auth.secret || config.auth.tokenHours === undefined) {
        if (ensureSecret(config)) changed = true;
    }

    setNested(config, 'database', {});
    setDefault(config.database, 'driver', 'sqlite');
    setNested(config.database, 'sqlite', { file: 'data/mcmotd.db' });
    setDefault(config.database.sqlite, 'file', 'data/mcmotd.db');
    setNested(config.database, 'mysql', {
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'mcmotd',
        connectionLimit: 10,
    });

    setNested(config, 'analytics', {});
    setDefault(config.analytics, 'enable', true);
    setNested(config.analytics, 'raw_log', {});
    setDefault(config.analytics.raw_log, 'enable', true);
    setDefault(config.analytics.raw_log, 'sample_rate', 1);
    setDefault(config.analytics.raw_log, 'skip_cache_hits', true);
    setDefault(config.analytics.raw_log, 'retention_days', 3);
    setDefault(config.analytics, 'flush_interval_ms', 5000);
    setNested(config.analytics, 'retention', {});
    setDefault(config.analytics.retention, 'hourly_days', 60);
    setDefault(config.analytics.retention, 'daily_days', 0);

    setNested(config, 'caching', {});
    setDefault(config.caching, 'enable', true);
    setDefault(config.caching, 'ttl_seconds', 60);
    setDefault(config.caching, 'srv_ttl_seconds', 600);
    setDefault(config.caching, 'srv_negative_ttl_seconds', 300);
    setDefault(config.caching, 'negative_ttl_seconds', 20);
    setDefault(config.caching, 'max_entries', 5000);

    return changed;
}

function load(target, { persist = true } = {}) {
    let data;
    try {
        data = readJson(target);
    } catch (err) {
        Logger.error('[CONFIG]', `读取 ${FILES[target].name} 失败: ${err.message}`);
        data = {};
    }

    if (target === 'config') {
        const changed = applyDefaults(data);
        if (changed && persist) {
            try {
                writeJson(target, data);
            } catch (e) {
                Logger.warn('[CONFIG]', `补齐默认配置后写回失败: ${e.message}`);
            }
        }
        // 日志级别支持热更新
        if (typeof data.log_level === 'number') Logger.level = data.log_level;
    }

    // 保持对象引用不变：有些模块（如 imageGenerator）在加载时就拿到了配置对象，
    // 如果这里整体替换成新对象，那些模块就永远读不到热更新后的值。
    const prev = cache[target];
    if (prev && typeof prev === 'object' && !Array.isArray(prev) && data && typeof data === 'object' && !Array.isArray(data)) {
        Object.keys(prev).forEach(k => { delete prev[k]; });
        Object.assign(prev, data);
        data = prev;
    }

    cache[target] = data;
    return data;
}

function watch(target) {
    if (watchers[target]) return;
    try {
        const targetPath = filePath(target);
        watchers[target] = fs.watch(targetPath, (event) => {
            if (event !== 'change' && event !== 'rename') return;
            clearTimeout(writeTimers[target]);
            writeTimers[target] = setTimeout(() => {
                try {
                    load(target);
                    Logger.debug('[CONFIG]', `${FILES[target].name} 已重新加载`);
                    listeners.forEach(fn => {
                        try { fn(target, cache[target]); } catch (e) { /* ignore */ }
                    });
                } catch (err) {
                    Logger.warn('[CONFIG]', `热重载 ${FILES[target].name} 失败: ${err.message}`);
                }
            }, 300);
        });
    } catch (err) {
        Logger.debug('[CONFIG]', `监听 ${FILES[target].name} 失败: ${err.message}`);
    }
}

function init({ watchFiles = true } = {}) {
    Object.keys(FILES).forEach(ensureFile);
    load('config');
    load('front');
    load('pic');
    if (watchFiles) Object.keys(FILES).forEach(watch);
    return get('config');
}

function get(target = 'config') {
    if (!cache[target]) load(target);
    return cache[target];
}

function all() {
    return { config: get('config'), front: get('front'), pic: get('pic') };
}

function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

function validateKey(key) {
    if (typeof key !== 'string') throw new Error('key 必须是字符串');
    if (key === '') return [];
    const segments = key.split('.');
    if (segments.length > 6) throw new Error('key 层级过深');
    for (const s of segments) {
        if (!s) throw new Error('key 不能包含空片段');
        if (s.length > 64) throw new Error('key 片段过长');
        if (FORBIDDEN_SEGMENTS.has(s)) throw new Error(`非法的 key 片段: ${s}`);
    }
    return segments;
}

function setNestedValue(obj, segments, value) {
    let cur = obj;
    for (let i = 0; i < segments.length - 1; i++) {
        const k = segments[i];
        if (typeof cur[k] !== 'object' || cur[k] === null || Array.isArray(cur[k])) {
            cur[k] = {};
        }
        cur = cur[k];
    }
    cur[segments[segments.length - 1]] = value;
}

/**
 * 更新配置
 * @param {{target?:string, key?:string, value:any}} payload
 * @returns {{target:string, key:string, restartRequired:boolean}}
 */
function update({ target = 'front', key = '', value } = {}) {
    if (!FILES[target]) throw new Error(`未知的配置目标: ${target}`);
    if (target === 'config' && !key) throw new Error('服务端配置不支持整体覆盖，请按配置项提交');
    if (value === undefined) throw new Error('缺少 value');

    const segments = validateKey(key);

    if (target === 'config') {
        const root = segments[0];
        if (!CONFIG_EDITABLE_KEYS.has(root)) {
            throw new Error(`配置项 ${root} 不允许通过接口修改`);
        }
    }

    if (target === 'front' && segments.length) {
        const current = get('front');
        if (!(segments[0] in current)) {
            throw new Error(`未知的配置节: ${segments[0]}`);
        }
    }

    // 先写一份基于磁盘最新内容的副本，再落盘，避免内存与文件不一致
    const next = readJson(target);

    // 前端拿到的密码是脱敏的 ******，表示“保持原值”
    if (target === 'config' && segments[0] === 'database' && value && typeof value === 'object') {
        if (value.mysql && value.mysql.password === '******') {
            value = {
                ...value,
                mysql: { ...value.mysql, password: next.database?.mysql?.password ?? '' },
            };
        }
    }

    if (segments.length === 0) {
        if (typeof value !== 'object' || value === null) throw new Error('整体覆盖必须提交对象');
        writeJson(target, value);
    } else {
        setNestedValue(next, segments, value);
        writeJson(target, next);
    }

    load(target, { persist: target === 'config' });

    const restartRequired = target === 'config' && RESTART_REQUIRED_KEYS.has(segments[0]);

    listeners.forEach(fn => {
        try { fn(target, cache[target]); } catch (e) { /* ignore */ }
    });

    return { target, key, restartRequired };
}

/** 修改管理员密码（md5 哈希由调用方提供） */
function setAdminPassword(username, passwordMd5) {
    const config = get('config');
    const admins = Array.isArray(config.admins) ? config.admins : [];
    const idx = admins.findIndex(a => a.username === username);
    if (idx === -1) throw new Error('管理员不存在');
    const next = readJson('config');
    const nextAdmins = Array.isArray(next.admins) ? next.admins : [];
    const nextIdx = nextAdmins.findIndex(a => a.username === username);
    if (nextIdx === -1) throw new Error('管理员不存在');
    nextAdmins[nextIdx].password = passwordMd5;
    writeJson('config', next);
    load('config');
    return true;
}

/** 给接口/前端返回的配置副本：隐藏敏感字段 */
function publicConfig() {
    const cfg = JSON.parse(JSON.stringify(get('config')));
    if (cfg.auth) {
        cfg.auth = { tokenHours: cfg.auth.tokenHours, secret: cfg.auth.secret ? '******' : '' };
    }
    if (cfg.admins) {
        cfg.admins = cfg.admins.map(a => ({ username: a.username, password: '******' }));
    }
    if (cfg.database?.mysql) {
        cfg.database.mysql = { ...cfg.database.mysql, password: cfg.database.mysql.password ? '******' : '' };
    }
    return cfg;
}

function restartRequiredFor(key) {
    return RESTART_REQUIRED_KEYS.has(String(key).split('.')[0]);
}

module.exports = {
    init,
    get,
    all,
    update,
    onChange,
    publicConfig,
    setAdminPassword,
    restartRequiredFor,
    CONFIG_EDITABLE_KEYS,
    CONFIG_DIR,
    filePath,
};
