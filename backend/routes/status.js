const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { queryServerStatus } = require('../services/queryService');

router.get('/', async (req, res) => {
    // 获取客户端IP，并进行标准化处理
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');

    const { ip, port, host } = req.query;

    let targetAddress = null;
    let targetPort = null;

    // --- 步骤 1: 统一解析输入 ---
    if (host) {
        const parts = host.split(':');
        if (parts.length === 2 && parts[0] && parts[1]) {
            targetAddress = parts[0];
            targetPort = parts[1];
        }
    }
    else if (ip) {
        targetAddress = ip;
        targetPort = port;
    }

    // --- 步骤 2: 集中验证 ---
    // 验证 2.1: 确保地址和端口参数都存在
    if (!targetAddress || !targetPort) {
        return res.status(400).json({
            status:"error",
            error: '请求格式不正确。请使用 ?host=example.com:12345 或 ?ip=1.2.3.4&port=12345 的格式提供服务器地址。'
        });
    }

    // 验证 2.2: 校验端口号的有效性（核心改动）
    const numericPort = parseInt(targetPort, 10); // 基数为10，将字符串转换为整数

    // 依次判断：
    // 1. 是否为非数字 (Not-a-Number)，处理 "abc" 等情况。
    // 2. 转换后的数字是否在有效范围内 (1-65535)。
    // 3. 转换回字符串后是否与原始值相等，这能巧妙地处理 "123xyz" 或 "123.45" 等无效情况。
    if (Number.isNaN(numericPort) || numericPort < 1 || numericPort > 65535 || String(numericPort) !== targetPort.trim()) {
        return res.status(400).json({
            error: '端口无效。端口必须是 1 到 65535 之间的纯数字。'
        });
    }

    // --- 步骤 3: 执行与响应 ---
    const fullAddress = `${targetAddress}:${numericPort}`; // 使用验证过的数字端口
    logger.debug('[QUERY]', `${clientIP} 查询 ${fullAddress}`);

    try {
        // 使用解析和验证后的标准变量调用核心服务
        const serverData = await queryServerStatus(targetAddress, numericPort); // 传递数字端口
        return res.json(serverData);
    } catch (error) {
        logger.info('[QUERY]', `查询失败: ${fullAddress}`);
        return res.json({
            status: 'offline',
            "host": fullAddress,
            error: '无法连接到服务器，它可能已离线或地址/端口不正确。'
        });
    }
});

module.exports = router;