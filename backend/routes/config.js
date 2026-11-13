const express = require('express');
const router = express.Router();
const configService = require('../services/configService');

/**
 * 前台配置（front.json）
 *
 * 之前是启动时读一次进内存，改了文件必须重启；现在交给 configService 热重载。
 */

function noStore(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
}

// GET /api/config —— 前台页面渲染用的配置
router.get('/', (req, res) => {
    noStore(res);
    res.json(configService.get('front'));
});

// GET /api/config/pic —— 图片模版配置（只读，用于文档/调试）
router.get('/pic', (req, res) => {
    noStore(res);
    res.json(configService.get('pic'));
});

// GET /api/config/server —— 运行时可公开的参数（前端展示/调试用）
router.get('/server', (req, res) => {
    noStore(res);
    const cfg = configService.get('config');
    res.json({
        javaDefaultPort: cfg.javaDefaultPort,
        bedrockDefaultPort: cfg.bedrockDefaultPort,
        queryTimeout: cfg.queryTimeout,
        bedrockTimeout: cfg.bedrockTimeout,
        autoJavaGraceMs: cfg.autoJavaGraceMs,
        caching: {
            enable: cfg.caching?.enable,
            ttl_seconds: cfg.caching?.ttl_seconds,
            negative_ttl_seconds: cfg.caching?.negative_ttl_seconds,
        },
        analytics: { enable: cfg.analytics?.enable },
        database: { driver: cfg.database?.driver },
    });
});

module.exports = router;
