const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

router.get('/', (req, res) => {
    // 构造配置文件的绝对路径
    const configPath = path.join(__dirname,'../','config', 'front.json');

    // 读取文件内容
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('读取 config.json 文件失败:', err);
            // 如果文件读取失败，向前端返回一个服务器错误
            return res.status(500).json({ error: '无法加载服务器配置。' });
        }

        try {
            // 将文件内容解析为 JSON 对象并发送给前端
            const config = JSON.parse(data);
            res.json(config);
        } catch (parseErr) {
            console.error('解析 config.json 文件失败:', parseErr);
            return res.status(500).json({ error: '服务器配置文件格式错误。' });
        }
    });
});


module.exports = router;