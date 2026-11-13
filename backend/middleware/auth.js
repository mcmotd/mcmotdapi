const crypto = require('crypto');
const configService = require('../services/configService');

/**
 * 极简 token 鉴权
 *
 * 之前的管理后台只是在前端 sessionStorage 打了一个标记，
 * 后端 /api/admin/stats 和配置修改接口完全裸奔。这里用 HMAC-SHA256 签名的自包含 token，
 * 密钥保存在 config.json 的 auth.secret（首次启动自动生成）。
 */

const DEFAULT_PASSWORD_MD5 = '5f4dcc3b5aa765d61d8327deb882cf99'; // "password"

function secret() {
    return String(configService.get('config').auth?.secret || '');
}

function tokenHours() {
    return Number(configService.get('config').auth?.tokenHours) || 12;
}

function base64url(input) {
    return Buffer.from(input).toString('base64url');
}

function signHmac(body) {
    return crypto.createHmac('sha256', secret()).update(body).digest('base64url');
}

/**
 * @param {string} username
 * @param {{scope?: string}} options scope='password' 表示只允许改密码
 */
function issueToken(username, { scope } = {}) {
    const expiresAt = Date.now() + tokenHours() * 3600 * 1000;
    const payload = { u: username, exp: expiresAt };
    if (scope) payload.s = scope;
    const body = base64url(JSON.stringify(payload));
    const token = `${body}.${signHmac(body)}`;
    return { token, expiresAt };
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;

    const expected = signHmac(body);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    let payload;
    try {
        payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch (e) {
        return null;
    }
    if (!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
}

function extractToken(req) {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) return header.slice(7).trim();
    if (req.headers['x-admin-token']) return String(req.headers['x-admin-token']);
    if (req.query && req.query.token) return String(req.query.token);
    if (req.body && req.body.token) return String(req.body.token);
    return null;
}

/** 必须登录；scope=password 的 token 只能访问改密接口 */
function requireAuth(req, res, next) {
    const payload = verifyToken(extractToken(req));
    if (!payload) {
        return res.status(401).json({ success: false, code: 401, error: '未登录或登录已过期，请重新登录。', mustLogin: true });
    }

    if (payload.s === 'password') {
        const isPasswordEndpoint = req.baseUrl.includes('/password') || req.path.includes('password');
        if (!isPasswordEndpoint) {
            return res.status(403).json({
                success: false,
                code: 403,
                error: '当前仍在使用默认密码，请先修改密码。',
                mustChangePassword: true,
            });
        }
    }

    req.admin = payload;
    next();
}

function isDefaultPassword(passwordMd5) {
    return String(passwordMd5) === DEFAULT_PASSWORD_MD5;
}

module.exports = {
    issueToken,
    verifyToken,
    requireAuth,
    isDefaultPassword,
    DEFAULT_PASSWORD_MD5,
};
