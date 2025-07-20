const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');

router.get('/', async (req, res) => {
    // 获取客户端IP，并进行标准化处理
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');

    // 从请求的查询参数中，解构出 host, ip, port
    const { ip, port, host } = req.query;

    let targetAddress = null;
    let targetPort = null;

    // --- 步骤 1: 统一解析输入 ---
    // 优先使用 host 参数。如果 host 存在，则从中解析出地址和端口。
    if (host) {
        const parts = host.split(':');
        // 确保 host 格式正确 (例如 "i.com:123")
        if (parts.length === 2 && parts[0] && parts[1]) {
            targetAddress = parts[0];
            targetPort = parts[1];
        }
    }
    // 如果 host 不存在或格式不正确，则尝试使用 ip 和 port 组合。
    else if (ip) {
        targetAddress = ip;
        targetPort = port; // port 可能为 undefined，下一步会做验证
    }

    // --- 步骤 2: 集中验证 ---
    // 无论通过哪种方式，最终都必须成功解析出地址和端口。
    if (!targetAddress || !targetPort) {
        return res.status(400).json({
            error: '请求格式不正确。请使用 ?host=example.com:12345 或 ?ip=1.2.3.4&port=12345 的格式提供服务器地址。'
        });
    }

    // --- 步骤 3: 执行与响应 ---
    const fullAddress = `${targetAddress}:${targetPort}`;
    logger.debug('[QUERY]', `${clientIP} 查询 ${fullAddress}`);

    try {
        // 使用解析后的标准变量调用核心服务
        const serverData = await queryServerStatus(targetAddress, targetPort);
        return res.json(serverData);
    } catch (error) {
        // 在错误处理中也使用标准变量，确保日志和返回内容的正确性
        logger.info('[QUERY]', `查询失败: ${fullAddress}`);
        return res.json({
            status: 'offline',
            "host": fullAddress,
            error: '无法连接到服务器，它可能已离线或地址/端口不正确。'
        });
    }
});

module.exports = router;