const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
// const {} = require("../pic.json")

// 1. 加载并解析配置文件
const config = JSON.parse(fs.readFileSync(path.join(__dirname,'../', 'pic.json'), 'utf8'));

// 2. 注册全局字体
try {
    registerFont(config.font.path, { family: config.font.name });
} catch (e) {
    console.error(`[错误] 字体文件加载失败: ${config.font.path}`);
    process.exit(1);
}

/**
 * [新增] 辅助函数：根据路径字符串从对象中安全地取值
 * @param {object} object - 数据源对象, e.g., { players: { online: 10 } }
 * @param {string} path - 路径字符串, e.g., "players.online"
 * @returns {*} 找到的值或 undefined
 */
function resolvePath(object, path) {
    return path.split('.').reduce((obj, key) => (obj && obj[key] !== undefined) ? obj[key] : undefined, object);
}

/**
 * [升级] 替换字符串中的占位符，现在支持嵌套对象
 * @param {string} format - 例如 "在线: {players.online}"
 * @param {object} data - 数据源对象
 * @returns {string}
 */
function interpolate(format, data) {
    if (!format) return '';
    // [修改] 更新正则表达式以匹配带点的路径
    return format.replace(/\{([\w\.]+)\}/g, (match, key) => {
        // 使用 resolvePath 来获取嵌套属性的值
        const value = resolvePath(data, key);
        return value !== undefined ? value : match;
    });
}



/**
 * [新增] 预处理数据，生成特殊字段
 * @param {object} serverData - 原始服务器数据
 * @returns {object} - 混合了特殊字段的新数据对象
 */
function processSpecialFields(serverData) {
    try{
        const processedData = { ...serverData };
        const specialConf = config.special_fields;

        if (!specialConf) return processedData;

        // 1. 处理 MOTD 截断
        if (specialConf.motd_truncate) {
            const conf = specialConf.motd_truncate;
            const sourceText = processedData[conf.source_key] || '';
            if (sourceText.length >= conf.max_length) {
                processedData.motd_truncate = sourceText.substring(0, conf.max_length) + conf.ellipsis;
            } else {
                processedData.motd_truncate = sourceText;
            }
        }

        // 2. 处理时间戳
        if (specialConf.timestamp) {
            const conf = specialConf.timestamp;
            processedData.timestamp = new Date().toLocaleString(conf.locale, conf.options);
        }

        return processedData;
    }catch(e){
        console.error(e);   
    }
}


async function generateImage(templateName, data) {
    const templateConfig = config.templates[templateName];
    if (!templateConfig) throw new Error(`模板 "${templateName}" 在配置文件中未找到。`);

    // [修改] 在渲染前，调用处理函数
    const processedData = processSpecialFields(data.serverData);

    // 将处理后的数据与其他数据合并
    const finalData = { ...data, serverData: processedData };

    const canvas = createCanvas(templateConfig.width, templateConfig.height);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    switch (templateName) {
        case 'dark_tech':
            await renderDarkTech(ctx, templateConfig, finalData.serverData);
            break;
        case 'simple':
            await renderSimpleBackground(ctx, templateConfig, finalData);
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
    ctx.fillStyle = serverData.status == 'online'? lightConf.color_online : lightConf.color_offline;
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
                const playerText = `${serverData.players.online} / ${serverData.players.max}`;

                // 绘制标签
                ctx.fillText(line.label, textConf.start_position.x, currentY);

                // 绘制进度条
                const playerLabelMetrics = ctx.measureText(`${line.label}  `);
                const progressBarX = textConf.start_position.x + playerLabelMetrics.width + barConf.label_offset_x;

                ctx.fillStyle = barConf.bg_color;
                ctx.fillRect(progressBarX, currentY - barConf.height + 5, barConf.width, barConf.height);

                const progress = serverData.players.online / serverData.players.max;
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
    const {serverData, backgroundPath, iconOptions } = data;
    
    // if (lines.length !== 7) throw new Error('必须是 7 行文字');

    // 1. 绘制背景
    const bg = await loadImage(backgroundPath || conf.default_background_path);
    ctx.drawImage(bg, 0, 0, conf.width, conf.height);

    // 2. 绘制可选图标
    if (iconOptions && iconOptions.base64Icon) {
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