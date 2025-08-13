const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// --- 1. 启动时加载配置 ---

// 构造配置文件的绝对路径
const configPath = path.join(__dirname, '../', 'config', 'front.json');

// 使用一个变量来在内存中存储配置
let serverConfig = {};

// 同步读取函数，在应用启动时加载配置
const loadConfig = () => {
    try {
        const data = fs.readFileSync(configPath, 'utf8');
        serverConfig = JSON.parse(data);
        console.log('配置文件 front.json 加载成功。');
    } catch (err) {
        console.error('加载 front.json 失败! 请检查文件是否存在或格式是否正确。', err);
        // 在关键配置加载失败时，可以选择退出进程以避免应用以错误状态运行
        process.exit(1);
    }
};

// 立即执行加载
loadConfig();


// --- 2. 路由处理 ---

// GET / : 直接从内存返回配置，响应速度极快
router.get('/', (req, res) => {
    res.json(serverConfig);
});

// POST /update : 修改配置中的单项值
// router.post('/update', (req, res) => {
//     const { key, value } = req.body;

//     // 基础验证
//     if (typeof key !== 'string' || key.trim() === '') {
//         return res.status(400).json({ error: '必须提供有效的 "key" (字符串类型)。' });
//     }
//     if (value === undefined) {
//         return res.status(400).json({ error: '必须提供 "value"。' });
//     }

//     // 使用辅助函数来设置嵌套值
//     const setNestedValue = (obj, path, val) => {
//         const keys = path.split('.');
//         const lastKey = keys.pop();
//         const lastObj = keys.reduce((o, k) => o[k] = o[k] || {}, obj);
//         lastObj[lastKey] = val;
//     };

//     try {
//         // 更新内存中的配置
//         setNestedValue(serverConfig, key, value);

//         // 将更新后的配置写回文件（美化格式以便阅读）
//         fs.writeFile(configPath, JSON.stringify(serverConfig, null, 4), 'utf8', (err) => {
//             if (err) {
//                 console.error('写入 front.json 文件失败:', err);
//                 // 如果写入失败，恢复内存中的配置到修改前的状态（可选，但更安全）
//                 loadConfig();
//                 return res.status(500).json({ error: '配置更新失败，无法保存到文件。' });
//             }

//             console.log(`配置项 "${key}" 已更新。`);
//             res.json({ success: true, message: `配置项 "${key}" 已成功更新。` });
//         });
//     } catch (e) {
//         console.error('更新配置时发生错误:', e);
//         res.status(500).json({ error: '更新配置时服务器内部发生错误。' });
//     }
// });

module.exports = router;