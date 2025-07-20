const express = require('express');
const fs = require("fs")
const router = express.Router();
const path  =require("path");
const bgPath = path.join(__dirname,'../','img', 'status_img.png');
const { queryServerStatus } = require('../services/queryService');
const { text4img } = require("../services/text4imgServices")

router.get('/', async (req, res) => {
    const { ip, port } = req.query;

    if (!ip) {
        // 您可以在这里发送一张表示“缺少参数”的错误图片
        return res.status(400).send('Missing IP parameter');
    }
    res.setHeader('Content-Type', 'image/png');

    try {
        // 同样调用核心查询服务来获取数据
        const serverData = await queryServerStatus(ip, port);
        
        const lines = [
            `状态: ${serverData.type} - 在线`,
            `协议: ${serverData.protocol}`,
            `MOTD: ${serverData.pureMotd.length >= 13 ? serverData.pureMotd.substring(0, 13)+"..." : serverData.pureMotd }`, // 截断过长的MOTD
            `玩家: ${serverData.players.online} / ${serverData.players.max}`,
            `版本: ${serverData.version}`,
            `延迟: ${serverData.delay}ms`,
            `查询时间: ${new Date().toLocaleString('zh-CN')}`
        ];

        // 5. 调用您的函数生成 SVG buffer
        const pngBuffer = await text4img(bgPath, lines);

        // 7. 发送最终的 PNG 图片
        
        return res.send(pngBuffer);

        

    } catch (error) {
        console.log(error)
        // 在这里，您可以发送一张表示“服务器离线”的图片
        return res.send(fs.readFileSync(bgPath));
    }
});

module.exports = router;