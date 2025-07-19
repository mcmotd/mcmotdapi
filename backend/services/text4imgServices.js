// // add7SourceHan.js
// const fs = require('fs');
// const path = require('path');
// const sharp = require('sharp');

// const W = 640;
// const H = 320;
// const LEFT_MARGIN = 60;
// const FONT_FILE = path.join(`C:\\Users\\lition\\Downloads\\Press_Start_2P`, 'PressStart2P-Regular.otf'); // ← 方正字体

// // 每行文字「上边距」数组（行顶部到画布顶部距离）
// const rowTopMargins = [30, 80, 120, 160, 200, 240, 280];

// /**
//  * 背景图 + 7 行文字（第一行大字号，其余小字号，使用方正字体）
//  * @param {string} bgPath   背景图
//  * @param {string} outPath  输出图
//  * @param {string[]} lines  7 行文字
//  */
// async function add7SourceHan(
//     bgPath,
//     outPath,
//     lines
// ) {
//     if (lines.length !== 7) throw new Error('必须 7 行文字');

//     // 背景图 → base64
//     const bgBuffer = fs.readFileSync(bgPath);
//     const ext = path.extname(bgPath).slice(1);
//     const bgBase64 = `data:image/${ext};base64,${bgBuffer.toString('base64')}`;

//     // 构造 SVG
//     let svg = `
//   <svg width="${W}" height="${H}">
//     <image href="${bgBase64}" width="${W}" height="${H}" />
//     <text font-family="${FONT_FILE}" 
//           fill="#ffffff" 
//           shape-rendering="crispEdges"   <!-- 关闭抗锯齿 -->
//           text-rendering="optimizeSpeed">`;

//     lines.forEach((txt, idx) => {
//         const fs = idx === 0 ? 20 : 28; // 第一行 28px，其余 14px
//         // svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${idx === 0 ? '#000000' : '#ffffff'}">${txt}</tspan>`;
//         svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${idx === 0 ? '#000000' : '#ffffff'}">${txt}</tspan>`;
//         // svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}">${txt}</tspan>`;
//     });

//     svg += '</text></svg>';

//     await sharp(Buffer.from(svg)).png().toFile(outPath);
// }

// /* ===== CLI 测试 ===== */
// (async () => {
//     const bgPath = path.join(__dirname, 'bg.png');
//     const outPath = path.join(__dirname, 'out.png');

//     await add7SourceHan(bgPath, outPath, [
//         'MOTD : EaseCation EC BLOCK PARTY EC',
//         'IP: mc.example.com',
//         '版本 1.20.1',
//         '在线 42/100',
//         '延迟 23 ms',
//         'Powered by Node.js',
//         'Enjoy!'
//     ]);

//     console.log('✅ 已生成 out.png（方正字体）');
// })();


// add7Pixel.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const puppeteer = require('puppeteer');

const W = 640;
const H = 360;
const LEFT_MARGIN = 30;                          // 文字左起点
const FONT_FILE = path.join(__dirname, '../../', 'Assets/Fonts', 'font.ttf'); // 像素字体
console.log(FONT_FILE)

// 每行文字「上边距」数组（行顶部到画布顶部）
const rowTopMargins = [35, 90, 135, 185, 235, 285, 335];

/**
 * 背景图 + 像素文字
 * @param {string} bgPath   背景图
 * @param {string[]} lines  文字
 */
async function text4imgFont(bgPath, lines) {
    if (!fs.existsSync(FONT_FILE)) {
        throw new Error('Font file not found');
    }

    // 背景图 → base64
    const bgBuffer = fs.readFileSync(bgPath);
    const ext = path.extname(bgPath).slice(1);
    const bgBase64 = `data:image/${ext};base64,${bgBuffer.toString('base64')}`;

    // 构造 SVG
    let svg = `
    <svg width="${W}" height="${H}">
      <defs>
        <style type="text/css">
          @font-face {
            font-family: 'CustomFont';
            src: url(data:application/x-font-ttf;charset=utf-8;base64,${fs.readFileSync(FONT_FILE).toString('base64')}) format('ttf');
          }
        </style>
      </defs>
      <image href="${bgBase64}" width="${W}" height="${H}" />
      <text font-family="CustomFont"
            shape-rendering="crispEdges"
            text-rendering="optimizeSpeed">`;

    lines.forEach((txt, idx) => {
        const fs = idx === 0 ? 24 : 35;               // 字号
        const fill = idx === 0 ? '#000000' : '#ffffff'; // 颜色
        svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${fill}">${txt}</tspan>`;
    });

    svg += '</text></svg>';

    //console.log('Generated SVG:', svg);

    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process',
            '--no-zygote',
            '--disable-gpu',
            '--max-old-space-size=128'
        ]
    });
    const page = await browser.newPage();

    await page.setContent(`
        <html>
            <body style="margin: 0; padding: 0;">
                <div id="svg-container" style="width: ${W}px; height: ${H}px;">${svg}</div>
            </body>
        </html>
    `);

    const fontBase64 = fs.readFileSync(FONT_FILE).toString('base64')

    
    await page.evaluate(async (fontBase64) => {
        const font = new FontFace('CustomFont', `url(data:application/x-font-ttf;charset=utf-8;base64,${fontBase64})`);
        try {
            await font.load();
            document.fonts.add(font);
            console.log('字体 CustomFont 已加载完成');
            window.puppeteerReadyState = 'complete';
        } catch (error) {
            console.error('字体加载失败', error);
            window.puppeteerReadyState = 'error'; // 标记为错误状态
        }
    },fontBase64);
    

    try {
        await page.waitForFunction(() => window.puppeteerReadyState === 'complete', { timeout: 30000 });
    } catch (error) {
        console.error('等待字体加载超时或失败', error);
        await browser.close();
        throw error;
    }

    const pngBuffer = await page.screenshot({
        clip: {
            x: 0,
            y: 0,
            width: W,
            height: H
        }
    });

    await browser.close();
    return pngBuffer;
}

/**
 * 背景图 + 文字
 * @param {string} bgPath   背景图
 * @param {string[]} lines  文字
 */
async function text4imgSharp(bgPath, lines) {
    // 背景图 → base64
    const bgBuffer = fs.readFileSync(bgPath);
    const ext = path.extname(bgPath).slice(1);
    const bgBase64 = `data:image/${ext};base64,${bgBuffer.toString('base64')}`;

    // 构造 SVG
    let svg = `
    <svg width="${W}" height="${H}">
      <image href="${bgBase64}" width="${W}" height="${H}" />
      <text font-family="${FONT_FILE}"
            shape-rendering="crispEdges"
            text-rendering="optimizeSpeed">`;

    lines.forEach((txt, idx) => {
        const fs = idx === 0 ? 24 : 35;               // 字号
        const fill = idx === 0 ? '#000000' : '#ffffff'; // 颜色
        svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${fill}">${txt}</tspan>`;
    });

    svg += '</text></svg>';

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * 背景图 + 文字
 * @param {string} bgPath   背景图
 * @param {string[]} lines  文字
 */
async function text4img(bgPath,lines){
    let pngBuffer;
    try{
        pngBuffer = await text4imgFont(bgPath, lines);
    }
    catch(_){
        pngBuffer = await text4imgSharp(bgPath, lines);
    }
    return pngBuffer;
}

/**
 * 背景图 + 7 行像素文字
 * @param {string} bgPath   背景图
 * @param {string[]} lines  7 行文字
 */
async function GenerateStatusImg(bgPath, lines){
    if (lines.length !== 7) throw new Error('必须 7 行文字');
    return await text4img(bgPath, lines);
}

module.exports = { text4img, GenerateStatusImg }

/* ===== CLI 测试 ===== */
// (async () => {
//     const bgPath = path.join(__dirname, 'bg.png');
//     const outPath = path.join(__dirname, 'out.png');

//     await add7Pixel(bgPath, outPath, [
//         'MOTD：EaseCation EC BLOCK PARTY EC',
//         '服务器地址：mc.example.com',
//         '服务器版本： 1.20.1',
//         '在线玩家：42/100',
//         '延迟：23ms',
//         '游戏模式：Survial',
//         '存档名称：The World'
//     ]);

//     console.log('✅ 已生成像素风 out.png');
// })();