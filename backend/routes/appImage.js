const express = require('express');

const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');
const { generateAppImage } = require('../services/appImageRenderer');
const { default: parseHost } = require('../utils/parsehost');
const { logQuery } = require('../services/analyticsService');

router.get('/', async (req, res) => {
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');
    const { ip, port, host, stype, icon, srv, lang, dark } = req.query;
    const isInternalRequest = req.headers['x-internal-request'] === 'true';

    let referrer = req.headers.referer || null;
    if (referrer) {
        try {
            referrer = new URL(referrer).hostname;
        } catch {
            referrer = null;
        }
    }

    const preHost = parseHost(ip, port, host);
    if (!preHost.success) {
        return res.status(400).json({
            status: 'error',
            message: preHost.message || preHost.error
        });
    }

    const fullAddress = preHost.port ? `${preHost.ip}:${preHost.port}` : preHost.ip;
    const displayHost = typeof host === 'string' && host.trim() ? host.trim() : fullAddress;
    logger.debug('[APP_IMAGE]', `${clientIP} 查询 ${fullAddress}`);
    res.setHeader('Content-Type', 'image/png');

    try {
        const serverData = await queryServerStatus(preHost.ip, preHost.port, icon, stype, Boolean(srv === 'true'), isInternalRequest);
        const imageBuffer = await generateAppImage({ ...serverData, displayHost }, { lang, imageUrl: icon, dark });

        logQuery({
            endpoint: '/api/app_img',
            ip: preHost.ip,
            port: preHost.port,
            clientIp: clientIP,
            success: true,
            serverType: serverData.type,
            referrer,
            from_cache: serverData.cached
        });

        return res.send(imageBuffer);
    } catch (error) {
        logger.warn('[APP_IMAGE]', `实时查服失败: ${fullAddress}`, error.message);
        const imageBuffer = await generateAppImage({
            status: 'offline',
            host: fullAddress,
            displayHost
        }, { lang, imageUrl: icon, dark });

        logQuery({
            endpoint: '/api/app_img',
            ip: preHost.ip,
            port: preHost.port,
            clientIp: clientIP,
            success: false,
            serverType: null,
            referrer
        });

        return res.send(imageBuffer);
    }
});

module.exports = router;
