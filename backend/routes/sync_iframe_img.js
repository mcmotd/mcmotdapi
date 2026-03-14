const express = require('express');
const router = express.Router();
const path = require('path');
const { error4img } = require('../services/text4imgServices');
const logger = require('../utils/logger');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');

const { getContext, addRequestToQueue, handleBrowserCrash } = require('../utils/browserManager');
const { setScreenshot, startManager } = require('../utils/screenshotManager');
const config = require('../config.json');
const PORT = config.serverPort || 3000;
const timeout = 30 * 1000;

//启动截图管理器
startManager();

// 路由处理器
async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');

    try {
        const page = await (await getContext()).newPage();
        await page.setDefaultNavigationTimeout(timeout);
        await page.setDefaultTimeout(timeout);

        const url = `http://127.0.0.1:${PORT}/iframe?${new URLSearchParams(req.query).toString()}`;

        await page.goto(url, {
            waitUntil: 'load',
            timeout: 60 * 1000
        });

        await page.waitForSelector('#app', { timeout: 30000 });
        await page.waitForFunction('window.serverData !== undefined', { timeout: 30000 });

        // 等待所有图片加载完成
        await page.waitForFunction(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.every(img => img.complete);
        }, { timeout: 3 * 1000 });

        const filename = `${Math.random().toString(36).substring(2, 15)}.png`;
        const filePath = path.join(__dirname, '../../', 'screenshots', filename);


        // 截图 app 区域
        const appElement = await page.$('#app');
        const screenshot = await (appElement
            ? appElement.screenshot({ type: 'png' })
            : page.screenshot({ type: 'png', path: filePath }));
        /*const screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
            omitBackground: false,
            captureBeyondViewport: false,
            path: filePath
        });*/

        // 等待 Vue 组件挂载完成
        await page.waitForFunction('window.serverData !== undefined');
        const serverData = await page.evaluate(() => window.serverData);

        // 设置截图并返回 URL
        const { filename: savedFilename, expireAt } = setScreenshot(filename, screenshot);

        //打包Json和图片链接
        const protocol = req.protocol; // http 或 https
        //console.log(req)
        const host = req.get('host');  // 域名 + 端口（如果有）
        const screenshotUrl = `${protocol}://${host}/api/screenshot?file=${savedFilename}`;
        const dataPackage = { serverData, screenshotUrl, expireAt }

        await page.close()
        return res.send(JSON.stringify(dataPackage));
    }
    catch (error) {
        console.error(error)
        logger.error('[SYNC IFRAME]', 'Request Failed:', error.message);
        if ('TimeoutError' === error.name) {
            logger.error('[SYNC IFRAME]', 'Request Failed:TimeOut');
            const errorPackage = { serverData: { status: 'offline' } }
            return res.send(JSON.stringify(errorPackage))
        }
        logger.error('[SYNC IFRAME]', 'Request Failed:', error.message);
        handleBrowserCrash();
        return res.send(await error4img(bgPath, [`Error: ${error.message.replace(/[\n\r]/g, ' ')}`]));
    }
}

// 启动浏览器管理器
router.get('/', (req, res) => {
    addRequestToQueue(() => handleRequest(req, res)).catch(error => {
        logger.error('[SYNC IFRAME]', 'Queue Error:', error.message);
        const errorPackage = { serverData: { status: 'offline' } }
        res.status(500).send(JSON.stringify(errorPackage));
    });
});

module.exports = router;