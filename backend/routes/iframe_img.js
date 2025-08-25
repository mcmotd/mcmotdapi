const express = require('express');
const router = express.Router();
const path = require('path');
const { error4img } = require('../services/text4imgServices');
const logger = require('../utils/logger');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');

const { getContext, addRequestToQueue, handleBrowserCrash } = require('../utils/browserManager');
const config = require('../config.json');
const PORT = config.serverPort || 3000;

// 路由处理器
async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'image/png');

    try {
        const page = await (await getContext()).newPage();
        await page.setDefaultNavigationTimeout(15000);
        await page.setDefaultTimeout(10000);

        const url = `http://127.0.0.1:${PORT}/iframe?${new URLSearchParams(req.query).toString()}`;

        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForSelector('#app', { timeout: 5000 });

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

        await page.setViewportSize({
            width: 700,
            height: actualHeight,
            deviceScaleFactor: 1
        });

        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
            omitBackground: false,
            captureBeyondViewport: false
        });

        await page.close();
        return res.send(screenshot);
    } catch (error) {
        logger.error('[IFRAME]', 'Request Failed:', error.message);
        handleBrowserCrash();
        return res.send(await error4img(bgPath, [`Error: ${error.message.replace(/[\n\r]/g, ' ')}`]));
    }
}

// 启动浏览器管理器
router.get('/', (req, res) => {
    addRequestToQueue(() => handleRequest(req, res)).catch(async error => {
        logger.error('[IFRAME]', 'Queue Error:', error.message);
        res.status(500).send(await error4img(bgPath, [`Error: ${error.message.replace(/[\n\r]/g, ' ')}`]));
    });
});

module.exports = router;