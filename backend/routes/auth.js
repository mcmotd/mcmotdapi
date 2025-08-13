const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// POST /login
router.post('/', (req, res) => {
    const { username, password } = req.body;

    // 1. 验证前端输入
    if (!username || !password) {
        return res.status(400).json({ success: false, error: '请输入用户名和密码。' });
    }

    // 2. 读取管理员配置文件
    const configPath = path.join(__dirname, '../', 'config', 'config.json');
    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) {
            console.error('读取 config.json 文件失败:', err);
            return res.status(500).json({ success: false, error: '无法加载服务器凭据配置。' });
        }

        try {
            const config = JSON.parse(data);
            const adminUser = config.admin;

            if (!adminUser || !adminUser.username || !adminUser.password) {
                return res.status(500).json({ success: false, error: '服务器凭据配置格式不正确。' });
            }

            // 3. 检查是否为默认密码
            const defaultPasswordMD5 = '5f4dcc3b5aa765d61d8327deb882cf99'; // "password"的MD5值
            if (adminUser.password === defaultPasswordMD5) {
                // 如果配置文件中的密码是默认密码，则禁止登录
                return res.status(403).json({ success: false, error: '禁止使用默认密码登录，请修改后端 config.json 文件中的密码。' });
            }

            // 4. 比对凭据
            const isUsernameMatch = username === adminUser.username;
            const isPasswordMatch = password === adminUser.password;

            if (isUsernameMatch && isPasswordMatch) {
                // 登录成功
                // 在实际应用中，这里应该生成一个 session 或 JWT token
                res.json({ success: true, message: '登录成功' });
            } else {
                // 登录失败
                res.status(401).json({ success: false, error: '用户名或密码错误。' });
            }

        } catch (parseErr) {
            console.error('解析 config.json 文件失败:', parseErr);
            return res.status(500).json({ success: false, error: '服务器凭据配置文件格式错误。' });
        }
    });
});

// 如果您将所有API路由都放在一个文件中，可以像这样导出
module.exports = router;