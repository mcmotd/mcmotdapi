const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config.json');
const logger = require('./utils/logger');

// 导入所有路由模块
const statusRoute = require('./routes/status');
const statusImageRoute = require('./routes/status_img'); // 导入新的图片路由
const iframeImageRoute = require('./routes/iframe_img');

const app = express();
const PORT = config.serverPort || 3000;

app.use(cors());

// --- API 路由 ---
app.use('/api/status', statusRoute);
app.use('/api/status_img', statusImageRoute); // 挂载新的图片路由
app.use('/api/iframe_img',iframeImageRoute)

// --- 静态文件托管与Vue Router支持 ---
app.use(express.static(path.join(__dirname, 'dist')));
app.get('/', (req, res) => { // 使用 '*' 捕获所有未匹配的路由，包括 / 和 /iframe
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
app.get('/iframe', (req, res) => { // 使用 '*' 捕获所有未匹配的路由，包括 / 和 /iframe
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