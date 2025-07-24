const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
// const {} = require("../pic.json")

// 1. 加载并解析配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

// 2. 注册全局字体
try {
    registerFont(config.font.path, { family: config.font.name });
} catch (e) {
    console.error(`[错误] 字体文件加载失败: ${config.font.path}`);
    process.exit(1);
}

/**
 * 根据模板和数据生成图片
 * @param {string} templateName - 'dark_tech' 或 'simple'
 * @param {object} data - 生成图片所需的数据
 * @returns {Promise<Buffer>} PNG 图片的 Buffer
 */
async function generateImage(templateName, data) {
    const templateConfig = config.templates[templateName];
    if (!templateConfig) {
        throw new Error(`模板 "${templateName}" 在配置文件中未找到。`);
    }

    const canvas = createCanvas(templateConfig.width, templateConfig.height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 根据模板名称调用不同的渲染函数
    switch (templateName) {
        case 'dark_tech':
            await renderDarkTech(ctx, templateConfig, data);
            break;
        case 'simple':
            await renderSimpleBackground(ctx, templateConfig, data);
            break;
        default:
            throw new Error(`不支持的模板: ${templateName}`);
    }

    return canvas.toBuffer('image/png');
}

// --- 模板渲染函数 ---

/**
 * 渲染 'dark_tech' 模板
 */
async function renderDarkTech(ctx, conf, serverData) {
    // 1. 绘制背景
    ctx.fillStyle = conf.background.color;
    ctx.fillRect(0, 0, conf.width, conf.height);
    ctx.font = `${conf.background.symbol_font_size}px "${config.font.name}"`;
    ctx.fillStyle = conf.background.symbol_color;
    ctx.textAlign = 'center';
    for (let i = 0; i < conf.background.symbol_count; i++) {
        const x = Math.random() * conf.width;
        const y = Math.random() * conf.height;
        ctx.fillText(conf.background.symbols[Math.floor(Math.random() * conf.background.symbols.length)], x, y);
    }

    // 2. 绘制标题和状态灯
    ctx.textAlign = 'left';
    ctx.font = `${conf.header.font_size}px "${config.font.name}"`;
    ctx.fillStyle = conf.header.color;
    ctx.fillText(conf.header.text, conf.header.position.x, conf.header.position.y);

    ctx.save();
    const lightConf = conf.status_light;
    ctx.fillStyle = serverData.isOnline ? lightConf.color_online : lightConf.color_offline;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = lightConf.shadow_blur;
    ctx.beginPath();
    ctx.arc(lightConf.position.x, lightConf.position.y, lightConf.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const textConf = conf.info_text;
    ctx.font = `${textConf.font_size}px "${config.font.name}"`;
    ctx.fillStyle = textConf.color;

    textConf.lines.forEach(line => {
        const currentY = textConf.start_position.y + line.y_offset;

        switch (line.type) {
            case 'text': {
                // 使用正则表达式替换所有 {key} 占位符
                const formattedText = line.format.replace(/\{(\w+)\}/g, (match, key) => {
                    return serverData[key] !== undefined ? serverData[key] : match;
                });
                ctx.fillText(formattedText, textConf.start_position.x, currentY);
                break;
            }
            case 'progress_bar': {
                const barConf = conf.progress_bar;
                const playerText = `${serverData.currentPlayers} / ${serverData.maxPlayers}`;

                // 绘制标签
                ctx.fillText(line.label, textConf.start_position.x, currentY);

                // 绘制进度条
                const playerLabelMetrics = ctx.measureText(`${line.label}  `);
                const progressBarX = textConf.start_position.x + playerLabelMetrics.width + barConf.label_offset_x;

                ctx.fillStyle = barConf.bg_color;
                ctx.fillRect(progressBarX, currentY - barConf.height + 5, barConf.width, barConf.height);

                const progress = serverData.currentPlayers / serverData.maxPlayers;
                ctx.fillStyle = barConf.fill_color;
                ctx.fillRect(progressBarX, currentY - barConf.height + 5, barConf.width * progress, barConf.height);

                // 绘制进度条旁的玩家数量文本
                ctx.fillStyle = textConf.color;
                ctx.fillText(playerText, progressBarX + barConf.width + barConf.text_offset_x, currentY);
                break;
            }
        }
    });
}

/**
 * 渲染 'simple_background' 模板
 */
async function renderSimpleBackground(ctx, conf, data) {
    const { lines, backgroundPath, iconOptions } = data;
    if (lines.length !== 7) throw new Error('必须是 7 行文字');

    // 1. 绘制背景
    const bg = await loadImage(backgroundPath || conf.default_background_path);
    ctx.drawImage(bg, 0, 0, conf.width, conf.height);

    // 2. 绘制可选图标
    if (iconOptions) {
        const icon = await loadImage(iconOptions.base64Icon);
        const x = iconOptions.x ?? conf.icon.default_x;
        const y = iconOptions.y ?? conf.icon.default_y;
        const size = iconOptions.size ?? conf.icon.default_size;
        ctx.drawImage(icon, x, y, size, size);
    }

    conf.text.lines_format.forEach((format, idx) => {
        // 使用辅助函数生成最终文本
        const finalText = interpolate(format, serverData);

        // 获取该行的样式和位置
        const style = conf.text.line_styles[idx];
        const yPos = conf.text.row_top_margins[idx];

        // 应用样式并绘制文本
        ctx.font = `${style.font_size}px "${config.font.name}"`;
        ctx.fillStyle = style.color;
        ctx.fillText(finalText, conf.text.left_margin, yPos);
    });
}

module.exports = { generateImage };