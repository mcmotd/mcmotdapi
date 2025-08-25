const { chromium } = require('playwright');
const PQueue = require('p-queue').default;
const logger = require('./logger');
const config = require('../config.json');

const PORT = config.serverPort || 3000;

const MAX_REQUESTS_BEFORE_RESTART = 50; // 每50次请求重启一次，减少内存占用
const MAX_QUEUE_SIZE = 10; // 降低队列大小

let browser = null;
let requestCount = 0;

const browserState = {
    status: 'closed', // closed | opening | ready
    lock: false,
    lastActivity: Date.now()
};

// 请求队列增强
const requestQueue = new PQueue({
    concurrency: 3, // 降低并发数以减少资源占用
    autoStart: false,
    timeout: 15000,
    throwOnTimeout: true,
    capacity: MAX_QUEUE_SIZE
});

// 可靠的浏览器管理器
async function startBrowserManager() {
    logger.info('[BrowserManager]', 'Starting background browser manager');

    async function launchBrowser() {
        if (browserState.lock || browserState.status === 'opening') return;

        browserState.lock = true;
        browserState.status = 'opening';

        try {
            logger.info('[BrowserManager]', 'Launching new browser instance...');
            browser = await chromium.launch({
                headless: true,
                args: [

                ],
                timeout: 20000
            });

            browser.on('disconnected', () => {
                logger.warn('[BrowserManager]', 'Browser Emergency disconnect detected');
                handleBrowserCrash();
            });

            browserState.status = 'ready';
            browserState.lastActivity = Date.now();
            requestQueue.start();
            logger.info('[BrowserManager]', 'Browser is ready for requests');
        } catch (error) {
            logger.error('[BrowserManager]', `Failed to launch browser: ${error.message}`);
            handleBrowserCrash();
        } finally {
            browserState.lock = false;
        }
    }

    // 健康检查
    async function healthCheck() {
        try {
            if (browserState.status === 'ready') {
                if (!browser || !browser.isConnected()) {
                    throw new Error('Browser is not connected');
                }
                browserState.lastActivity = Date.now();
            }
        } catch (e) {
            logger.warn('[BrowserManager]', 'Browser health check failed:', e.message);
            handleBrowserCrash();
        }
    }

    // 定期检查
    setInterval(async () => {
        await healthCheck();

        // 每30分钟重启一次（降低频率）
        const uptime = Date.now() - browserState.lastActivity;
        if (browserState.status === 'ready' && uptime > 1800000) {
            logger.info('[BrowserManager]', 'Browser Scheduled restart (30min)');
            handleBrowserCrash();
        }
    }, 60 * 1000);

    // 内存检查
    setInterval(() => {
        const memoryUsage = process.memoryUsage();
        if (memoryUsage.heapUsed > 150 * 1024 * 1024) { // 降低内存阈值
            logger.info('[BrowserManager]', 'Memory High usage detected, restarting browser');
            handleBrowserCrash();
        }
    }, 30 * 1000);

    // 启动浏览器管理器
    async function browserManager() {
        while (true) {
            try {
                if (browserState.status === 'closed' && !browserState.lock) {
                    await launchBrowser();
                }

                if (browserState.status === 'ready' && Date.now() - browserState.lastActivity > 5000) {
                    await healthCheck();
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                logger.error('[BrowserManager]', `Error: ${error.message}`);
                handleBrowserCrash();
            }
        }
    }

    // 启动后台管理线程
    browserManager();
}

// 崩溃处理
function handleBrowserCrash() {
    if (browserState.status !== 'closed') {
        logger.info('[BrowserManager]', 'Browser Initiating emergency shutdown');
        browserState.status = 'closed';
        requestQueue.pause();

        if (browser) {
            browser.close().catch(() => { });
            browser = null;
        }
    }
}

// 提供一个方法获取浏览器实例
async function getBrowser() {
    while (browserState.status !== 'ready') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    browserState.lastActivity = Date.now();
    return browser;
}

// 获取浏览器上下文
async function getContext() { 
    const browser = await getBrowser();
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        javaScriptEnabled: true,
        bypassCSP: true,
        // 限制资源
        offline: false,
        viewport: { width: 700, height: 50 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        acceptDownloads: false,
        // 禁用一些不必要的功能以提高性能
        permissions: []
    });
    
    return context
}

// 提供一个方法添加请求队列
function addRequestToQueue(handler) {
    if (requestQueue.size >= MAX_QUEUE_SIZE) {
        logger.warn('[BrowserManager]', 'Request queue is full');
        return Promise.reject(new Error('Request queue is full'));
    }

    return requestQueue.add(async () => {
        requestCount++;
        if (requestCount >= MAX_REQUESTS_BEFORE_RESTART) {
            logger.info('[BrowserManager]', `[Memory] Restarting browser after ${requestCount} requests`);
            handleBrowserCrash();
            requestCount = 0;
        }

        return handler();
    });
}

// 提供一个方法重启浏览器
function restartBrowser() {
    logger.info('[BrowserManager]', 'Manual browser restart requested');
    handleBrowserCrash();
}

module.exports = {
    startBrowserManager,
    getBrowser,
    getContext,
    addRequestToQueue,
    restartBrowser,
    handleBrowserCrash
};