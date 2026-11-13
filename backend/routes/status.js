const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');
const { default: parseHost } = require('../utils/parsehost');
const { logQuery } = require('../services/analyticsService');
const configService = require('../services/configService');

function clientIpOf(req) {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '::1' ? '127.0.0.1' : String(ip).replace(/^::ffff:/, '');
}

function referrerOf(req) {
    let referrer = req.headers['referer'] || null;
    if (referrer) {
        try {
            referrer = new URL(referrer).hostname;
        } catch (e) {
            referrer = null;
        }
    }
    return referrer;
}

router.get('/', async (req, res) => {
    const clientIP = clientIpOf(req);
    const referrer = referrerOf(req);
    const { ip, port, host, icon, stype, srv } = req.query;
    const isInternalRequest = req.headers['x-internal-request'] === 'true';

    const pre_host = parseHost(ip, port, host);

    if (!pre_host.success) {
        // parseHost 失败时字段名是 error，之前这里取的是 message，导致错误提示永远是空的
        res.status(400).json({ status: 'error', message: pre_host.message || pre_host.error });
        return;
    }

    const fullAddress = pre_host.port ? `${pre_host.ip}:${pre_host.port}` : pre_host.ip;
    logger.debug('[QUERY]', `${clientIP} 查询 ${fullAddress}`);

    const startedAt = Date.now();

    try {
        const serverData = await queryServerStatus(
            pre_host.ip, pre_host.port, icon, stype, Boolean(srv == 'true'), isInternalRequest
        );

        logQuery({
            endpoint: '/api/status',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: true,
            serverType: serverData.type,
            referrer,
            from_cache: serverData.cached,
            delayMs: Date.now() - startedAt,
        });

        const cached = Boolean(serverData.cached);
        serverData.cached = undefined;

        res.setHeader('X-Cache', cached ? 'HIT' : 'MISS');
        return res.json(serverData);
    } catch (error) {
        const elapsed = Date.now() - startedAt;
        const reason = error.reason || error.message;
        logger.info('[QUERY]', `查询失败: ${fullAddress} -> ${reason}`);

        logQuery({
            endpoint: '/api/status',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: false,
            serverType: null,
            referrer,
            from_cache: false,
            delayMs: elapsed,
            error: reason,
        });

        const payload = {
            status: 'offline',
            host: fullAddress,
            error: '无法连接到服务器，它可能已离线或地址/端口不正确。',
        };
        // 排查问题时把真实原因带出来；面向公众时默认隐藏
        if (configService.get('config').log_level >= 3) payload.reason = reason;

        return res.json(payload);
    }
});

module.exports = router;
