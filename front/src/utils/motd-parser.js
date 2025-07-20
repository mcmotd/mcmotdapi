// Minecraft §代码 到 CSS颜色 的映射
const codeColorMap = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', 'a': '#55FF55', 'b': '#55FFFF',
    'c': '#FF5555', 'd': '#FF55FF', 'e': '#FFFF55', 'f': '#FFFFFF',
};

// Minecraft 颜色名 到 CSS颜色 的映射 (用于JSON格式)
const nameColorMap = {
    'black': '#000000', 'dark_blue': '#0000AA', 'dark_green': '#00AA00', 'dark_aqua': '#00AAAA',
    'dark_red': '#AA0000', 'dark_purple': '#AA00AA', 'gold': '#FFAA00', 'gray': '#AAAAAA',
    'dark_gray': '#555555', 'blue': '#5555FF', 'green': '#55FF55', 'aqua': '#55FFFF',
    'red': '#FF5555', 'light_purple': '#FF55FF', 'yellow': '#FFFF55', 'white': '#FFFFFF',
};

/**
 * [重构] 用于解析带§代码的字符串的内部函数
 * @param {string} str - 带§代码的字符串
 * @returns {string} - 转换后的HTML字符串
 */
function parseStringMotd(str) {
    if (!str) return '';

    let html = '';
    const parts = str.split('§');
    let currentStyles = { color: null, fontWeight: null, fontStyle: null, textDecorations: new Set(), isObfuscated: false };
    const createNewStyles = () => ({ color: null, fontWeight: null, fontStyle: null, textDecorations: new Set(), isObfuscated: false });

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        if (i === 0) {
            // 第一个部分没有格式代码，直接显示为纯文本
            if (part.length > 0) {
                html += `<span>${part}</span>`;
            }
            continue;
        }

        const code = part[0];
        const text = part.substring(1);

        if (codeColorMap[code]) {
            currentStyles.color = codeColorMap[code];
        } else if (code === 'l') {
            currentStyles.fontWeight = 'bold';
        } else if (code === 'o') {
            currentStyles.fontStyle = 'italic';
        } else if (code === 'n') {
            currentStyles.textDecorations.add('underline');
        } else if (code === 'm') {
            currentStyles.textDecorations.add('line-through');
        } else if (code === 'k') {
            currentStyles.isObfuscated = true;
        } else if (code === 'r') {
            currentStyles = createNewStyles();
        }

        if (text) {
            const inlineStyles = [];
            if (currentStyles.color) inlineStyles.push(`color: ${currentStyles.color};`);
            if (currentStyles.fontWeight) inlineStyles.push(`font-weight: ${currentStyles.fontWeight};`);
            if (currentStyles.fontStyle) inlineStyles.push(`font-style: ${currentStyles.fontStyle};`);
            if (currentStyles.textDecorations.size > 0) {
                const decorationString = [...currentStyles.textDecorations].join(' ');
                inlineStyles.push(`text-decoration: ${decorationString};`);
            }
            const styleString = inlineStyles.join(' ');

            if (currentStyles.isObfuscated) {
                for (const char of text) {
                    html += `<span class="obfuscated" style="${styleString}">${char}</span>`;
                }
            } else {
                html += `<span style="${styleString}">${text}</span>`;
            }
        }
    }

    return html;
}

/**
 * [新增] 用于解析JSON对象格式MOTD的函数
 * @param {object} motdObject - MOTD的JSON对象
 * @returns {string} - 转换后的HTML字符串
 */
function parseJsonMotd(motdObject) {
    let html = '';
    // "extra" 字段通常包含一个组件数组
    const components = motdObject.extra || [];

    // 有时根对象自己也包含文本
    if (motdObject.text) {
        components.unshift({ text: motdObject.text });
    }

    for (const component of components) {
        const styles = [];
        if (component.bold) styles.push('font-weight: bold;');
        if (component.italic) styles.push('font-style: italic;');
        if (component.underlined) styles.push('text-decoration: underline;');
        if (component.strikethrough) styles.push('text-decoration: line-through;');
        if (component.color && nameColorMap[component.color]) {
            styles.push(`color: ${nameColorMap[component.color]};`);
        }

        const styleString = styles.join(' ');

        // 文本内容本身可能还含有§代码，所以我们递归调用字符串解析器来处理
        const innerHtml = parseStringMotd(component.text || '');

        // 如果文本本身没有§代码，parseStringMotd会返回一个无包裹的字符串
        // 我们需要确保它被包裹在span里以应用JSON定义的样式
        if (innerHtml.startsWith('§')) {
            // 如果文本以§开头，说明它已经被字符串解析器处理并包裹
            html += `<span style="${styleString}">${innerHtml}</span>`;
        } else {
            // 否则，我们需要自己包裹
            const classString = component.obfuscated ? 'class="obfuscated"' : '';
            html += `<span ${classString} style="${styleString}">${innerHtml}</span>`;
        }
    }
    // 将换行符\n替换为<br>标签
    return html.replace(/\n/g, '<br>');
}


/**
 * [主函数] 将带 § 格式代码或JSON对象的 MOTD 转换为 HTML
 * @param {string|object} motd - 原始 MOTD
 * @returns {string} - 转换后的 HTML 字符串
 */
export function parseMotdToHtml(motd) {
    if (!motd) return '';

    // 判断MOTD是对象还是字符串，并调用相应的解析函数
    if (typeof motd === 'object') {
        return parseJsonMotd(motd);
    }

    // 对于字符串，我们还需要手动替换换行符
    if (typeof motd === 'string') {
        return parseStringMotd(motd).replace(/\n/g, '<br>');
    }

    return '';
}