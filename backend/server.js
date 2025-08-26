const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const fs = require('fs');



// --- [核心改动] 配置文件自动创建逻辑 ---
const configPath = path.join(__dirname, 'config','config.json');
const frontPath = path.join(__dirname, 'config', 'front.json');
const picPath = path.join(__dirname, 'config','pic.json');

const exampleConfigPath = path.join(__dirname, 'example','config.example.json');
const exampleFrontPath = path.join(__dirname, 'example', 'front.example.json');
const examplPicPath = path.join(__dirname, 'example', 'pic.example.json');


function cehckConfig(cfgPath,examplePath) { 
  if(!fs.existsSync('./config')){
    fs.mkdirSync('./config');
  }
  if (!fs.existsSync(cfgPath)) {
    logger.warn('[CONFIG]', `未找到 ${cfgPath} 文件。`);
    // 如果不存在，则检查 config.example.json 是否存在
    if (fs.existsSync(examplePath)) {
      try {
        // 如果范例文件存在，则复制它来创建新的 config.json
        fs.copyFileSync(examplePath, cfgPath);
        logger.info('[CONFIG]', `已成功从${examplePath}  复制创建了新的 ${cfgPath} 文件。`);
      } catch (err) {
        logger.error('[CONFIG]', '从范例文件创建配置文件失败:', err);
        process.exit(1); // 发生错误，退出程序
      }
    } else {
      // 如果连范例文件都没有，程序无法运行
      logger.error('[CONFIG]', `严重错误: ${examplePath} 和 ${cfgPath} 均未找到。程序无法启动。`);
      process.exit(1);
    }
  }
}

cehckConfig(configPath,exampleConfigPath);
cehckConfig(frontPath,exampleFrontPath);
cehckConfig(picPath,examplPicPath);


const config = require('./config/config.json');

const analyticsService = require('./services/analyticsService');
// 初始化数据库
analyticsService.init();

const cacheService = require('./services/cacheService');
cacheService.init();




// 导入所有路由模块
const statusRoute = require('./routes/status');
const statusImageRoute = require('./routes/status_img'); // 导入新的图片路由
const configRoute = require('./routes/config');
const AuthRoute = require('./routes/auth');
const adminRoutes = require('./routes/admin');


const app = express();
const PORT = config.serverPort || 3000;

app.use(cors());
app.use(express.json());


// --- API 路由 ---
app.use('/api/status', statusRoute);
app.use('/api/status_img', statusImageRoute); // 挂载新的图片路由
app.use('/api/config', configRoute);
app.use('/api/login', AuthRoute);
app.use('/api/admin', adminRoutes); // 挂载 admin 路由

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