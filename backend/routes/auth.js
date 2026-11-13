const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const configService = require('../services/configService');
const Logger = require('../utils/logger');
const { issueToken, isDefaultPassword } = require('../middleware/auth');

function md5(text) {
    return crypto.createHash('md5').update(String(text)).digest('hex');
}

/**
 * POST /api/login
 * body: { username, password }  password 可以是前端传来的 md5，也可以是明文（会再算一次 md5）
 */
router.post('/', (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.json({ code: 400, success: false, error: '请输入用户名和密码。' });
    }

    try {
        const admins = configService.get('config').admins;

        if (!Array.isArray(admins)) {
            Logger.error('[AUTH]', 'config.json 的 admins 字段不是数组');
            return res.json({ code: 500, success: false, error: '服务器凭据配置格式不正确。' });
        }

        const user = admins.find(a => a && a.username === username);
        if (!user) {
            return res.json({ code: 401, success: false, error: '用户名或密码错误。' });
        }

        const stored = String(user.password || '').toLowerCase();
        const given = String(password).toLowerCase();
        // 兼容两种保存方式：32 位 md5，或者直接存明文
        const isMd5Stored = /^[0-9a-f]{32}$/.test(stored);
        const matched = isMd5Stored ? stored === given : stored === String(password);

        if (!matched) {
            return res.json({ code: 401, success: false, error: '用户名或密码错误。' });
        }

        // 默认密码不再直接拒绝登录（否则配置里写着默认密码就永远进不去后台），
        // 而是签发一个只能改密码的受限 token。
        const mustChangePassword = isMd5Stored && isDefaultPassword(stored);
        const { token, expiresAt } = issueToken(username, mustChangePassword ? { scope: 'password' } : undefined);

        Logger.info('[AUTH]', `${username} 登录成功${mustChangePassword ? '（默认密码，需先修改）' : ''}`);

        return res.json({
            code: 200,
            success: true,
            message: mustChangePassword ? '请先修改默认密码。' : `欢迎回来, ${username}!`,
            token,
            expiresAt,
            username,
            mustChangePassword,
        });
    } catch (e) {
        Logger.error('[AUTH]', `登录流程异常: ${e.message}`);
        return res.json({ code: 500, success: false, error: '服务器内部错误。' });
    }
});

/** 供前端校验 token 是否仍然有效 */
router.get('/check', require('../middleware/auth').requireAuth, (req, res) => {
    res.json({ success: true, username: req.admin.u, expiresAt: req.admin.exp, scope: req.admin.s || 'full' });
});

module.exports = router;
