// utils/browserManager.js
const { chromium } = require('playwright');
const PQueue = require('p-queue').default;
const logger = require('./logger');
const config = require('../config.json');

const MAX_REQUESTS_BEFORE_RESTART = 200; // 提高重启阈值
const MAX_QUEUE_SIZE = 50;

let browser = null;
let sharedContext = null;
let requestCount = 0;

const browserState = {
    status: 'closed', // closed | opening | ready
    lock: false,
    lastActivity: Date.now()
};

const requestQueue = new PQueue({
    concurrency: 8,
    autoStart: false,
    timeout: 15000,
    throwOnTimeout: true,
    capacity: MAX_QUEUE_SIZE
});

// 启动浏览器
async function launchBrowser() {
    if (browserState.lock || browserState.status === 'opening') return;

    browserState.lock = true;
    browserState.status = 'opening';

    try {
        logger.info('[BrowserManager]', 'Launching Chromium...');
        browser = await chromium.launch({
            headless: true,
            args: ['--disable-dev-shm-usage']
        });

        browser.on('disconnected', () => {
            logger.warn('[BrowserManager]', 'Browser disconnected');
            handleBrowserCrash();
        });

        // 只创建一次共享 context
        sharedContext = await browser.newContext({
            ignoreHTTPSErrors: true,
            javaScriptEnabled: true,
            viewport: { width: 700, height: 1000 }
        });

        browserState.status = 'ready';
        browserState.lastActivity = Date.now();
        requestQueue.start();
        logger.info('[BrowserManager]', 'Browser ready');
    } catch (e) {
        logger.error('[BrowserManager]', `Launch failed: ${e.message}`);
        handleBrowserCrash();
    } finally {
        browserState.lock = false;
    }
}

// 崩溃处理
function handleBrowserCrash() {
    if (browserState.status !== 'closed') {
        logger.info('[BrowserManager]', 'Shutting down browser');
        browserState.status = 'closed';
        requestQueue.pause();
        if (browser) {
            browser.close().catch(() => { });
            browser = null;
            sharedContext = null;
        }
    }
}

async function getContext() {
    while (browserState.status !== 'ready') {
        await new Promise(r => setTimeout(r, 100));
    }
    browserState.lastActivity = Date.now();
    return sharedContext;
}

function addRequestToQueue(handler) {
    if (requestQueue.size >= MAX_QUEUE_SIZE) {
        return Promise.reject(new Error('Request queue full'));
    }

    return requestQueue.add(async () => {
        requestCount++;
        if (requestCount >= MAX_REQUESTS_BEFORE_RESTART) {
            logger.info('[BrowserManager]', `Restart after ${requestCount} requests`);
            handleBrowserCrash();
            requestCount = 0;
        }
        return handler();
    });
}

function startBrowserManager() {
    (async () => {
        while (true) {
            if (browserState.status === 'closed' && !browserState.lock) {
                await launchBrowser();
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    })();
}

module.exports = {
    startBrowserManager,
    getContext,
    addRequestToQueue,
    handleBrowserCrash
};
