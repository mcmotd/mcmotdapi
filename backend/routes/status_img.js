const express = require('express');
const fs = require('fs');
const router = express.Router();
const path = require('path');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');
const { queryServerStatus } = require('../services/queryService');
const { generateImage } = require('../services/imageGenerator');
const { default: parseHost } = require('../utils/parsehost');
const Logger = require('../utils/logger');
const { logQuery } = require('../services/analyticsService');

function clientIpOf(req) {
    const ip = req.ip || req.socket?.remoteAddress || '';
    return ip === '::1' ? '127.0.0.1' : String(ip).replace(/^::ffff:/, '');
}

router.get('/', async (req, res) => {
    const clientIP = clientIpOf(req);
    const { ip, port, host, stype, icon, srv } = req.query;
    let { theme } = req.query;
    const isInternalRequest = req.headers['x-internal-request'] === 'true';

    let referrer = req.headers['referer'] || null;
    if (referrer) {
        try {
            referrer = new URL(referrer).hostname;
        } catch (e) {
            referrer = null;
        }
    }

    if (!theme) theme = 'simple';

    const pre_host = parseHost(ip, port, host);
    if (!pre_host.success) {
        return res.status(400).json({ status: 'error', message: pre_host.message || pre_host.error });
    }

    res.setHeader('Content-Type', 'image/png');

    const fullAddress = pre_host.port ? `${pre_host.ip}:${pre_host.port}` : pre_host.ip;
    Logger.debug('[QUERY_IMG]', `${clientIP} 查询 ${fullAddress}`);

    const startedAt = Date.now();

    try {
        const serverData = await queryServerStatus(
            pre_host.ip, pre_host.port, icon, stype, Boolean(srv == 'true'), isInternalRequest
        );

        const simpleData = {
            serverData,
            iconOptions: {
                base64Icon: serverData.icon,
                x: 490,
                y: 170,
                size: 100
            }
        };
        const pngBuffer = await generateImage(theme, simpleData);

        logQuery({
            endpoint: '/api/status_img',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: true,
            serverType: serverData.type,
            referrer,
            from_cache: serverData.cached,
            delayMs: Date.now() - startedAt,
        });

        return res.send(pngBuffer);
    } catch (error) {
        const reason = error.reason || error.message;
        Logger.info('[QUERY_IMG]', `查询失败: ${fullAddress} -> ${reason}`);

        logQuery({
            endpoint: '/api/status_img',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: false,
            serverType: null,
            referrer,
            from_cache: false,
            delayMs: Date.now() - startedAt,
            error: reason,
        });

        // 返回一张“离线”占位图
        try {
            return res.send(fs.readFileSync(bgPath));
        } catch (e) {
            return res.status(500).json({ status: 'error', message: '图片生成失败。' });
        }
    }
});

module.exports = router;
