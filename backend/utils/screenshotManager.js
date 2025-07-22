const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SCREENSHOT_DIR = path.join(__dirname, '../../', 'screenshots');;
const EXPIRE_TIME = 60 * 1000; // 1分钟

// 清空截图目录
function clearScreenshotDir() {
    if (fs.existsSync(SCREENSHOT_DIR)) {
        const files = fs.readdirSync(SCREENSHOT_DIR);
        files.forEach(file => {
            const filePath = path.join(SCREENSHOT_DIR, file);
            fs.unlinkSync(filePath);
        });
    } else {
        fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    logger.info('[ScreenshotManager]', 'Screenshots directory cleared on startup');
}

// 设置截图并返回 URL 和过期时间
function setScreenshot(filename, buffer) {
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    const expireAt = Date.now() + EXPIRE_TIME;

    //logger.info(`[ScreenshotManager] Screenshot saved: ${filename} (expires at ${new Date(expireAt)})`);

    return { filename, expireAt };
}

// 定时清理过期截图
function startCleanupTask() {
    setInterval(() => {
        const now = Date.now();
        const files = fs.readdirSync(SCREENSHOT_DIR);

        files.forEach(file => {
            const filePath = path.join(SCREENSHOT_DIR, file);
            const stats = fs.statSync(filePath);
            const expireAt = stats.mtimeMs + EXPIRE_TIME;

            if (now > expireAt) {
                //logger.info(`[ScreenshotManager] Deleting expired screenshot: ${file}`);
                fs.unlinkSync(filePath);
            }
        });
    }, 30 * 1000); // 每30秒检查一次
}

// 启动时清空目录
clearScreenshotDir();
startCleanupTask();

module.exports = {
    setScreenshot
};