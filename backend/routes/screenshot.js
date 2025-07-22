const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../../', 'screenshots');;
const { deleteScreenshot } = require('../utils/screenshotManager');


router.get('/', async (req, res) => {
    const fileName = req.query.file;

    res.setHeader('Content-Type', 'image/png');

    if(!fs.existsSync(path.join(SCREENSHOT_DIR, fileName))){
        return res.status(404).send('File not found');
    }

    res.sendFile(path.join(SCREENSHOT_DIR, fileName));
    setTimeout(() => {
        deleteScreenshot(fileName);
    }, 1000 * 3);
});

module.exports = router;