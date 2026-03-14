const { createCanvas, loadImage } = require('canvas');

const frontConfig = require('../config/front.json');
const { getAppImageConfig } = require('./appImageStorage');
const zhCN = require('../../front/src/locales/zh-CN.json');
const enUS = require('../../front/src/locales/en.json');

const FONT_FAMILY = 'sans-serif';
const MC_CODE = '\u00A7';
const LIGHT_COLORS = {
    card: '#ffffff',
    text: '#333333',
    muted: '#6c757d',
    primary: '#007bff',
    border: '#e9ecef',
    success: '#28a745',
    successBg: '#e9f7ec',
    shadow: 'rgba(0, 0, 0, 0.08)',
    iconBg: '#dbe2ee',
    iconText: '#8fa0ba',
    obfuscated: '#c5ccd7'
};
const DARK_COLORS = {
    card: '#424242',
    text: '#e0e0e0',
    muted: '#9ca2a8',
    primary: '#3694ff',
    border: '#333333',
    success: '#3ddc84',
    successBg: 'rgba(61, 220, 132, 0.15)',
    shadow: 'rgba(0, 0, 0, 0.2)',
    iconBg: '#2f3945',
    iconText: '#90a4c0',
    obfuscated: '#97a0af'
};
const LABELS = {
    'zh-CN': zhCN.comp.serverDis,
    zh: zhCN.comp.serverDis,
    'en-US': enUS.comp.serverDis,
    en: enUS.comp.serverDis
};
const LEGACY_COLORS = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA',
    '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', a: '#55FF55', b: '#55FFFF',
    c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF'
};
const JSON_COLORS = {
    black: '#000000',
    dark_blue: '#0000AA',
    dark_green: '#00AA00',
    dark_aqua: '#00AAAA',
    dark_red: '#AA0000',
    dark_purple: '#AA00AA',
    gold: '#FFAA00',
    gray: '#AAAAAA',
    dark_gray: '#555555',
    blue: '#5555FF',
    green: '#55FF55',
    aqua: '#55FFFF',
    red: '#FF5555',
    light_purple: '#FF55FF',
    yellow: '#FFFF55',
    white: '#FFFFFF'
};
const OBFUSCATED = ["░", "▒", "▓", "█", "▌", "▐"];

function getLabels(lang) {
    return LABELS[lang] || LABELS['zh-CN'];
}

function isDarkModeEnabled(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'dark';
}

function getThemeColors(options = {}) {
    return isDarkModeEnabled(options.dark) ? DARK_COLORS : LIGHT_COLORS;
}

function drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, color) {
    drawRoundRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = color;
    ctx.fill();
}

function strokeLine(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function sanitizeText(value) {
    if (value === undefined || value === null) return '';
    return String(value).replace(/\u00A7[0-9a-fk-or]/gi, '').trim();
}

function parseLegacySegments(text, colors) {
    const source = String(text || '');
    const segments = [];
    let state = {
        color: colors.text,
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        obfuscated: false
    };
    let buffer = '';

    const flush = () => {
        if (!buffer) return;
        segments.push({ ...state, text: buffer });
        buffer = '';
    };

    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        if (char === MC_CODE && i + 1 < source.length) {
            flush();
            const code = source[++i].toLowerCase();
            if (LEGACY_COLORS[code]) {
                state = {
                    color: LEGACY_COLORS[code],
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    obfuscated: false
                };
                continue;
            }
            if (code === 'l') state.bold = true;
            if (code === 'o') state.italic = true;
            if (code === 'n') state.underline = true;
            if (code === 'm') state.strike = true;
            if (code === 'k') state.obfuscated = true;
            if (code === 'r') {
                state = {
                    color: colors.text,
                    bold: false,
                    italic: false,
                    underline: false,
                    strike: false,
                    obfuscated: false
                };
            }
            continue;
        }
        buffer += char;
    }

    flush();
    return segments;
}

function parseJsonSegments(node, colors, inherited = {}) {
    if (node === null || node === undefined) return [];
    if (typeof node === 'string') return parseLegacySegments(node, colors);

    const style = {
        color: inherited.color || colors.text,
        bold: inherited.bold || false,
        italic: inherited.italic || false,
        underline: inherited.underline || false,
        strike: inherited.strike || false,
        obfuscated: inherited.obfuscated || false
    };

    if (node.color) {
        style.color = node.color.startsWith && node.color.startsWith('#')
            ? node.color
            : (JSON_COLORS[node.color] || style.color);
    }
    if (node.bold !== undefined) style.bold = Boolean(node.bold);
    if (node.italic !== undefined) style.italic = Boolean(node.italic);
    if (node.underlined !== undefined) style.underline = Boolean(node.underlined);
    if (node.strikethrough !== undefined) style.strike = Boolean(node.strikethrough);
    if (node.obfuscated !== undefined) style.obfuscated = Boolean(node.obfuscated);

    let segments = [];
    if (typeof node.text === 'string' && node.text) {
        segments.push({ ...style, text: node.text });
    }
    if (Array.isArray(node.extra)) {
        node.extra.forEach(item => {
            segments = segments.concat(parseJsonSegments(item, colors, style));
        });
    }

    return segments;
}

function getMotdSegments(motd, colors) {
    if (!motd) return [];
    if (typeof motd === 'object') return parseJsonSegments(motd, colors);
    return parseLegacySegments(motd, colors);
}

function layoutMotdLines(ctx, motd, maxWidth, maxLines, colors) {
    const segments = getMotdSegments(motd, colors);
    const lines = [[]];
    let lineIndex = 0;
    let lineWidth = 0;

    const nextLine = () => {
        if (lineIndex >= maxLines - 1) {
            return false;
        }
        lineIndex += 1;
        lines[lineIndex] = [];
        lineWidth = 0;
        return true;
    };

    for (const segment of segments) {
        const chars = segment.obfuscated
            ? Array.from({ length: segment.text.length }, (_, index) => OBFUSCATED[index % OBFUSCATED.length])
            : segment.text.split('');

        for (const char of chars) {
            ctx.font = `${segment.italic ? 'italic ' : ''}${segment.bold ? '700' : '600'} 18px "${FONT_FAMILY}"`;
            const charWidth = ctx.measureText(char).width;

            if (char === '\n') {
                if (!nextLine()) return lines;
                continue;
            }

            if (lineWidth + charWidth > maxWidth && lineWidth > 0) {
                if (!nextLine()) return lines;
            }

            lines[lineIndex].push({
                char,
                width: charWidth,
                color: segment.obfuscated ? colors.obfuscated : (segment.color || colors.text),
                bold: segment.bold,
                italic: segment.italic
            });
            lineWidth += charWidth;
        }
    }

    return lines;
}

function drawMotd(ctx, motd, x, centerY, maxWidth, maxLines, colors) {
    const lines = layoutMotdLines(ctx, motd, maxWidth, maxLines, colors);
    const lineHeight = 28;
    const totalHeight = (lines.length - 1) * lineHeight;
    let cursorY = centerY - totalHeight / 2 + 7;

    lines.forEach(line => {
        let cursorX = x;
        line.forEach(token => {
            ctx.font = `${token.italic ? 'italic ' : ''}${token.bold ? '700' : '600'} 18px "${FONT_FAMILY}"`;
            ctx.fillStyle = token.color;
            ctx.fillText(token.char, cursorX, cursorY);
            cursorX += token.width;
        });
        cursorY += lineHeight;
    });
}

function wrapPlainText(ctx, text, maxWidth, maxLines) {
    const source = sanitizeText(text) || '-';
    const lines = [];
    let current = '';
    let lastBreakIndex = -1;

    const pushLine = (line) => {
        lines.push(line);
        return lines.length >= maxLines;
    };

    const resetBreakIndex = () => {
        lastBreakIndex = -1;
        for (let i = current.length - 1; i >= 0; i--) {
            if (/[.\-_/:\s]/.test(current[i])) {
                lastBreakIndex = i;
                break;
            }
        }
    };

    for (const char of source) {
        if (char === '\n') {
            if (pushLine(current || '-')) break;
            current = '';
            lastBreakIndex = -1;
            continue;
        }

        current += char;
        if (/[.\-_/:\s]/.test(char)) {
            lastBreakIndex = current.length - 1;
        }

        if (ctx.measureText(current).width <= maxWidth) {
            continue;
        }

        let line = current.slice(0, -1);
        let remainder = char;

        if (lastBreakIndex >= 0) {
            line = current.slice(0, lastBreakIndex + 1).trimEnd();
            remainder = current.slice(lastBreakIndex + 1).trimStart();
        }

        if (!line) {
            line = current.slice(0, -1);
            remainder = char;
        }

        if (pushLine(line || remainder.slice(0, 1))) break;
        current = line ? remainder : remainder.slice(1);
        resetBreakIndex();
    }

    if (current && lines.length < maxLines) lines.push(current);
    return lines.slice(0, maxLines);
}

function truncateLinesToWidth(ctx, lines, maxWidth) {
    if (!lines.length) return lines;
    const result = [...lines];
    const lastIndex = result.length - 1;
    let lastLine = result[lastIndex];
    if (ctx.measureText(lastLine).width <= maxWidth) return result;

    while (lastLine.length > 1 && ctx.measureText(`${lastLine}...`).width > maxWidth) {
        lastLine = lastLine.slice(0, -1);
    }
    result[lastIndex] = `${lastLine}...`;
    return result;
}

function fitTextBlock(ctx, text, preferredWidth, maxWidth, maxLines) {
    let width = preferredWidth;
    let lines = wrapPlainText(ctx, text, width, maxLines);

    while (lines.length === maxLines && ctx.measureText(lines[lines.length - 1]).width >= width && width < maxWidth) {
        width += 8;
        lines = wrapPlainText(ctx, text, width, maxLines);
    }

    const fullTextWidth = ctx.measureText(sanitizeText(text)).width;
    if (fullTextWidth <= width) {
        return { width, lines: [sanitizeText(text)] };
    }

    const candidate = wrapPlainText(ctx, text, width, maxLines);
    const normalized = candidate.length > maxLines ? candidate.slice(0, maxLines) : candidate;
    const truncated = truncateLinesToWidth(ctx, normalized, width);
    return { width, lines: truncated };
}

function splitHostLines(value) {
    const text = sanitizeText(value);
    const colonIndex = text.lastIndexOf(':');
    if (colonIndex > 0 && colonIndex < text.length - 1) {
        return [text.slice(0, colonIndex), text.slice(colonIndex)];
    }
    return [text];
}

function fitHostBlock(ctx, value, preferredWidth, maxWidth, maxLines) {
    const splitLines = splitHostLines(value);
    let width = preferredWidth;

    while (width <= maxWidth) {
        if (splitLines.length <= maxLines && splitLines.every(line => ctx.measureText(line).width <= width)) {
            return { width, lines: splitLines };
        }

        const wrapped = wrapPlainText(ctx, value, width, maxLines);
        const wrappedText = sanitizeText(wrapped.join(''));
        if (wrappedText === sanitizeText(value) && wrapped.every(line => ctx.measureText(line).width <= width)) {
            return { width, lines: wrapped };
        }

        width += 8;
    }

    const wrapped = wrapPlainText(ctx, value, maxWidth, maxLines);
    return {
        width: maxWidth,
        lines: truncateLinesToWidth(ctx, wrapped, maxWidth)
    };
}

function drawInfoCell(ctx, label, value, x, y, width, primary, colors, options = {}) {
    ctx.textAlign = 'left';
    ctx.fillStyle = colors.muted;
    ctx.font = `400 15px "${FONT_FAMILY}"`;
    ctx.fillText(label, x, y);

    ctx.fillStyle = primary ? colors.primary : colors.text;
    const baseFontSize = options.fontSize || 18;
    const lineHeight = options.lineHeight || 22;
    ctx.font = `700 ${baseFontSize}px "${FONT_FAMILY}"`;
    const fit = options.strictWidth
        ? {
            width,
            lines: truncateLinesToWidth(ctx, wrapPlainText(ctx, value, width, options.maxLines || 2), width)
        }
        : (options.hostWrap
            ? fitHostBlock(ctx, value, width, options.maxWidth || width, options.maxLines || 2)
            : fitTextBlock(ctx, value, width, options.maxWidth || width, options.maxLines || 2));
    let lines = fit.lines;

    if (options.forceWrap && lines.length === 1 && ctx.measureText(lines[0]).width > fit.width) {
        lines = truncateLinesToWidth(ctx, wrapPlainText(ctx, value, fit.width, options.maxLines || 2), fit.width);
    }

    lines.forEach((line, index) => ctx.fillText(line, x, y + 28 + index * lineHeight));
}

async function drawIcon(ctx, iconUrl, x, y, size, colors) {
    if (iconUrl) {
        try {
            const image = await loadImage(iconUrl);
            ctx.save();
            drawRoundRect(ctx, x, y, size, size, 8);
            ctx.clip();
            ctx.drawImage(image, x, y, size, size);
            ctx.restore();
            return;
        } catch {}
    }

    fillRoundRect(ctx, x, y, size, size, 24, colors.iconBg);
    ctx.fillStyle = colors.iconText;
    ctx.textAlign = 'center';
    ctx.font = `700 40px "${FONT_FAMILY}"`;
    ctx.fillText('MC', x + size / 2, y + size / 2 + 13);
}

function getStatusBadgeWidth(ctx, text) {
    const badgeText = String(text || 'ONLINE').toUpperCase();
    ctx.font = `700 16px "${FONT_FAMILY}"`;
    return Math.ceil(ctx.measureText(badgeText).width) + 36;
}

function drawStatusBadge(ctx, text, x, y, colors) {
    const badgeText = String(text || 'ONLINE').toUpperCase();
    const width = getStatusBadgeWidth(ctx, badgeText);
    fillRoundRect(ctx, x, y, width, 32, 16, colors.successBg);
    ctx.beginPath();
    ctx.fillStyle = colors.success;
    ctx.arc(x + 14, y + 16, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.success;
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, x + 22, y + 21);
}

function drawOffline(ctx, width, height, colors) {
    fillRoundRect(ctx, 0, 0, width, height, 12, colors.card);
    const slogan = frontConfig.failureState?.defaultSlogan || '服务器未响应';
    const subtext = frontConfig.failureState?.subtext || '服务器未响应或不存在';

    ctx.textAlign = 'center';
    ctx.fillStyle = colors.text;
    ctx.font = `600 26px "${FONT_FAMILY}"`;
    wrapPlainText(ctx, slogan, 440, 2).forEach((line, index) => ctx.fillText(line, width / 2, 160 + index * 34));
    ctx.fillStyle = colors.muted;
    ctx.font = `400 16px "${FONT_FAMILY}"`;
    wrapPlainText(ctx, subtext, 440, 2).forEach((line, index) => ctx.fillText(line, width / 2, 220 + index * 24));
}

async function drawOnline(ctx, width, height, serverData, options) {
    const labels = getLabels(options.lang);
    const colors = getThemeColors(options);
    const iconColumnWidth = 120;
    const contentX = iconColumnWidth + 24;
    const headerCenterY = 40;
    const displayHost = sanitizeText(serverData.displayHost || serverData.host);
    const iconUrl = serverData.icon || options.imageUrl;

    fillRoundRect(ctx, 0, 0, width, height, 12, colors.card);
    strokeLine(ctx, iconColumnWidth, 0, iconColumnWidth, height, colors.border);
    strokeLine(ctx, iconColumnWidth, 76, width, 76, colors.border);
    strokeLine(ctx, iconColumnWidth, 298, width, 298, colors.border);

    await drawIcon(ctx, iconUrl, 24, 159, 72, colors);

    ctx.textAlign = 'left';
    drawMotd(ctx, serverData.motd || serverData.pureMotd || serverData.host, contentX, headerCenterY, 408, 2, colors);

    const badgeWidth = getStatusBadgeWidth(ctx, serverData.type || serverData.status || 'ONLINE');
    drawStatusBadge(ctx, serverData.type || serverData.status || 'ONLINE', width - 24 - badgeWidth, 24, colors);

    const columns = [contentX, contentX + 202, contentX + 392];
    const rows = [122, 214];
    const rightColumnWidth = Math.max(120, width - columns[2] - 24);
    const players = serverData.players || {};
    const cells = [
        { label: labels.host, value: displayHost, primary: false, width: 202, maxWidth: 242, fontSize: 18, lineHeight: 22, maxLines: 2, forceWrap: true, hostWrap: true, strictWidth: true },
        { label: labels.version, value: sanitizeText(serverData.version), primary: true, maxWidth: 160 },
        { label: labels.protocol, value: sanitizeText(serverData.protocol), primary: false, width: rightColumnWidth, maxWidth: rightColumnWidth },
        { label: labels.gamemode, value: sanitizeText(serverData.gamemode), primary: false, maxWidth: 160 },
        { label: labels.delay, value: `${sanitizeText(serverData.delay)}ms`, primary: false, maxWidth: 160 },
        { label: labels.levelname, value: sanitizeText(serverData.levelname), primary: false, width: rightColumnWidth, maxWidth: rightColumnWidth, fontSize: 16, lineHeight: 20, maxLines: 2, strictWidth: true }
    ].filter(item => item.value && item.value !== 'ms');

    if (players.sample) {
        cells.push({
            label: labels.onlineList,
            value: sanitizeText(players.sample),
            primary: false,
            width: 170,
            fontSize: 15,
            lineHeight: 18,
            maxLines: 2
        });
    }

    cells.forEach((cell, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        drawInfoCell(
            ctx,
            cell.label,
            cell.value,
            columns[col],
            rows[row],
            cell.width || 150,
            cell.primary,
            colors,
            {
                fontSize: cell.fontSize,
                lineHeight: cell.lineHeight,
                maxLines: cell.maxLines,
                maxWidth: cell.maxWidth,
                forceWrap: cell.forceWrap,
                hostWrap: cell.hostWrap,
                strictWidth: cell.strictWidth
            }
        );
    });

    const online = Number(players.online) || 0;
    const max = Number(players.max) || 0;
    const ratio = max > 0 ? Math.min(1, online / max) : 0;

    ctx.fillStyle = colors.text;
    ctx.font = `400 16px "${FONT_FAMILY}"`;
    const prefix = `${labels.players}: `;
    ctx.fillText(prefix, contentX, 340);
    const prefixWidth = ctx.measureText(prefix).width;
    ctx.font = `700 18px "${FONT_FAMILY}"`;
    ctx.fillText(`${online}`, contentX + prefixWidth, 340);
    const onlineWidth = ctx.measureText(`${online}`).width;
    ctx.font = `400 16px "${FONT_FAMILY}"`;
    ctx.fillText(` / ${max}`, contentX + prefixWidth + onlineWidth, 340);

    const barWidth = width - iconColumnWidth - 48;
    fillRoundRect(ctx, contentX, 357, barWidth, 8, 4, colors.border);
    fillRoundRect(ctx, contentX, 357, Math.max(0, Math.min(barWidth, barWidth * ratio)), 8, 4, colors.success);
}

async function generateAppImage(serverData, options = {}) {
    const { width, height } = getAppImageConfig();
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const colors = getThemeColors(options);

    ctx.clearRect(0, 0, width, height);
    ctx.shadowColor = colors.shadow;
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    fillRoundRect(ctx, 0, 0, width, height, 12, colors.card);
    ctx.shadowColor = 'transparent';

    if (serverData.status === 'offline' || !serverData.version) {
        drawOffline(ctx, width, height, colors);
    } else {
        await drawOnline(ctx, width, height, serverData, options);
    }

    return canvas.toBuffer('image/png');
}

module.exports = {
    generateAppImage
};
