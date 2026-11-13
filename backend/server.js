const express = require('express');
const cors = require('cors');
const path = require('path');

// 配置必须最先加载：它会从 example 复制缺失文件、补齐默认项、生成 token 密钥
const configService = require('./services/configService');
const config = configService.init();

const logger = require('./utils/logger');
const db = require('./db');
const analyticsService = require('./services/analyticsService');
const cacheService = require('./services/cacheService');

const statusRoute = require('./routes/status');
const statusImageRoute = require('./routes/status_img');
const configRoute = require('./routes/config');
const authRoute = require('./routes/auth');
const updateRoute = require('./routes/update');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = Number(config.serverPort) || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
// 反向代理后面部署时，req.ip 才能拿到真实客户端地址
app.set('trust proxy', true);

// --- API 路由 ---
app.use('/api/status', statusRoute);
app.use('/api/status_img', statusImageRoute);
app.use('/api/config', configRoute);
app.use('/api/login', authRoute);
app.use('/api/update', updateRoute);
app.use('/api/admin', adminRoutes);

// 未匹配的 /api 请求返回 JSON，不要掉进 SPA 的 index.html
app.use('/api', (req, res) => {
    res.status(404).json({ status: 'error', message: `接口不存在: ${req.method} ${req.originalUrl}` });
});

// --- 静态文件托管与 Vue Router 支持 ---
const distDir = path.join(__dirname, 'dist');
app.use(express.static(distDir));
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
});

// 统一错误处理，避免异常直接把进程掀翻
app.use((err, req, res, next) => {
    logger.error('[SERVER]', `未捕获的请求异常: ${err.message}`);
    if (res.headersSent) return next(err);
    res.status(500).json({ status: 'error', message: '服务器内部错误。' });
});

let server = null;

async function bootstrap() {
    // 初始化数据库 + 统计服务（内部会完成建表、旧库迁移、旧日志导入）
    await analyticsService.init();
    await cacheService.init();

    const info = await db.info().catch(() => null);
    if (info) {
        logger.info('[SERVER]', `数据库: ${info.driver} -> ${info.target}`);
    }

    server = app.listen(PORT, (err) => {
        if (err) {
            logger.error('[SERVER]', err);
            process.exit(1);
        }
        logger.info('[SERVER]', `后端服务器正在 http://localhost:${PORT} 上运行`);
    });
}

let shuttingDown = false;
async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('[SERVER]', `收到 ${signal}，正在关闭…`);
    try {
        if (server) {
            await new Promise(resolve => server.close(() => resolve()));
        }
        await analyticsService.shutdown();
        await db.close();
    } catch (e) {
        logger.warn('[SERVER]', `关闭时出错: ${e.message}`);
    }
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
    logger.error('[SERVER]', `未处理的 Promise 拒绝: ${reason && (reason.stack || reason.message || reason)}`);
});
process.on('uncaughtException', (err) => {
    logger.error('[SERVER]', `未捕获异常: ${err && (err.stack || err.message || err)}`);
});

bootstrap().catch((err) => {
    logger.error('[SERVER]', `启动失败: ${err.stack || err.message}`);
    process.exit(1);
});

module.exports = app;
