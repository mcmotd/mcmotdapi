const express = require('express');
const router = express.Router();
const path = require('path');
const { error4img } = require('../services/text4imgServices');
const logger = require('../utils/logger');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');

const { getContext, addRequestToQueue, handleBrowserCrash } = require('../utils/browserManager');
const { setScreenshot } = require('../utils/screenshotManager');
const config = require('../config.json');
const PORT = config.serverPort || 3000;

// 路由处理器
async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const page = await (await getContext()).newPage();
        await page.setDefaultNavigationTimeout(15000);
        await page.setDefaultTimeout(10000);

        const url = `http://127.0.0.1:${PORT}/iframe?${new URLSearchParams(req.query).toString()}`;

        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForSelector('#app', { timeout: 5000 });

        // 获取页面实际高度
        const actualHeight = await page.evaluate(() => {
            return Math.max(
                document.body.scrollHeight,
                document.documentElement.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.offsetHeight,
                document.body.clientHeight,
                document.documentElement.clientHeight
            );
        });

        // 增强的截图流程
        await page.setViewportSize({
            width: 700,
            height: actualHeight,
            deviceScaleFactor: 1
        });

        const filename = `${Math.random().toString(36).substring(2, 15)}.png`;
        const filePath = path.join(__dirname, '../../', 'screenshots', filename);


        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
            omitBackground: false,
            captureBeyondViewport: false,
            path: filePath
        });

        // 等待 Vue 组件挂载完成
        await page.waitForFunction('window.serverData !== undefined');
        const serverData = await page.evaluate(() => window.serverData);

        // 设置截图并返回 URL
        const { filename: savedFilename, expireAt } = setScreenshot(filename, screenshot);

        //打包Json和图片链接
        const protocol = req.protocol; // http 或 https
        const host = req.get('host');  // 域名 + 端口（如果有）
        const screenshotUrl = `${protocol}://${host}/screenshots/${savedFilename}`;
        const dataPackage = { serverData, screenshotUrl, expireAt }

        await page.close()
        return res.send(JSON.stringify(dataPackage));
    } catch (error) {
        logger.error('[SYNC IFRAME]', 'Request Failed:', error.message);
        handleBrowserCrash();
        return res.send(await error4img(bgPath, [`Error: ${error.message.replace(/[\n\r]/g, ' ')}`]));
    }
}

// 启动浏览器管理器
router.get('/', (req, res) => {
    addRequestToQueue(() => handleRequest(req, res)).catch(error => {
        logger.error('[SYNC IFRAME]', 'Queue Error:', error.message);
        res.status(500).send('Internal server error');
    });
});

module.exports = router;