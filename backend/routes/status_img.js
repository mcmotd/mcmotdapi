const express = require('express');
const fs = require("fs")
const router = express.Router();
const path = require("path");
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');
const { queryServerStatus } = require('../services/queryService');
const { text4img } = require("../services/text4imgServices");
const { default: parseHost } = require('../utils/parsehost');
const Logger = require('../utils/logger');

router.get('/', async (req, res) => {
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');

    const { ip, port, host, stype, icon, srv } = req.query;

    let pre_host = parseHost(ip, port, host);

    if (!pre_host.success) {
        res.status(400).json({
            status: 'error',
            message: pre_host.message
        });
        return;
    }

    res.setHeader('Content-Type', 'image/png');

    const fullAddress = pre_host.port ? `${pre_host.ip}:${pre_host.port}` : pre_host.ip;
    Logger.debug('[QUERY_IMG]', `${clientIP} 查询 ${fullAddress}`);

    try {
        const serverData = await queryServerStatus(pre_host.ip, pre_host.port, icon, stype, Boolean(srv == 'true'));

        const lines = [
            `状态: ${serverData.type} - 在线`,
            `协议: ${serverData.protocol}`,
            `MOTD: ${serverData.pureMotd.length >= 13 ? serverData.pureMotd.substring(0, 13) + "..." : serverData.pureMotd}`, // 截断过长的MOTD
            `玩家: ${serverData.players.online} / ${serverData.players.max}`,
            `版本: ${serverData.version}`,
            `延迟: ${serverData.delay}ms`,
            `查询时间: ${new Date().toLocaleString('zh-CN')}`
        ];

        const pngBuffer = await text4img(bgPath, lines, {
            base64Icon: serverData.icon,
            x: 490,
            y: 170,
            size: 100
        });

        return res.send(pngBuffer);

    } catch (error) {
        console.log(error)
        return res.send(fs.readFileSync(bgPath));
    }
});

module.exports = router;