const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');
const { default: parseHost } = require('../utils/parsehost');
const { logQuery } = require('../services/analyticsService');

router.get('/', async (req, res) => {
    // 获取客户端IP，并进行标准化处理
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');

    const { ip, port, host, icon ,stype ,srv} = req.query;

    let referrer = req.headers['referer'] || null;
    
    if (referrer) {
        try {
            referrer = new URL(referrer).hostname; // 只保留域名，更干净
        } catch (e) {
            referrer = null; // 如果 Referer 无效，则忽略
        }
    }

    const isInternalRequest = req.headers['x-internal-request'] === 'true';

    let pre_host = parseHost(ip, port,host);

    if(!pre_host.success){
        res.status(400).json({
            status:'error',
            message:pre_host.message
        });
        return;
    }

    // --- 步骤 3: 执行与响应 ---
    // 根据是否存在有效端口，动态构建用于日志的完整地址
    const fullAddress = pre_host.port? `${pre_host.ip}:${pre_host.port}` : pre_host.ip;
    logger.debug('[QUERY]', `${clientIP} 查询 ${fullAddress}`);

    try {
        // [核心改动] 调用核心服务。
        // 如果 numericPort 是 undefined，JavaScript 会视其为未传递该参数。
        const serverData = await queryServerStatus(pre_host.ip, pre_host.port, icon, stype, Boolean(srv == 'true'), isInternalRequest);

        logQuery( {
            endpoint: '/api/status',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: true,
            serverType: serverData.type,
            referrer: referrer,
            from_cache: serverData.cached
        });

        serverData.cached = undefined;

        return res.json(serverData);
    } catch (error) {
        logger.info('[QUERY]', `查询失败: ${fullAddress}`);

        logQuery( {
            endpoint: '/api/status',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: false,
            serverType: null,
            referrer: referrer
        });

        return res.json({
            status: 'offline',
            "host": fullAddress,
            error: '无法连接到服务器，它可能已离线或地址/端口不正确。'
        });
    }
});

module.exports = router;