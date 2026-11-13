const express = require('express');
const router = express.Router();
const db = require('../db');
const configService = require('../services/configService');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const Logger = require('../utils/logger');
const { requireAuth, issueToken, isDefaultPassword } = require('../middleware/auth');

// 整个后台接口都需要登录
router.use(requireAuth);

/** 当前登录信息 */
router.get('/me', (req, res) => {
    res.json({
        success: true,
        username: req.admin.u,
        expiresAt: req.admin.exp,
        scope: req.admin.s || 'full',
    });
});

/** 仪表盘统计 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await analyticsService.getStats();
        res.json(stats);
    } catch (error) {
        Logger.error('[ADMIN]', `获取统计数据失败: ${error.message}`);
        res.status(500).json({ error: '无法获取统计数据。', detail: error.message });
    }
});

/** 原始日志分页查询 */
router.get('/logs', async (req, res) => {
    try {
        const { limit, offset, host, ok, endpoint } = req.query;
        const result = await analyticsService.getLogs({ limit, offset, host, ok, endpoint });
        res.json(result);
    } catch (error) {
        Logger.error('[ADMIN]', `查询日志失败: ${error.message}`);
        res.status(500).json({ error: '无法查询日志。', detail: error.message });
    }
});

// 数据库信息做 15 秒缓存，避免面板轮询把数据库打满
let dbInfoCache = { at: 0, data: null };

/** 数据库 / 缓存状态 */
router.get('/db', async (req, res) => {
    try {
        if (Date.now() - dbInfoCache.at < 15000 && dbInfoCache.data) {
            return res.json({ ...dbInfoCache.data, cached: true });
        }
        const info = await db.info();
        const cache = await cacheService.stats();
        const config = configService.get('config');
        const data = {
            ...info,
            cache,
            pendingBuffer: analyticsService.pendingCount(),
            retention: {
                raw_log: config.analytics?.raw_log || {},
                stat: config.analytics?.retention || {},
                caching: {
                    ttl_seconds: config.caching?.ttl_seconds,
                    max_entries: config.caching?.max_entries,
                },
            },
            cached: false,
        };
        dbInfoCache = { at: Date.now(), data };
        res.json(data);
    } catch (error) {
        Logger.error('[ADMIN]', `获取数据库信息失败: ${error.message}`);
        res.status(500).json({ error: '无法获取数据库信息。', detail: error.message });
    }
});

/** 数据库维护动作 */
router.post('/db/maintain', async (req, res) => {
    const action = String((req.body && req.body.action) || '');
    try {
        let result = null;
        switch (action) {
            case 'flush':
                result = await analyticsService.flush({ reason: 'manual' });
                break;
            case 'prune':
                result = await analyticsService.cleanup();
                break;
            case 'compact':
                await db.getAdapter().compact();
                result = { compacted: true };
                break;
            case 'clear-cache':
                result = { removed: await cacheService.clearAll() };
                break;
            case 'clear-logs':
                result = { removed: await analyticsService.clearRawLogs() };
                break;
            case 'reset-stats':
                await analyticsService.resetAll();
                result = { reset: true };
                break;
            default:
                return res.status(400).json({ success: false, error: `未知的操作: ${action}` });
        }
        dbInfoCache = { at: 0, data: null };
        Logger.info('[ADMIN]', `维护操作 ${action} 完成: ${JSON.stringify(result)}`);
        res.json({ success: true, action, result });
    } catch (error) {
        Logger.error('[ADMIN]', `维护操作 ${action} 失败: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

/** 完整配置（敏感字段已脱敏） */
router.get('/config', (req, res) => {
    const { front, pic } = configService.all();
    res.json({
        server: configService.publicConfig(),
        front,
        pic,
        editableKeys: [...configService.CONFIG_EDITABLE_KEYS],
    });
});

/** 修改管理员密码（前后端都传 md5） */
router.post('/password', (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    const username = req.admin.u;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, error: '请提供原密码与新密码。' });
    }
    if (!/^[0-9a-f]{32}$/i.test(String(newPassword))) {
        return res.status(400).json({ success: false, error: '密码格式不正确（应为 32 位 md5）。' });
    }
    if (isDefaultPassword(newPassword)) {
        return res.status(400).json({ success: false, error: '新密码不能与默认密码相同。' });
    }

    try {
        const admins = configService.get('config').admins || [];
        const user = admins.find(a => a.username === username);
        if (!user) {
            return res.status(404).json({ success: false, error: '管理员不存在。' });
        }
        if (String(user.password).toLowerCase() !== String(oldPassword).toLowerCase()) {
            return res.status(401).json({ success: false, error: '原密码不正确。' });
        }

        configService.setAdminPassword(username, String(newPassword).toLowerCase());
        const { token, expiresAt } = issueToken(username);
        Logger.info('[AUTH]', `${username} 已修改密码`);
        res.json({ success: true, message: '密码已更新。', token, expiresAt });
    } catch (error) {
        Logger.error('[AUTH]', `修改密码失败: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
