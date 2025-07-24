const fs = require('fs');
const path = require('path');
// 1. 引入 node-canvas 的主要功能
const { createCanvas, loadImage, registerFont } = require('canvas');
const { customsFont } = require("../config.json")

const W = 640;
const H = 360;
const LEFT_MARGIN = 30; // 文字左側邊距
// 2. 將字體檔案路徑改為相對路徑（建議）
const FONT_FILE = customsFont;// path.join(__dirname,"../", 'HYPixel.ttf');
// 3. 給您的字體起一個在程式碼中使用的名字
const FONT_NAME = 'HYPixel';

// 每行文字「上邊距」數組（文字頂部到畫布頂部的距離）
// 注意：在 canvas 中，這個 y 座標是文字的基線(baseline)，所以我們可能需要微調
const rowTopMargins = [35, 90, 135, 185, 235, 285, 335];

/**
 * [Canvas 版本] 使用背景圖、7 行像素文字及一個可選圖示產生圖片
 * @param {string} bgPath 背景圖路徑
 * @param {string[]} lines 7 行文字
 * @param {object} [iconOptions] 可選的圖示設定
 * @param {string} iconOptions.base64Icon Base64 編碼的圖示字串 (例如: 'data:image/png;base64,...')
 * @param {number} iconOptions.x 圖示左上角的 x 座標
 * @param {number} iconOptions.y 圖示左上角的 y 座標
 * @param {number} iconOptions.size 圖示的寬度和高度（因為是 1:1）
 * @returns {Buffer} PNG 圖片的 Buffer
 */
async function text4img(bgPath, lines, iconOptions) {
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

  // =================================================================
  // 新增功能：如果提供了圖示選項，則繪製圖示
  // =================================================================
  if (iconOptions && iconOptions.base64Icon && iconOptions.x !== undefined && iconOptions.y !== undefined && iconOptions.size !== undefined) {
    try {
      // 直接從 Base64 Data URI 載入圖示
      const icon = await loadImage(iconOptions.base64Icon);
      // 將圖示繪製到畫布的指定位置和大小
      ctx.drawImage(icon, iconOptions.x, iconOptions.y, iconOptions.size, iconOptions.size);
    } catch (error) {
      console.error('載入或繪製 Base64 圖示時出錯:', error);
      // 您可以選擇在這裡拋出錯誤或忽略它
    }
  }

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
// 您可以取消註解這段程式碼來直接執行測試，它示範了如何添加圖示
/*
(async () => {
    const bgPath = path.join(__dirname, 'bg.png');
    // 輸出為新檔名以便比較
    const outPath = path.join(__dirname, 'out_canvas_with_icon.png'); 

    // 這是一個範例 Base64 圖示（一個 64x64 的簡單灰色方塊）
    // 請替換為您自己的 Base64 字串
    const sampleBase64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAARlJREFUeJzt2sENglAQBEEQyB5gA7gBO4AT2IEduIEduIEbWAIKSg/h7uxC4g/y7n5P5n4iSULS5M9cADsAuwA7ALsAOwA7ADuAewEwz/PT2gGg2gGg2gGg2gGg2gGg2gFgGgCgGQBgGgBgGgBgGgBgGgBgGgBgGgBgGgBgGgBgGgBgGgCgGaD/LwD43wKgzgDoDIDODIDsAMgMgMwAyAyAzADIDIDMAIgMgMgAiAyAiACICICIAIgIgIgA8P+rAOC/DXB+5/h+dwB0B0B0AEQEQEQARARARABEBDB/g3s3gKkAsAJABQAVAFQAUAFQAUAFQAUAFQAUgNEAGAwAYQCIBSAqgKACggoIKiCogiAKgCgAYQHMAuwA7ADsAIg7wGP3F0e9S9LPAAAAAElFTkSuQmCC';

    // 定義圖示的位置和大小
    const iconOptions = {
        base64Icon: sampleBase64Icon,
        x: 520,  // 距離左邊 520px
        y: 40,   // 距離頂部 40px
        size: 80 // 顯示為 80x80 px
    };

    const buffer = await text4img(bgPath, [
        'MOTD：EaseCation EC BLOCK PARTY EC',
        '伺服器地址：mc.example.com',
        '伺服器版本： 1.20.1',
        '線上玩家：42/100',
        '延遲：23ms',
        '遊戲模式：Survial',
        '存檔名稱：The World'
    ], iconOptions); // 將圖示選項作為第三個參數傳入

    fs.writeFileSync(outPath, buffer);
    console.log('✅ 已使用 node-canvas 產生 out_canvas_with_icon.png');
})();
*/