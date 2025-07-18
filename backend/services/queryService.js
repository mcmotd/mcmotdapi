const config = require('../config.json');
const PingMCServer = require("../java").fetch;
const pingBedrock = require('mcpe-ping');

// 将 mcpe-ping 包装成 Promise
function pingBedrockPromise(ip, port) {
    return new Promise((resolve, reject) => {
        pingBedrock(ip, port, (err, res) => {
            if (err) return reject(err);
            resolve(res);
        }, config.queryTimeout);
    });
}

/**
 * 核心查询函数，可被任何路由复用
 * @param {string} ip 服务器IP
 * @param {string|number} port 端口号 (可选)
 * @returns {Promise<object>} 返回包含服务器状态的Promise对象
 */
async function queryServerStatus(ip, port) {
    const now = Date.now();
    const javaPort = port ? parseInt(port, 10) : config.javaDefaultPort;
    const bedrockPort = port ? parseInt(port, 10) : config.bedrockDefaultPort;

    // 创建两个并行的查询Promise
    const javaPromise = PingMCServer(ip, javaPort)
        .then(response => ({ type: 'Java', data: response }));

    const bedrockPromise = pingBedrockPromise(ip, bedrockPort)
        .then(response => ({ type: 'Bedrock', data: response }));

    // 使用 Promise.any() 获取第一个成功的结果
    const result = await Promise.any([javaPromise, bedrockPromise]);

    // 根据结果类型，格式化并返回标准化的数据对象
    if (result.type === 'Java') {
        const { data } = result;
        const playersSample = data.players.sample?.map(p => p.name).join(', ') || '无';
        return {
            type: 'Java',
            status: 'online',
            host: `${ip}:${javaPort}`,
            motd: data.description,
            version: data.version.name,
            protocol: data.version.protocol,
            players: { online: data.players.online, max: data.players.max, sample: playersSample },
            mod_info: data.modinfo,
            icon: data.favicon,
            delay: Date.now() - now,
        };
    } else { // result.type === 'Bedrock'
        const { data } = result;
        return {
            type: 'Bedrock',
            status: 'online',
            host: `${ip}:${bedrockPort}`,
            motd: data.name,
            version: data.version,
            players: { online: data.currentPlayers, max: data.maxPlayers },
            gamemode: data.gameMode,
            delay: Date.now() - now,
            protocol: data.advertise.split(';')[2]
        };
    }
}

// 导出这个核心函数
module.exports = { queryServerStatus };