// ===== 完整调用示例 =====
// 假设这是您的主执行文件

const fs = require('fs');
const path = require('path');
// 假设 text4img 和 createGreenPixelBackground 都在这个文件里
const { text4img } = require('./text4imgServices.old.js');
const { createCanvas, loadImage, registerFont } = require('canvas'); // 确保引入了 canvas 的功能

// 【第一步】在这里定义和实现上面那个 createGreenPixelBackground 函数
/**
 * 程序化生成一个黑绿色像素扁平风格的背景图...
 * (将上面的函数代码复制到这里)
 */
function createGreenPixelBackground(width, height) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const bgColor = '#08140A';
    const accentColor = '#00FF41';
    const accentColorDark = '#008a23';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, width, 40);
    ctx.fillStyle = accentColorDark;
    for (let i = 0; i < 5; i++) {
        const y = Math.floor(Math.random() * (height - 60)) + 60;
        const x = Math.floor(Math.random() * (width / 2));
        const w = Math.floor(Math.random() * (width / 2)) + 50;
        ctx.fillRect(x, y, w, 2);
    }
    return canvas.toBuffer('image/png');
}


// 【第二步】在主逻辑中调用它们
(async () => {
    const outPath = path.join(__dirname, 'out_green_pixel_style.png');

    // 1. 调用函数，在内存中生成背景图 Buffer
    // 尺寸和之前保持一致 (640x360)
    const backgroundBuffer = createGreenPixelBackground(640, 360);

    // (可选) 如果您想先看看背景长什么样，可以取消下面的注释
    // fs.writeFileSync('debug_background.png', backgroundBuffer);

    // 要绘制的文字内容 (保持不变)
    const lines = [
        'MOTD：EaseCation EC BLOCK PARTY EC',
        '伺服器地址：mc.example.com',
        '伺服器版本： 1.20.1',
        '線上玩家：42/100',
        '延遲：23ms',
        '遊戲模式：Survial',
        '存檔名称：The World'
    ];

    // 2. 将生成的 backgroundBuffer 直接作为第一个参数传给 text4img
    //    它会取代之前的文件路径 'bg.png'
    const finalImageBuffer = await text4img(backgroundBuffer, lines);

    // 3. 保存最终的图片
    fs.writeFileSync(outPath, finalImageBuffer);
    console.log(`✅ 已生成新的风格图片: ${outPath}`);
})();