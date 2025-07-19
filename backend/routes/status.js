const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService'); // 1. 导入核心查询服务

router.get('/', async (req, res) => {
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');
    const { ip, port } = req.query;
    logger.debug('[QUERY]', `${clientIP} 查询 ${ip}:${port}`);

    if (!ip) {
        return res.status(400).json({ error: '必须提供服务器IP地址 (ip)。' });
    }

    try {
        // 2. 直接调用查询服务
        const serverData = await queryServerStatus(ip, port);
        // 3. 成功后，将服务返回的数据作为JSON响应
        return res.json(serverData);
    } catch (error) {
        // 4. 如果服务抛出错误（两种查询都失败），则返回404
        logger.info('[QUERY]', `查询失败: ${ip}:${port}`);
        return res.json({
            status: 'offline',
            "host": `${ip}:${port}`,
            error: '无法连接到服务器，它可能已离线或地址/端口不正确。'
        });
    }
});

module.exports = router;