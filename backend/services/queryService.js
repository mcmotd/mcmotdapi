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
async function queryServerStatus(ip, port, iconUrl) {
    const now = Date.now();
    const javaPort = port ? parseInt(port, 10) : config.javaDefaultPort;
    const bedrockPort = port ? parseInt(port, 10) : config.bedrockDefaultPort;

    // 创建两个并行的查询Promise
    const javaPromise = PingMCServer(ip, javaPort,config.queryTimeout)
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
            host: `${ip}:${bedrockPort}`,
            motd: data.name,
            pureMotd:data.cleanName,
            version: data.version,
            players: { online: data.currentPlayers, max: data.maxPlayers },
            gamemode: advertiseData.gamemode,
            delay: Date.now() - now,
            protocol: advertiseData.protocol,
            levelname: advertiseData.levelname,
            icon: iconUrl,
        };
    }
}

// 导出这个核心函数
module.exports = { queryServerStatus };