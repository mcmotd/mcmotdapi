// logger.js
const { inspect } = require('util');
var log_level = 5;
try{
    log_level  = require("../config.json").log_level;
}catch{}


function getSystemTime() {
    const now = new Date();

    // --- 日期部分 ---
    const year = now.getFullYear(); // 获取四位数的年份，例如 2025
    const month = now.getMonth() + 1; // 获取月份 (0-11)，所以需要加 1
    const day = now.getDate(); // 获取日 (1-31)

    // --- 时间部分 ---
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // --- 格式化：为单位数补零 ---
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(day).padStart(2, '0');

    const paddedHours = String(hours).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    // --- 拼接并返回最终结果 ---
    const datePart = `${year}-${paddedMonth}-${paddedDay}`;
    const timePart = `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;

    return `${datePart} ${timePart}`;
}

class Logger {
    static COLORS = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        cyan: '\x1b[36m',
        gray: '\x1b[90m',
        magenta: '\x1b[35m'
    };

    static LEVEL = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 };
    static level = log_level;

    static _log(lv, color, ...args) {
        if (lv > Logger.level) return;
        const time = getSystemTime();//new Date().toTimeString().slice(0,8);
        const prefix = `${Logger.COLORS.gray}[${time}]${Logger.COLORS.reset}`;
        const levelStr = `${color}${Object.keys(Logger.LEVEL)[lv]}${Logger.COLORS.reset}`;
        const body = args.map(a => typeof a === 'object' ? inspect(a, { colors: true, depth: 3 }) : a).join(' ');
        console.log(`${prefix} ${levelStr} ${body}`);
    }

    static error(...a) { Logger._log(0, Logger.COLORS.red, ...a); }
    static warn(...a) { Logger._log(1, Logger.COLORS.yellow, ...a); }
    static info(...a) { Logger._log(2, Logger.COLORS.cyan, ...a); }
    static debug(...a) { Logger._log(3, Logger.COLORS.gray, ...a); }
    static trace(...a) { Logger._log(4, Logger.COLORS.magenta, ...a); }
}

module.exports = Logger;