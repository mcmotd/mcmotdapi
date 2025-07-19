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

const W = 640;
const H = 320;
const LEFT_MARGIN = 60;                          // 文字左起点
const FONT_FILE = path.join(__dirname, '../../', 'Assets/Fonts', 'font.ttf'); // 像素字体

// 每行文字「上边距」数组（行顶部到画布顶部）
const rowTopMargins = [30, 80, 120, 160, 200, 240, 280];

/**
 * 背景图 + 7 行像素文字
 * @param {string} bgPath   背景图
 * @param {string} outPath  输出图
 * @param {string[]} lines  7 行文字
 */
 async function text4img(bgPath,  lines) {
    if (lines.length !== 7) throw new Error('必须 7 行文字');

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
        const fs = idx === 0 ? 24 : 28;               // 字号
        const fill = idx === 0 ? '#000000' : '#ffffff'; // 颜色
        svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${fill}">${txt}</tspan>`;
    });

    svg += '</text></svg>';

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * 背景图 + 任意报错
 * @param {string} bgPath   背景图
 * @param {string} outPath  输出图
 * @param {string[]} lines  报错
 */
async function error4img(bgPath, lines) {
    if (lines.length > 7) throw new Error('必须小于 7 行文字');

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
        const fs = idx === 0 ? 24 : 28;               // 字号
        const fill = idx === 0 ? '#000000' : '#ffffff'; // 颜色
        svg += `<tspan x="${LEFT_MARGIN}" y="${rowTopMargins[idx]}" font-size="${fs}" fill="${fill}">${txt}</tspan>`;
    });

    svg += '</text></svg>';

    return await sharp(Buffer.from(svg)).png().toBuffer();
}

module.exports = {text4img,error4img}

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