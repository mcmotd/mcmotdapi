// routes/iframe_img.js
const express = require('express');
const router = express.Router();
const path = require('path');
const { error4img } = require('../services/text4imgServices');
const logger = require('../utils/logger');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');

const { getContext, addRequestToQueue, handleBrowserCrash } = require('../utils/browserManager');
const config = require('../config.json');
const PORT = config.serverPort || 3000;
const timeout = 15 * 1000;

async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'image/png');
    let page = null;

    try {
        const context = await getContext();
        page = await context.newPage();

        const url = `http://127.0.0.1:${PORT}/iframe?${new URLSearchParams(req.query).toString()}`;

        await page.goto(url, {
            waitUntil: 'load',
            timeout: 60 * 1000
        });

        await page.waitForSelector('#app', { timeout: 3*1000 });
        await page.waitForFunction('window.serverData !== undefined', { timeout: 3*1000 });

        // 等待所有图片加载完成
        await page.waitForFunction(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.every(img => img.complete);
        }, { timeout: 3*1000 });

        // 截图 app 区域
        const appElement = await page.$('#app');
        const screenshot = await (appElement
            ? appElement.screenshot({ type: 'png' })
            : page.screenshot({ type: 'png' }));

        await page.close();
        return res.send(screenshot);
    } catch (e) {
        logger.error('[IFRAME]', 'Request Failed:', e.message);
        if (page) await page.close().catch(() => { });
        handleBrowserCrash();
        return res.send(await error4img(bgPath, [`Error: ${e.message.replace(/[\n\r]/g, ' ')}`]));
    }
}


router.get('/', (req, res) => {
    addRequestToQueue(() => handleRequest(req, res)).catch(async err => {
        logger.error('[IFRAME]', 'Queue Error:', err.message);
        res.status(500).send(await error4img(bgPath, [`Error: ${err.message.replace(/[\n\r]/g, ' ')}`]));
    });
});

module.exports = router;
