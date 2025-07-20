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

    // --- 步骤 1: 统一解析输入 (逻辑不变) ---
    // host 中可能包含端口，也可能不包含
    if (host) {
        const parts = host.split(':');
        targetAddress = parts[0];
        // 如果切分后有第二部分，则将其视为端口
        if (parts.length > 1 && parts[1]) {
            targetPort = parts[1];
        }
    }
    else if (ip) {
        targetAddress = ip;
        targetPort = port; // port 可能是 undefined
    }

    // --- 步骤 2: 集中验证 (逻辑调整) ---
    // 验证 2.1: 只验证地址是否存在，因为端口现在是可选的
    if (!targetAddress) {
        return res.status(400).json({
            status: "error",
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        });
    }

    let numericPort = undefined; // 初始化最终的数字端口为 undefined

    // 验证 2.2: [核心改动] 仅在用户提供了端口时，才对其进行校验
    if (targetPort) {
        const parsedPort = parseInt(targetPort, 10);

        if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 || String(parsedPort) !== targetPort.trim()) {
            return res.status(400).json({
                status: "error",
                error: '端口无效。如果提供，端口必须是 1 到 65535 之间的纯数字。'
            });
        }
        // 只有在端口有效时，才赋值
        numericPort = parsedPort;
    }

    // --- 步骤 3: 执行与响应 ---
    // 根据是否存在有效端口，动态构建用于日志的完整地址
    const fullAddress = numericPort ? `${targetAddress}:${numericPort}` : targetAddress;
    logger.debug('[QUERY]', `${clientIP} 查询 ${fullAddress}`);

    try {
        // [核心改动] 调用核心服务。
        // 如果 numericPort 是 undefined，JavaScript 会视其为未传递该参数。
        const serverData = await queryServerStatus(targetAddress, numericPort);
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