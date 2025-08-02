export default function parseHost(ip, port, host) {
    let targetAddress = null;
    let targetPort = null;

    if (host) {
        // [优化] 增强对 IPv6 和其他格式的解析能力
        const ipv6WithPortMatch = host.trim().match(/^\[(.+)\]:(\d+)$/);

        if (ipv6WithPortMatch) {
            // 匹配到 [IPv6]:port 格式, e.g., "[2001:db8::1]:25565"
            targetAddress = ipv6WithPortMatch[1];
            targetPort = ipv6WithPortMatch[2];
        } else {
            const trimmedHost = host.trim();
            const lastColonIndex = trimmedHost.lastIndexOf(':');
            const firstColonIndex = trimmedHost.indexOf(':');

            // 检查是否为带端口的 IPv4/域名，或不含端口的地址
            if (lastColonIndex > -1 && lastColonIndex > trimmedHost.lastIndexOf(']')) {
                // 冒号在IPv6的 "]" 之后，或者地址中不含 "]"
                // 并且它不是IPv6地址的一部分（即只有一个冒号，或者包含"."）
                if (lastColonIndex === firstColonIndex || trimmedHost.includes('.')) {
                    targetAddress = trimmedHost.substring(0, lastColonIndex);
                    targetPort = trimmedHost.substring(lastColonIndex + 1);
                } else {
                    // 认为是纯IPv6地址
                    targetAddress = trimmedHost;
                    targetPort = null;
                }
            } else {
                // 不包含端口的地址
                targetAddress = trimmedHost;
                targetPort = null;
            }
        }
    }
    else if (ip) {
        targetAddress = ip;
        targetPort = port;
    }

    // [核心修复] 在返回前，对最终的地址进行 trim() 操作
    if (targetAddress) {
        targetAddress = targetAddress.trim();
    }

    if (!targetAddress) {
        return {
            success: false,
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        };
    }

    let numericPort = undefined;

    if (targetPort) {
        const parsedPort = parseInt(targetPort, 10);
        if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535 || String(parsedPort) !== targetPort.trim()) {
            return {
                success: false,
                error: '端口无效。如果提供，端口必须是 1 到 65535 之间的纯数字。'
            };
        }
        numericPort = parsedPort;
    }

    return {
        success: true,
        ip: targetAddress,
        port: numericPort
    };
}
