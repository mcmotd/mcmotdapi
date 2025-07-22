const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const fs = require('fs');


// --- [核心改动] 配置文件自动创建逻辑 ---
const configPath = path.join(__dirname, 'config.json');
const exampleConfigPath = path.join(__dirname, 'config.example.json');

// 检查 config.json 是否存在
if (!fs.existsSync(configPath)) {
  logger.warn('[CONFIG]', '未找到 config.json 文件。');
  // 如果不存在，则检查 config.example.json 是否存在
  if (fs.existsSync(exampleConfigPath)) {
    try {
      // 如果范例文件存在，则复制它来创建新的 config.json
      fs.copyFileSync(exampleConfigPath, configPath);
      logger.info('[CONFIG]', '已成功从 config.example.json 复制创建了新的 config.json 文件。');
    } catch (err) {
      logger.error('[CONFIG]', '从范例文件创建配置文件失败:', err);
      process.exit(1); // 发生错误，退出程序
    }
  } else {
    // 如果连范例文件都没有，程序无法运行
    logger.error('[CONFIG]', '严重错误: config.json 和 config.example.json 均未找到。程序无法启动。');
    process.exit(1);
  }
}
const config = require('./config.json');

const { startBrowserManager } = require('./utils/browserManager');
// 启动浏览器管理器
startBrowserManager();


// 导入所有路由模块
const statusRoute = require('./routes/status');
const statusImageRoute = require('./routes/status_img'); // 导入新的图片路由
const iframeImageRoute = require('./routes/iframe_img');
const syncIframeImageRoute = require('./routes/sync_iframe_img');
const screenshotRoute = require('./routes/screenshot');

const app = express();
const PORT = config.serverPort || 3000;

app.use(cors());

// --- API 路由 ---
app.use('/api/status', statusRoute);
app.use('/api/status_img', statusImageRoute); // 挂载新的图片路由
app.use('/api/iframe_img',iframeImageRoute)
app.use('/api/sync_iframe_img',syncIframeImageRoute);
app.use('/api/screenshot', screenshotRoute);

// --- 静态文件托管与Vue Router支持 ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/(.*)/, (req, res) => { // 使用 '*' 捕获所有未匹配的路由，包括 / 和 /iframe
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- 启动服务器 ---
app.listen(PORT, (err) => {
  if (err) {
    logger.error('[SERVER]', err);
  } else {
    logger.info('[SERVER]', `后端服务器正在 http://localhost:${PORT} 上运行`);
  }
});