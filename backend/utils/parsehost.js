export default function parseHost(ip, port, host) {
    // host 参数优先；否则用 ip 参数（两者都可能是 "host:port" 形式）
    const hostProvided = host !== undefined && host !== null && String(host).trim() !== '';
    const raw = hostProvided ? host : ip;

    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return {
            success: false,
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        };
    }

    const { address, portText } = splitAddress(String(raw));

    // host 参数模式维持旧行为（忽略 port 参数）；ip 参数模式下端口参数优先于地址内端口
    const explicitPort = (port !== undefined && port !== null && String(port).trim() !== '')
        ? String(port).trim()
        : null;
    const finalPortText = hostProvided ? portText : (explicitPort || portText);

    const targetAddress = address ? address.trim() : '';

    if (!targetAddress) {
        return {
            success: false,
            error: '请求格式不正确。必须提供 host 或 ip 参数。'
        };
    }

    // 主机名/域名不允许空格和这些特殊字符，早点拒绝比拿去做 DNS 查询更安全
    if (/\s/.test(targetAddress) || /[<>"'`\\/?#@]/.test(targetAddress)) {
        return {
            success: false,
            error: '地址格式不正确，请填写域名或 IP（不含空格与特殊字符）。'
        };
    }
    if (targetAddress.length > 253) {
        return {
            success: false,
            error: '地址过长。'
        };
    }

    let numericPort = undefined;

    if (finalPortText !== null && finalPortText !== undefined && String(finalPortText).trim() !== '') {
        const text = String(finalPortText).trim();
        if (!/^\d+$/.test(text)) {
            return {
                success: false,
                error: '端口无效。如果提供，端口必须是 1 到 65535 之间的纯数字。'
            };
        }
        const parsedPort = parseInt(text, 10);
        if (Number.isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
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

/**
 * 把 "host"、"host:port"、"[IPv6]:port"、"IPv6" 拆成 { address, portText }
 * @param {string} input
 */
function splitAddress(input) {
    const s = input.trim();
    if (!s) return { address: '', portText: null };

    // [IPv6]:port
    const bracketWithPort = s.match(/^\[(.+)\]:(\d+)$/);
    if (bracketWithPort) {
        return { address: bracketWithPort[1], portText: bracketWithPort[2] };
    }

    // [IPv6]
    const bracketOnly = s.match(/^\[(.+)\]$/);
    if (bracketOnly) {
        return { address: bracketOnly[1], portText: null };
    }

    const lastColon = s.lastIndexOf(':');

    if (lastColon === -1) {
        return { address: s, portText: null };
    }

    const colonCount = s.length - s.replace(/:/g, '').length;
    const afterLastColon = s.substring(lastColon + 1);

    // 只有一个冒号且冒号后是纯数字 => host:port
    if (colonCount === 1 && /^\d+$/.test(afterLastColon)) {
        return { address: s.substring(0, lastColon), portText: afterLastColon };
    }

    // 多个冒号 => 纯 IPv6 地址（不含端口）
    return { address: s, portText: null };
}
