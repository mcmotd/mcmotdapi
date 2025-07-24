export default function parseHost(ip,port,host) { 
    let targetAddress = null;
    let targetPort = null;

    // --- 步骤 1: 统一解析输入 (逻辑不变) ---
    // host 中可能包含端口，也可能不包含
    if (host) {
        const parts = host.split(':');
        targetAddress = parts[0];
        // 如果切分后有第二部分，则将其视为端口
        if (parts.length > 1 && parts[1]) {
            targetPort = parts[1];
        }
    }
    else if (ip) {
        targetAddress = ip;
        targetPort = port; // port 可能是 undefined
    }

    // --- 步骤 2: 集中验证 (逻辑调整) ---
    // 验证 2.1: 只验证地址是否存在，因为端口现在是可选的
    if (!targetAddress) {
        return{
            success: false,
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        };
    }

    let numericPort = undefined; // 初始化最终的数字端口为 undefined

    // 验证 仅在用户提供了端口时，才对其进行校验
    if (targetPort) {
        const parsedPort = parseInt(targetPort, 10);

        if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 || String(parsedPort) !== targetPort.trim()) {
            return {
                success: false,
                error: '端口无效。如果提供，端口必须是 1 到 65535 之间的纯数字。'
            };
        }
        // 只有在端口有效时，才赋值
        numericPort = parsedPort;
    }

    return {
        success: true,
        ip:targetAddress,
        port: numericPort
    };
}

