const config = require('../config/config.json');
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

    // --- 步骤 1: 确定 Java 和 Bedrock 的查询目标 ---
    // Bedrock 目标始终是原始IP
    const bedrockTarget = {
        host: ip,
        port: port ? parseInt(port, 10) : config.bedrockDefaultPort
    };
    // Java 目标初始为原始IP，但可能会被 SRV 记录覆盖
    let javaTarget = {
        host: ip,
        port: port ? parseInt(port, 10) : config.javaDefaultPort
    };

    // --- 步骤 2: SRV 记录解析 ---
    // 当用户强制指定(isSRV=true)或在自动模式下，都尝试解析 SRV
    if (isSRV === true || serverType === 'auto') {
        const srvAddress = `_minecraft._tcp.${ip}`;
        try {
            const logPrefix = isSRV ? '[SRV]' : '[SRV Auto]';
            Logger.info(logPrefix, `解析: ${srvAddress}`);
            const records = await dns.resolveSrv(srvAddress);

            if (records.length > 0) {
                // 解析成功，更新 Java 的查询目标
                javaTarget.host = records[0].name;
                javaTarget.port = records[0].port;
                Logger.info(logPrefix, `解析成功: ${javaTarget.host}:${javaTarget.port}`);

                // 如果是强制SRV模式，则将查询类型锁定为仅 Java
                if (isSRV === true) {
                    serverType = 'je';
                }
            }
        } catch (err) {
            // 在强制SRV模式下，解析失败需要警告用户
            if (isSRV === true) {
                Logger.warn('[SRV]', `解析失败: ${srvAddress}, 将使用默认地址查询。`, err.code);
            } else {
                // 在自动模式下，静默失败是正常行为，仅记录日志即可
                Logger.info('[SRV Auto]', `解析 ${srvAddress} 失败，将使用默认地址。`);
            }
        }
    }

    // --- 步骤 3: 根据 serverType 动态创建查询任务 ---
    let promisesToRace = [];

    // 创建 Java 查询任务 (使用可能被SRV更新过的 javaTarget)
    if (serverType === 'je' || serverType === 'auto') {
        const javaPromise = PingMCServer(javaTarget.host, javaTarget.port, config.queryTimeout)
            .then(response => ({ type: 'Java', data: response, host: javaTarget.host, port: javaTarget.port }));
        promisesToRace.push(javaPromise);
    }

    // 创建 Bedrock 查询任务 (始终使用原始 bedrockTarget)
    if (serverType === 'be' || serverType === 'auto') {
        const bedrockPromise = pingBedrockPromise(bedrockTarget.host, bedrockTarget.port)
            .then(response => ({ type: 'Bedrock', data: response, host: bedrockTarget.host, port: bedrockTarget.port }));
        promisesToRace.push(bedrockPromise);
    }

    // 如果没有有效的查询任务，则抛出错误
    if (promisesToRace.length === 0) {
        throw new Error(`无效的 serverType: "${serverType}"`);
    }

    // --- 步骤 4: 执行查询并格式化返回 ---
    try {
        const result = await Promise.any(promisesToRace);

        // (此部分格式化逻辑保持不变)
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
        throw new Error('所有服务器查询都失败了。');
    }
}

// 导出这个核心函数
module.exports = { queryServerStatus };