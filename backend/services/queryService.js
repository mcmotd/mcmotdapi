const config = require('../config.json');
const PingMCServer = require("../utils/java").fetch;
const pingBedrock = require('../utils/bedrock');
const Logger = require('../utils/logger');


// 将 mcpe-ping 包装成 Promise
function pingBedrockPromise(ip, port) {
    return new Promise((resolve, reject) => {
        pingBedrock(ip, port, 
            (err, res) => {
                if (err) {
                    return reject(err);
                }
                resolve(res);
            },
            config.queryTimeout,
            //true //FullQuery
        );
    });
}

/**
 * 一个通用的MOTD转换函数，可以将任何格式的MOTD（字符串或JSON对象）转换为纯文本字符串。
 * 它会递归地解析JSON结构并剥离所有§格式化代码。
 *
 * @param {string|object} motd - 从服务器API获取的原始MOTD数据。
 * @returns {string} - 清理过的、不包含任何格式信息的纯文本字符串。
 */
function motdToPlainText(motd) {
    // 1. 处理无效输入
    if (!motd) {
        return '';
    }

    // 2. 如果输入已经是纯字符串，直接剥离§代码
    if (typeof motd === 'string') {
        return motd.replace(/§[0-9a-fk-or]/g, '');
    }

    // 3. 如果输入是JSON对象，则进行递归解析
    if (typeof motd === 'object' && motd !== null) {
        let plainText = '';

        // 递归函数，用于遍历JSON组件
        function parseComponent(component) {
            // 如果组件本身就是字符串，直接添加
            if (typeof component === 'string') {
                plainText += component;
                return;
            }

            // 如果组件有 'text' 属性，添加其内容
            if (component && component.text) {
                plainText += component.text;
            }

            // 如果组件有 'extra' 数组，递归遍历其中的每一个子组件
            if (component && Array.isArray(component.extra)) {
                component.extra.forEach(extraComponent => parseComponent(extraComponent));
            }
        }

        // 从根MOTD对象开始解析
        parseComponent(motd);

        // 4. 对拼接后的完整字符串，最后再进行一次§代码剥离，以处理混合格式
        return plainText.replace(/§[0-9a-fk-or]/g, '');
    }

    // 5. 对于其他意外的输入类型，返回空字符串
    return '';
}

/**
 * 核心查询函数，可被任何路由复用
 * @param {string} ip 服务器IP
 * @param {string|number} port 端口号 (可选)
 * @returns {Promise<object>} 返回包含服务器状态的Promise对象
 */
const dns = require('dns').promises; // 1. 引入 dns 模块的 promise 版本
// 假设 PingMCServer, pingBedrockPromise, motdToPlainText 等函数已正确引入

async function queryServerStatus(ip, port, iconUrl, serverType = 'auto', isSRV = false) {
    const now = Date.now();

    // 初始目标地址和端口
    let targetHost = ip;
    let targetPort = port;

    // --- 步骤 1: SRV 记录解析 (如果 isSRV 为 true) ---
    // SRV 记录强制只查询 Java 服务器
    if (isSRV) {
        serverType = 'je'; // 强制 serverType 为 'je'
        const srvAddress = `_minecraft._tcp.${ip}`;
        try {
            Logger.info('[SRV]',`解析: ${srvAddress}`);
            const records = await dns.resolveSrv(srvAddress);
            if (records.length > 0) {
                targetHost = records[0].name;
                targetPort = records[0].port;
                Logger.info('[SRV]',`解析成功: ${targetHost}:${targetPort}`);
            }
        } catch (err) {
            Logger.warn('[SRV]',`解析失败: ${srvAddress}, 将使用默认端口进行查询。`, err.code);
            // 如果 SRV 解析失败，则继续使用原始 ip 和指定的或默认的 Java 端口
        }
    }

    // --- 步骤 2: 根据 serverType 动态创建查询任务 ---
    const javaPort = targetPort ? parseInt(targetPort, 10) : config.javaDefaultPort;
    const bedrockPort = targetPort ? parseInt(targetPort, 10) : config.bedrockDefaultPort;

    let promisesToRace = [];

    // 如果是 'je' 或 'auto'，则创建 Java 查询任务
    if (serverType === 'je' || serverType === 'auto') {
        const javaPromise = PingMCServer(targetHost, javaPort, config.queryTimeout)
            .then(response => ({ type: 'Java', data: response, host: targetHost, port: javaPort }));
        promisesToRace.push(javaPromise);
    }

    // 如果是 'be' 或 'auto'，则创建 Bedrock 查询任务
    if (serverType === 'be' || serverType === 'auto') {
        const bedrockPromise = pingBedrockPromise(targetHost, bedrockPort)
            .then(response => ({ type: 'Bedrock', data: response, host: targetHost, port: bedrockPort }));
        promisesToRace.push(bedrockPromise);
    }

    // 如果没有有效的查询任务，则抛出错误
    if (promisesToRace.length === 0) {
        throw new Error(`无效的 serverType: "${serverType}"`);
    }

    // --- 步骤 3: 执行查询并格式化返回 ---
    // 使用 try...catch 捕获 Promise.any 的失败（即所有查询都失败）
    try {
        const result = await Promise.any(promisesToRace);

        // 根据结果类型，格式化并返回标准化的数据对象
        if (result.type === 'Java') {
            const { data } = result;
            const playersSample = data.players.sample?.map(p => p.name).join(', ') || '无';
            return {
                type: 'Java',
                status: 'online',
                host: `${result.host}:${result.port}`,
                motd: data.description,
                pureMotd: motdToPlainText(data.description).trim(),
                version: data.version.name,
                protocol: data.version.protocol,
                players: { online: data.players.online, max: data.players.max, sample: playersSample },
                mod_info: data.modinfo,
                icon: data.favicon ? data.favicon : iconUrl,
                delay: Date.now() - now,
            };
        } else { // result.type === 'Bedrock'
            const { data } = result;
            const advertise = data.advertise.split(';')
            const advertiseData = {
                "serverType": advertise[0],
                "motd": advertise[1],
                "protocol": advertise[2],
                "version": advertise[3],
                "currentPlayers": advertise[4],
                "maxPlayers": advertise[5],
                "serverID": advertise[6],
                "levelname": advertise[7],
                "gamemode": advertise[8],
            }
            return {
                type: 'Bedrock',
                status: 'online',
                host: `${result.host}:${result.port}`,
                motd: data.name,
                pureMotd: data.cleanName,
                version: data.version,
                players: { online: data.currentPlayers, max: data.maxPlayers },
                gamemode: advertiseData.gamemode || null,
                delay: Date.now() - now,
                protocol: advertiseData.protocol || null,
                levelname: advertiseData.levelname || null,
                icon: iconUrl,
            };
        }
    } catch (error) {
        // 当所有查询都失败时，Promise.any 会抛出错误
        throw new Error('所有服务器查询都失败了。');
    }
}

// 导出这个核心函数
module.exports = { queryServerStatus };