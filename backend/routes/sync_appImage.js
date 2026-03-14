const express = require('express');

const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');
const { generateAppImage } = require('../services/appImageRenderer');
const { cleanupExpiredFiles, saveTemporaryImage } = require('../services/appImageStorage');
const { default: parseHost } = require('../utils/parsehost');
const { logQuery } = require('../services/analyticsService');

async function handleSync(req, res) {
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');
    const params = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;
    const { ip, port, host, stype, icon, srv, lang, dark } = params;
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
    logger.debug('[SYNC_APP_IMAGE]', `${clientIP} 同步 ${fullAddress}`);

    try {
        cleanupExpiredFiles();

        const serverData = await queryServerStatus(preHost.ip, preHost.port, icon, stype, Boolean(srv === 'true'), isInternalRequest);
        const responseData = { ...serverData, displayHost };
        delete responseData.cached;

        const imageBuffer = await generateAppImage(responseData, { lang, imageUrl: icon, dark });
        const stored = saveTemporaryImage(imageBuffer, responseData);
        const screenshotUrl = `${req.protocol}://${req.get('host')}/api/screenshot?file=${stored.file}`;

        logQuery({
            endpoint: '/api/sync_app_img',
            ip: preHost.ip,
            port: preHost.port,
            clientIp: clientIP,
            success: true,
            serverType: responseData.type,
            referrer,
            from_cache: serverData.cached
        });

        return res.json({
            serverData: responseData,
            screenshotUrl,
            expireAt: stored.expireAt
        });
    } catch (error) {
        logger.warn('[SYNC_APP_IMAGE]', `生成失败: ${fullAddress}`, error.message);

        logQuery({
            endpoint: '/api/sync_app_img',
            ip: preHost.ip,
            port: preHost.port,
            clientIp: clientIP,
            success: false,
            serverType: null,
            referrer
        });

        return res.status(500).json({
            status: 'error',
            message: '生成 appImage 失败'
        });
    }
}

router.get('/', handleSync);
router.post('/', handleSync);

module.exports = router;
