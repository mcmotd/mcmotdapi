const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const config = require('../config/config.json');
const logger = require('../utils/logger');

const DEFAULT_TEMP_DIR = './data/appImage-temp';
const DEFAULT_TTL_SECONDS = 300;

function ensureDirectoryExists(dirPath) {
    const resolvedPath = path.resolve(dirPath);
    const parsed = path.parse(resolvedPath);
    const segments = resolvedPath
        .slice(parsed.root.length)
        .split(path.sep)
        .filter(Boolean);

    let currentPath = parsed.root;
    if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath);
    }

    segments.forEach(segment => {
        currentPath = path.join(currentPath, segment);
        if (!fs.existsSync(currentPath)) {
            try {
                fs.mkdirSync(currentPath);
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    });
}

function getAppImageConfig() {
    const appImageConfig = config.appImage || {};
    const tempDir = path.isAbsolute(appImageConfig.tempDir || '')
        ? appImageConfig.tempDir
        : path.join(__dirname, '..', appImageConfig.tempDir || DEFAULT_TEMP_DIR);

    return {
        width: appImageConfig.width || 700,
        height: appImageConfig.height || 1000,
        ttlSeconds: appImageConfig.ttlSeconds || DEFAULT_TTL_SECONDS,
        tempDir
    };
}

function ensureTempDir() {
    const { tempDir } = getAppImageConfig();
    ensureDirectoryExists(tempDir);
    return tempDir;
}

function isValidFileName(fileName) {
    return typeof fileName === 'string' && /^[a-f0-9]{24}\.png$/i.test(fileName);
}

function getFilePaths(fileName) {
    const tempDir = ensureTempDir();
    return {
        imagePath: path.join(tempDir, fileName),
        metadataPath: path.join(tempDir, fileName.replace(/\.png$/i, '.json'))
    };
}

function safeUnlink(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        logger.warn('[APP_IMAGE]', `删除临时文件失败: ${filePath}`, error.message);
    }
}

function deleteStoredImage(fileName) {
    if (!isValidFileName(fileName)) {
        return;
    }

    const { imagePath, metadataPath } = getFilePaths(fileName);
    safeUnlink(imagePath);
    safeUnlink(metadataPath);
}

function cleanupExpiredFiles() {
    const tempDir = ensureTempDir();
    const now = Date.now();
    const files = fs.readdirSync(tempDir);

    files
        .filter(file => file.endsWith('.json'))
        .forEach(file => {
            const metadataPath = path.join(tempDir, file);
            try {
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                if (!metadata.expireAt || metadata.expireAt <= now) {
                    deleteStoredImage(metadata.file || file.replace(/\.json$/i, '.png'));
                }
            } catch (error) {
                logger.warn('[APP_IMAGE]', `清理损坏元数据失败: ${file}`, error.message);
                deleteStoredImage(file.replace(/\.json$/i, '.png'));
            }
        });
}

function saveTemporaryImage(buffer, serverData) {
    cleanupExpiredFiles();

    const file = `${crypto.randomBytes(12).toString('hex')}.png`;
    const { ttlSeconds } = getAppImageConfig();
    const createdAt = Date.now();
    const expireAt = createdAt + ttlSeconds * 1000;
    const { imagePath, metadataPath } = getFilePaths(file);

    fs.writeFileSync(imagePath, buffer);
    fs.writeFileSync(metadataPath, JSON.stringify({
        file,
        createdAt,
        expireAt,
        serverData
    }, null, 2));

    return { file, createdAt, expireAt };
}

function readTemporaryImage(fileName) {
    cleanupExpiredFiles();

    if (!isValidFileName(fileName)) {
        return null;
    }

    const { imagePath, metadataPath } = getFilePaths(fileName);
    if (!fs.existsSync(imagePath) || !fs.existsSync(metadataPath)) {
        return null;
    }

    try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        if (!metadata.expireAt || metadata.expireAt <= Date.now()) {
            deleteStoredImage(fileName);
            return null;
        }

        return {
            metadata,
            buffer: fs.readFileSync(imagePath)
        };
    } catch (error) {
        logger.warn('[APP_IMAGE]', `读取临时图片失败: ${fileName}`, error.message);
        deleteStoredImage(fileName);
        return null;
    }
}

module.exports = {
    cleanupExpiredFiles,
    deleteStoredImage,
    ensureTempDir,
    getAppImageConfig,
    readTemporaryImage,
    saveTemporaryImage
};
