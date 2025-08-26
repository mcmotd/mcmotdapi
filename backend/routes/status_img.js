const express = require('express');
const fs = require("fs")
const router = express.Router();
const path = require("path");
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');
const { queryServerStatus } = require('../services/queryService');
const { generateImage } = require('../services/imageGenerator');
const { default: parseHost } = require('../utils/parsehost');
const Logger = require('../utils/logger');
const { logQuery } = require('../services/analyticsService');

router.get('/', async (req, res) => {
    const clientIP = req.ip === '::1' ? '127.0.0.1' : req.ip.replace(/^::ffff:/, '');
    var { ip, port, host, stype, icon, srv,theme:theme } = req.query;
    const isInternalRequest = req.headers['x-internal-request'] === 'true';
    if(!theme){
        theme = 'simple';
    }
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
        // 同样调用核心查询服务来获取数据
        const serverData = await queryServerStatus(pre_host.ip, pre_host.port, icon, stype, Boolean(srv == 'true'), isInternalRequest);
        const simpleData = {
            serverData: serverData, // 传入 serverData 让模板自己格式化
            // backgroundPath: './bg.png', // 仍然可以覆盖默认背景
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
            serverType: serverData.type
        });

        return res.send(pngBuffer);

    } catch (error) {

        logQuery({
            endpoint: '/api/status_img',
            ip: pre_host.ip,
            port: pre_host.port,
            clientIp: clientIP,
            success: false,
            serverType: null
        });

        console.log(error)
        // 在这里，您可以发送一张表示“服务器离线”的图片
        return res.send(fs.readFileSync(bgPath));
    }
});

module.exports = router;