/**
 * Minecraft MOTD 全功能解析器 (最终稳定版)
 * - [核心] 乱码(§k)字符不再生成原始文本，而是生成一个空的span容器，由CSS伪元素填充动画。
 */

const LEGACY_CODES = {
    '0': { color: '#000000' }, '1': { color: '#0000AA' }, '2': { color: '#00AA00' }, '3': { color: '#00AAAA' },
    '4': { color: '#AA0000' }, '5': { color: '#AA00AA' }, '6': { color: '#FFAA00' }, '7': { color: '#AAAAAA' },
    '8': { color: '#555555' }, '9': { color: '#5555FF' }, 'a': { color: '#55FF55' }, 'b': { color: '#55FFFF' },
    'c': { color: '#FF5555' }, 'd': { color: '#FF55FF' }, 'e': { color: '#FFFF55' }, 'f': { color: '#FFFFFF' },
    'l': { style: 'font-weight: bold;' },
    'm': { style: 'text-decoration: line-through;' },
    'n': { style: 'text-decoration: underline;' },
    'o': { style: 'font-style: italic;' },
    'k': { class: 'obfuscated' }
};

const JSON_NAME_COLOR_MAP = {
    'black': '#000000', 'dark_blue': '#0000AA', 'dark_green': '#00AA00', 'dark_aqua': '#00AAAA',
    'dark_red': '#AA0000', 'dark_purple': '#AA00AA', 'gold': '#FFAA00', 'gray': '#AAAAAA',
    'dark_gray': '#555555', 'blue': '#5555FF', 'green': '#55FF55', 'aqua': '#55FFFF',
    'red': '#FF5555', 'light_purple': '#FF55FF', 'yellow': '#FFFF55', 'white': '#FFFFFF',
};

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseLegacyMotd(str) {
    if (!str) return '';
    const parts = str.split('§');
    let html = `<span>${escapeHtml(parts[0])}</span>`;
    let activeStyles = [];
    let activeClasses = new Set();

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        const code = part[0].toLowerCase();
        const text = part.substring(1);
        let isObfuscated = activeClasses.has('obfuscated');

        if (code === 'r') {
            activeStyles = [];
            activeClasses.clear();
            isObfuscated = false;
        } else {
            const format = LEGACY_CODES[code];
            if (format) {
                if (format.color) {
                    activeStyles = [`color: ${format.color};`];
                    activeClasses.clear();
                }
                if (format.style) activeStyles.push(format.style);
                if (format.class) {
                    activeClasses.add(format.class);
                    if (format.class === 'obfuscated') isObfuscated = true;
                }
            }
        }

        if (text) {
            const styleAttr = activeStyles.length > 0 ? `style="${[...new Set(activeStyles)].join(' ')}"` : '';
            const classAttr = activeClasses.size > 0 ? `class="${[...activeClasses].join(' ')}"` : '';

            if (isObfuscated) {
                // [核心] 为每个乱码字符生成一个不包含内容的span
                for (let j = 0; j < text.length; j++) {
                    html += `<span ${styleAttr} ${classAttr}></span>`;
                }
            } else {
                html += `<span ${styleAttr} ${classAttr}>${escapeHtml(text)}</span>`;
            }
        }
    }
    return html;
}

function parseJsonComponent(component) {
    if (typeof component === 'string') return parseLegacyMotd(component);
    if (typeof component !== 'object' || component === null) return '';

    let content = '';
    if (Array.isArray(component.extra)) {
        content = component.extra.map(c => parseJsonComponent(c)).join('');
    }

    if (typeof component.text === 'string' && component.text) {
        // [核心] 如果当前组件是乱码，则特殊处理
        if (component.obfuscated) {
            let tempContent = '';
            for (let i = 0; i < component.text.length; i++) {
                tempContent += '<span></span>'; // 生成空span
            }
            content += tempContent;
        } else {
            content += parseLegacyMotd(component.text);
        }
    }

    if (content === '') return '';

    const styles = [];
    const classes = [];

    if (component.color) {
        const color = component.color.startsWith('#') ? component.color : JSON_NAME_COLOR_MAP[component.color];
        if (color) styles.push(`color: ${color};`);
    }

    if (component.bold) styles.push('font-weight: bold;');
    if (component.italic) styles.push('font-style: italic;');
    if (component.underlined) styles.push('text-decoration: underline;');
    if (component.strikethrough) styles.push('text-decoration: line-through;');
    if (component.obfuscated) classes.push('obfuscated');

    if (styles.length === 0 && classes.length === 0) return content;

    const styleAttr = `style="${styles.join(' ')}"`;
    const classAttr = `class="${classes.join(' ')}"`;

    return `<span ${classAttr} ${styleAttr}>${content}</span>`;
}

export function parseMotdToHtml(motdData) {
    if (!motdData) return '';
    let htmlResult = (typeof motdData === 'object' && motdData !== null)
        ? parseJsonComponent(motdData)
        : parseLegacyMotd(String(motdData));
    return htmlResult.replace(/\n/g, '<br>');
}