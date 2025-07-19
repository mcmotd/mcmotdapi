const express = require('express');
const fs = require('fs');
const router = express.Router();
const path = require('path');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');
const { text4img } = require("../services/text4imgServices")

const config = require('../config.json');
const PORT = config.serverPort || 3000;

router.get('/', async (req, res) => {
    const queryParams = req.query;
    
    if (!queryParams.ip) {
        return res.status(400).send('Missing IP parameter');
    }
    res.setHeader('Content-Type', 'image/jpeg');

    try {
        const browser = await require('puppeteer').launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--no-zygote',
                '--disable-gpu',
                '--max-old-space-size=128'
            ]
        });

        const page = await browser.newPage();
        
        // 设置视口大小
        await page.setViewport({ 
            width: 700, 
            height: 365,
            deviceScaleFactor: 1
        });
        
        // 构建访问本地路由的URL (使用127.0.0.1避免DNS问题)
        const baseUrl = `http://127.0.0.1:${PORT}`;
        const queryString = new URLSearchParams(queryParams).toString();
        const url = `${baseUrl}/iframe?${queryString}`;
        
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 15000
        });

        // 等待关键元素加载完成
        await page.waitForSelector('#app', { timeout: 5000 });

        const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 100,
            fullPage: true,
            omitBackground: true,
            captureBeyondViewport: false
        });

        await browser.close();
        return res.send(screenshot);

    } catch (error) {
        let errMsg = [`生成图片失败: ${error.message}`]
        const pngBuffer = await text4img(bgPath, errMsg);
        return res.send(pngBuffer);
    }
});

module.exports = router;