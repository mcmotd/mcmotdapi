const express = require('express');
const cors = require('cors');
const config = require('./config.json');

const PingMCServer = require("./java").fetch;
const pingBedrock = require('mcpe-ping');

const app = express();
const PORT = config.serverPort || 3000;

app.use(cors());

function pingBedrockPromise(ip, port) {
  return new Promise((resolve, reject) => {
    pingBedrock(ip, port, (err, res) => {
      if (err) return reject(err);
      resolve(res);
    }, config.queryTimeout);
  });
}

// 统一的智能查询API端点
app.get('/api/status', async (req, res) => {
  const { ip, port } = req.query;

  if (!ip) {
    return res.status(400).json({ error: '必须提供服务器IP地址 (ip)。' });
  }

  const now = Date.now();
  const javaPort = port ? parseInt(port, 10) : config.javaDefaultPort;
  const bedrockPort = port ? parseInt(port, 10) : config.bedrockDefaultPort;

  // 1. [核心改动] 创建两个独立的查询Promise，并在成功后附加类型信息
  const javaPromise = PingMCServer(ip, javaPort)
    .then(response => ({ type: 'Java', data: response })); // 成功时，将结果包装在带有类型的对象中

  const bedrockPromise = pingBedrockPromise(ip, bedrockPort)
    .then(response => ({ type: 'Bedrock', data: response })); // 同上

  try {
    // 2. [核心改动] 使用 Promise.any() 同时执行两个查询，并等待第一个成功的结果
    const result = await Promise.any([javaPromise, bedrockPromise]);

    let formattedResponse;

    // 3. 根据成功返回的类型来格式化数据
    if (result.type === 'Java') {
      const { data } = result;
      const playersSample = data.players.sample?.map(p => p.name).join(', ') || '无';
      formattedResponse = {
        type: 'Java',
        status: 'online',
        //host: data.srvRecord ? `${data.srvRecord.host}:${data.srvRecord.port}` : `${data.host}:${data.port}`,
        host: `${ip}:${javaPort}`,
        motd: data.description,
        //motd_html: data.motd.html,
        version: data.version.name,
        protocol: data.version.protocol,
        players: { online: data.players.online, max: data.players.max, sample: playersSample },
        mod_info:data.modinfo,
        icon: data.favicon,
        delay: Date.now() - now,
      };
      console.log(data.players.sample)
      //console.log( data.mod_info.modList.join(','))
    } else { // result.type === 'Bedrock'
      const { data } = result;
      formattedResponse = {
        type: 'Bedrock',
        status: 'online',
        host: `${ip}:${bedrockPort}`,
        motd: data.name,
        version: data.version,
        players: { online: data.currentPlayers, max: data.maxPlayers },
        gamemode: data.gameMode,
        delay: Date.now() - now,
        protocol:  data.advertise.split(';')[2]
      };
    }
    
    return res.json(formattedResponse);

  } catch (error) {
    // 4. [核心改动] 只有当所有Promise都失败时，Promise.any()才会抛出错误
    console.error(`JE和BE查询均失败: ${ip}`, error);
    return res.status(404).json({ 
      status: 'offline',
      error: '无法连接到服务器，它可能已离线或地址/端口不正确。' 
    });
  }
});

const path = require('path');
console.log(path.join(__dirname, 'dist'))
// 托管 Vue 打包后的静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 所有未匹配的 GET 请求都返回 index.html（支持 Vue Router 的 history 模式）
app.get('/', (req, res) => {
  console.log(req.baseUrl)
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.get('/iframe', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`后端服务器正在 http://localhost:${PORT} 上运行`);
});