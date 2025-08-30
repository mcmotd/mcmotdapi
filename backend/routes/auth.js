const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// --- [核心修改 1] 在服务器启动时，一次性加载配置文件 ---
let adminConfig;
try {
    const configPath = path.join(__dirname, '../', 'config', 'config.json');
    const data = fs.readFileSync(configPath, 'utf8');
    adminConfig = JSON.parse(data);
    console.log('管理员配置文件 (config.json) 加载成功。');
} catch (err) {
    console.error('致命错误: 无法加载或解析 config.json。应用无法启动。', err);
    // 如果配置文件是应用启动的必要条件，则直接退出进程
    process.exit(1);
}

// POST /login
router.post('/', (req, res) => {
    const { username, password } = req.body;

    // 1. 验证前端输入
    if (!username || !password) {
        return res.json({
            code: 400, // Bad Request
            success: false,
            error: '请输入用户名和密码。'
        });
    }

    try {
        const admins = adminConfig.admins;

        // 2. 检查配置格式是否正确
        if (!Array.isArray(admins)) {
            console.error('config.json 格式错误: "admins" 字段不是一个数组。');
            return res.json({
                code: 500, // Internal Server Error
                success: false,
                error: '服务器凭据配置格式不正确。'
            });
        }

        // 3. 在账户列表中查找匹配的用户
        const userFound = admins.find(user => user.username === username);

        if (!userFound) {
            return res.json({
                code: 401, // Unauthorized
                success: false,
                error: '用户名或密码错误。'
            });
        }

        // 4. 检查该用户是否仍在使用默认密码
        const defaultPasswordMD5 = '5f4dcc3b5aa765d61d8327deb882cf99'; // "password"的MD5值
        if (userFound.password === defaultPasswordMD5) {
            return res.json({
                code: 403, // Forbidden
                success: false,
                error: '禁止使用默认密码登录，请修改您的密码。'
            });
        }

        // 5. 比对密码哈希值
        if (password === userFound.password) {
            // 登录成功
            return res.json({
                code: 200, // OK
                success: true,
                message: `欢迎回来, ${userFound.username}!`
            });
        } else {
            // 密码不匹配
            return res.json({
                code: 401, // Unauthorized
                success: false,
                error: '用户名或密码错误。'
            });
        }

    } catch (e) {
        console.error('登录流程中发生内部错误:', e);
        return res.json({
            code: 500, // Internal Server Error
            success: false,
            error: '服务器内部错误。'
        });
    }
});

module.exports = router;
