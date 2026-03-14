const express = require('express');

const router = express.Router();
const { cleanupExpiredFiles, readTemporaryImage } = require('../services/appImageStorage');

router.get('/', (req, res) => {
    cleanupExpiredFiles();

    const result = readTemporaryImage(req.query.file);
    if (!result) {
        return res.status(404).json({
            status: 'error',
            message: '图片不存在或已过期'
        });
    }

    res.setHeader('Content-Type', 'image/png');
    return res.send(result.buffer);
});

module.exports = router;
