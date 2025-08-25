const express = require('express');
const router = express.Router();
const { getStats } = require('../services/analyticsService');

// 在这里可以添加您的管理员身份验证中间件

router.get('/stats', async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json({ error: '无法获取统计数据。' });
    }
});

module.exports = router;