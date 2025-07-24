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

const rowTopMargins = [35, 90, 135, 185, 235, 285, 335];

async function generateTextImage(bgPath, lines, color = '#ffffff'){
  registerFont(FONT_FILE, { family: FONT_NAME });
  const background = await loadImage(bgPath);
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext('2d');
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

  lines.forEach((txt, idx) => {
    const fontSize = idx === 0 ? 24 : 35; // 字號
    const fillColor = idx === 0 ? '#000000' : color; // 顏色

    ctx.font = `${fontSize}px "${FONT_NAME}"`;
    ctx.fillStyle = fillColor;
    ctx.imageSmoothingEnabled = false;
    ctx.fillText(txt, LEFT_MARGIN, rowTopMargins[idx]);
  });

  return canvas.toBuffer('image/png');
}

/**
 * [Canvas 版本] 使用背景圖和 7 行像素文字產生圖片
 * @param {string} bgPath 背景圖路徑
 * @param {string[]} lines 7 行文字
 * @returns {Buffer} PNG 圖片的 Buffer
 */
async function text4img(bgPath, lines) {
  if (lines.length !== 7) throw new Error('必須是 7 行文字');

  return await generateTextImage(bgPath, lines);
}

/**
 * [Canvas 版本] 使用背景圖和像素文字產生报错圖片
 * @param {string} bgPath 
 * @param {string[]} errorMsg 
 * @returns 
 */
async function error4img(bgPath, errorMsg) {
  const lines = [
    'ERROR',
    errorMsg,
  ];

  return await generateTextImage(bgPath, lines, "#d64552");
}

module.exports = { text4img, error4img }
