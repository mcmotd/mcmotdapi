const express = require('express');
const router = express.Router();
const path = require('path');
const { error4img } = require("../services/text4imgServices");
const { chromium } = require('playwright');
const PQueue = require('p-queue').default;
const logger = require('../utils/logger');
const bgPath = path.join(__dirname, '../', 'img', 'status_img.png');

const config = require('../config.json');
const PORT = config.serverPort || 3000;
const MAX_REQUESTS_BEFORE_RESTART = 100; // 每100次请求重启一次

// 增强的状态管理
let browser = null;
let requestCount = 0;
const browserState = {
    status: 'closed', // closed | opening | ready
    lock: false,
    lastActivity: Date.now()
};

// 请求队列增强
const requestQueue = new PQueue({
    concurrency: 5, // 降低并发数
    autoStart: false,
    timeout: 20000,
    throwOnTimeout: true,
    capacity: 20 // 限制队列长度
});

// 可靠的浏览器管理器
async function browserManager() {
    while (true) {
        try {
            // 状态检查
            if (browserState.status === 'closed' && !browserState.lock) {
                browserState.lock = true;
                browserState.status = 'opening';

                logger.info('[IFRAME]', 'Browser Launching new instance...');
                browser = await chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-background-networking',
                        '--js-flags="--expose-gc"',
                    ],
                    timeout: 30000
                });

                // 增强的事件监听
                browser.on('disconnected', () => {
                    logger.warn('[IFRAME]', 'Browser Emergency disconnect detected');
                    handleBrowserCrash();
                });

                browserState.status = 'ready';
                browserState.lastActivity = Date.now();
                requestQueue.start();
                logger.info('[IFRAME]', 'Browser Ready for requests');
            }

            // 定期健康检查
            if (browserState.status === 'ready' && Date.now() - browserState.lastActivity > 5000) {
                if (!browser || !browser.isConnected()) {
                    throw new Error('Health check failed');
                }
                browserState.lastActivity = Date.now();
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            logger.error('[IFRAME]', `Browser Manager error:${error}`);
            handleBrowserCrash();
        } finally {
            browserState.lock = false;
        }
    }
}

// 崩溃处理
function handleBrowserCrash() {
    if (browserState.status !== 'closed') {
        logger.info('[IFRAME]', 'Browser Initiating emergency shutdown');
        browserState.status = 'closed';
        requestQueue.pause();

        if (browser) {
            browser.close().catch(() => { });
            browser = null;
        }
    }
}

// 增强的请求处理器
async function handleRequest(req, res) {
    const queryParams = req.query;
    if (!queryParams.ip) {
        return res.status(400).send('Missing IP parameter');
    }

    requestCount++;
    if (requestCount >= MAX_REQUESTS_BEFORE_RESTART) {
        logger.info('[IFRAME]', `[Memory] Restarting browser after ${requestCount} requests`);
        handleBrowserCrash();
        requestCount = 0;
    }

    let context, page = null;

    res.setHeader('Content-Type', 'image/jpeg');

    try {
        // 等待浏览器就绪
        while (browserState.status !== 'ready') {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        browserState.lastActivity = Date.now();
        context = await browser.newContext({
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
            bypassCSP: true,
            // 限制资源
            offline: false,
            viewport: { width: 700, height: 365 },
            deviceScaleFactor: 1,
            isMobile: false,
            hasTouch: false,
            acceptDownloads: false
        });
        // 创建页面时禁用不必要的功能
        page = await context.newPage();
        await page.setDefaultNavigationTimeout(15000);
        await page.setDefaultTimeout(10000);

        const url = `http://127.0.0.1:${PORT}/iframe?${new URLSearchParams(queryParams).toString()}`;

        const response = await page.goto(url, {
            waitUntil: 'networkidle',
            timeout: 15000
        }).catch(e => {
            if (!response || !response.ok()) {
                throw new Error(`Page load failed: ${e.message}`);
            }
        });


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

        const screenshot = await page.screenshot({ 
            type: 'png',
            fullPage: true,
            omitBackground: false,
            captureBeyondViewport: false
        });

        return res.send(screenshot);
    }
    catch (error) {
        logger.error('[IFRAME]', 'Request Failed:', error.message);
        handleBrowserCrash();
        return res.send(await error4img(bgPath, [`Error: ${error.message.replace(/[\n\r]/g, ' ')}`]));
    }
    finally {
        try {
            if (page && !page.isClosed()) {
                await page.evaluate(() => {
                    // 强制清理 JS 堆
                    if (window.gc){
                        window.gc();
                    } 
                }).catch(() => { });
                await page.close();
            }
            if (context) {
                await context.close();
            }
            // 强制清除引用
            page = null;
            context = null;
        } catch (cleanupError) {
            logger.error('[IFRAME]', `Cleanup Error:${cleanupError}`);
        }
        browserState.lastActivity = Date.now();

        if (global.gc && Math.random() < 0.05) {
            global.gc();
        }
    }
}

// 启动管理线程
browserManager();

// 定期重启浏览器
setInterval(() => {
    if (browser && browserState.status === 'ready') {
        const uptime = Date.now() - browserState.lastActivity;
        if (uptime > 3600000) { // 1小时重启一次
            logger.info('[IFRAME]', 'Browser Scheduled restart');
            handleBrowserCrash();
        }
    }
}, 60 * 1000); // 每分钟检查一次

setInterval(() => {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 200 * 1024 * 1024) { // 超过200MB
        logger.info('[IFRAME]', 'Memory High usage detected, restarting browser');
        handleBrowserCrash();
    }
}, 30 * 1000);

// 路由配置
router.get('/', (req, res) => {
    if (requestQueue.size >= 20) {
        return res.status(503).send("Server busy, try again later");
    }
    requestQueue.add(() => handleRequest(req, res))
        .catch(error => {
            logger.info('[IFRAME]', 'Queue Error:', error);
            res.status(500).send('Internal server error');
        });
});

module.exports = router;