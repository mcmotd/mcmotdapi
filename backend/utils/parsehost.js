export default function parseHost(ip, port, host) {
    let targetAddress = null;
    let targetPort = null;

    if (host) {
        // [核心修改] 增强对 IPv6 和其他格式的解析能力
        const ipv6WithPortMatch = host.match(/^\[(.+)\]:(\d+)$/);

        if (ipv6WithPortMatch) {
            // 匹配到 [IPv6]:port 格式, e.g., "[2001:db8::1]:25565"
            targetAddress = ipv6WithPortMatch[1];
            targetPort = ipv6WithPortMatch[2];
        } else {
            // 处理 IPv4/域名 + 端口，或纯地址
            const lastColonIndex = host.lastIndexOf(':');
            const firstColonIndex = host.indexOf(':');

            // 如果存在冒号，并且它不是 IPv6 地址的一部分 (即只有一个冒号)
            if (lastColonIndex > -1 && lastColonIndex === firstColonIndex) {
                targetAddress = host.substring(0, lastColonIndex);
                targetPort = host.substring(lastColonIndex + 1);
            } else if (lastColonIndex > -1 && host.includes('.')) {
                // 兼容域名/IPv4后跟端口的情况，例如 example.com:25565
                targetAddress = host.substring(0, lastColonIndex);
                targetPort = host.substring(lastColonIndex + 1);
            } else {
                // 不包含端口的地址 (域名, IPv4, 或纯 IPv6)
                targetAddress = host;
                targetPort = null;
            }
        }
    }
    else if (ip) {
        targetAddress = ip;
        targetPort = port;
    }

    if (!targetAddress) {
        return {
            success: false,
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        };
    }

    let numericPort = undefined;

    if (targetPort) {
        // 端口验证逻辑保持不变，它已经很健壮了
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