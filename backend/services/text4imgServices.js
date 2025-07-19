const fs = require('fs');
const path = require('path');
// 1. 引入 node-canvas 的主要功能
const { createCanvas, loadImage, registerFont } = require('canvas');

const W = 640;
const H = 360;
const LEFT_MARGIN = 30; // 文字左側邊距
// 2. 將字體檔案路徑改為相對路徑（建議）
const FONT_FILE = path.join(__dirname,"../", 'HYPixel.ttf');
// 3. 給您的字體起一個在程式碼中使用的名字
const FONT_NAME = 'HYPixel';

// 每行文字「上邊距」數組（文字頂部到畫布頂部的距離）
// 注意：在 canvas 中，這個 y 座標是文字的基線(baseline)，所以我們可能需要微調
const rowTopMargins = [35, 90, 135, 185, 235, 285, 335];

/**
 * [Canvas 版本] 使用背景圖和 7 行像素文字產生圖片
 * @param {string} bgPath 背景圖路徑
 * @param {string[]} lines 7 行文字
 * @returns {Buffer} PNG 圖片的 Buffer
 */
async function text4img(bgPath, lines) {
  if (lines.length !== 7) throw new Error('必須是 7 行文字');

  // 4. 註冊您的自訂字體檔案
  // 這一步告訴 node-canvas：「當我說要用 'HYPixel' 這個字體時，請到這個檔案去找」
  registerFont(FONT_FILE, { family: FONT_NAME });

  // 5. 載入背景圖片
  const background = await loadImage(bgPath);

  // 6. 建立一個和背景圖一樣大的畫布
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext('2d');

  // 7. 將背景圖繪製到畫布上
  ctx.drawImage(background, 0, 0, background.width, background.height);

  // 8. 逐行繪製文字
  lines.forEach((txt, idx) => {
    const fontSize = idx === 0 ? 24 : 35; // 字號
    const fillColor = idx === 0 ? '#000000' : '#ffffff'; // 顏色

    // 設定這一行的文字樣式
    ctx.font = `${fontSize}px "${FONT_NAME}"`;
    ctx.fillStyle = fillColor;

    // 消除文字鋸齒，讓像素字體更清晰
    ctx.imageSmoothingEnabled = false;

    // 在指定位置繪製文字
    // ctx.fillText(文字, x座標, y座標)
    ctx.fillText(txt, LEFT_MARGIN, rowTopMargins[idx]);
  });

  // 9. 將畫布內容轉換為 PNG 格式的 Buffer 並返回
  return canvas.toBuffer('image/png');
}

module.exports = { text4img }

/* ===== CLI 測試 ===== */
// 您可以取消註解這段程式碼來直接執行測試
// (async () => {
//     const bgPath = path.join(__dirname, 'bg.png');
//     const outPath = path.join(__dirname, 'out_canvas.png'); // 輸出為新檔名以便比較

//     const buffer = await text4img(bgPath, [
//         'MOTD：EaseCation EC BLOCK PARTY EC',
//         '伺服器地址：mc.example.com',
//         '伺服器版本： 1.20.1',
//         '線上玩家：42/100',
//         '延遲：23ms',
//         '遊戲模式：Survial',
//         '存檔名稱：The World'
//     ]);

//     fs.writeFileSync(outPath, buffer);
//     console.log('✅ 已使用 node-canvas 產生 out_canvas.png');
// })();