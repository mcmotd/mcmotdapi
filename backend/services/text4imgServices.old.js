const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// --- 配置区域 ---
// 1. 字体配置 (请确保路径正确)
const FONT_FILE = './HYPixel.ttf'; // 替换为您的字体文件路径
const FONT_NAME = 'HYPixel';
try {
  registerFont(FONT_FILE, { family: FONT_NAME });
} catch (e) {
  console.error(`[错误] 字体文件加载失败: ${FONT_FILE}。请确保文件存在于正确路径。`);
  process.exit(1);
}

// 2. 图片尺寸
const W = 640;
const H = 360;

/**
 * 创建一个充满科技符号（加号、方块、线条）的暗色科技背景
 * @returns {Buffer} PNG 图片的 Buffer
 */
function createDarkTechBackground() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // --- 新的暗色调配色方案 ---
  const bgColor = '#0d1b1e';      // 已修改：深邃的蓝黑色背景
  const symbolColor = '#2a4a4f'; // 已修改：低调的青色符号，用以增加背景的纹理感

  // 填充背景色
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // 绘制大量随机符号
  ctx.font = `14px "${FONT_NAME}"`;
  ctx.fillStyle = symbolColor;
  ctx.textAlign = 'center';

  const symbols = ['+', '□', '—', '*', '/', '<', '>']; // 增加更多符号
  const symbolCount = 350; // 增加密度

  for (let i = 0; i < symbolCount; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    ctx.fillText(randomSymbol, x, y);
  }

  return canvas.toBuffer('image/png');
}


/**
 * 根据服务器数据生成一张状态信息图（暗色调版本）
 * @param {object} serverData 包含所有服务器信息的对象
 * @returns {Promise<Buffer>} PNG 图片的 Buffer
 */
async function createServerStatusImage(serverData) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = false;

  // 1. 绘制新的暗色背景
  const background = await loadImage(createDarkTechBackground());
  ctx.drawImage(background, 0, 0, W, H);

  // --- 新的文字和元素颜色 ---
  const textColor = '#cceae7'; // 已修改：高对比度的浅青色文本
  ctx.fillStyle = textColor;

  // 2. 绘制标题和状态指示灯
  ctx.font = `28px "${FONT_NAME}"`;
  ctx.textAlign = 'left';
  ctx.fillText('服务器状态', 30, 50);

  // 状态灯 (颜色不变，在暗色背景下效果更好)
  const lightX = W - 45;
  const lightY = 40;
  const lightRadius = 12;
  ctx.save();
  if (serverData.isOnline) {
    ctx.fillStyle = '#4caf50';
    ctx.shadowColor = '#4caf50';
  } else {
    ctx.fillStyle = '#f44336';
    ctx.shadowColor = '#f44336';
  }
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. 绘制详细信息
  const startY = 110;
  const lineHeight = 42;
  const leftMargin = 30;
  ctx.font = `22px "${FONT_NAME}"`;
  ctx.fillStyle = textColor;

  const infoLines = [
    `服务器地址:  ${serverData.serverAddress}`,
    `游戏版本:  ${serverData.version}`,
    `在线玩家:`,
    `网络延迟:  ${serverData.latency}ms`,
    `当前地图:  ${serverData.worldName}`,
    `MOTD:  ${serverData.motd}`,
  ];

  infoLines.forEach((line, index) => {
    ctx.fillText(line, leftMargin, startY + index * lineHeight);
  });

  // 4. 绘制玩家数量和进度条 (颜色调整)
  const playerLineY = startY + 2 * lineHeight;
  const playerText = `${serverData.currentPlayers} / ${serverData.maxPlayers}`;
  const playerTextMetrics = ctx.measureText('在线玩家:  ');
  const progressBarX = leftMargin + playerTextMetrics.width + 10;
  const progressBarWidth = 250;
  const progressBarHeight = 20;

  // 绘制进度条背景
  ctx.fillStyle = '#333333'; // 已修改：深灰色进度条背景
  ctx.fillRect(progressBarX, playerLineY - progressBarHeight + 5, progressBarWidth, progressBarHeight);

  // 绘制进度条前景
  const progress = serverData.currentPlayers / serverData.maxPlayers;
  ctx.fillStyle = '#4caf50'; // 保持清晰的绿色
  ctx.fillRect(progressBarX, playerLineY - progressBarHeight + 5, progressBarWidth * progress, progressBarHeight);

  // 绘制玩家数量文本
  ctx.fillStyle = textColor;
  ctx.fillText(playerText, progressBarX + progressBarWidth + 15, playerLineY);

  return canvas.toBuffer('image/png');
}


// --- 如何使用 ---
(async () => {
  // 1. 准备服务器信息对象
  const serverData = {
    isOnline: true,
    serverAddress: 'play.pixelverse.fun',
    version: '1.20.4 Fabric',
    currentPlayers: 78,
    maxPlayers: 150,
    latency: 28,
    worldName: '主世界 - 永恒大陆',
    motd: '一个充满创造与冒险的像素世界!',
  };

  console.log('正在生成暗色调服务器状态图片...');

  // 2. 调用主函数生成图片
  const finalImageBuffer = await createServerStatusImage(serverData);

  // 3. 保存到文件 (使用新文件名)
  const outputPath = path.join(__dirname, 'server_status_dark.png');
  fs.writeFileSync(outputPath, finalImageBuffer);

  console.log(`✅ 图片已成功生成: ${outputPath}`);
})();