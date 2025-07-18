// logger.js
const { inspect } = require('util');

class Logger {
    // 基础颜色
    static COLORS = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        gray: '\x1b[90m'
    };

    // 统一打印
    static _log(level, color, ...args) {
        const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const prefix = `${Logger.COLORS.gray}[${time}]${Logger.COLORS.reset}`;
        const levelStr = `${color}[${level.toUpperCase()}]${Logger.COLORS.reset}`;
        const body = args.map(a => typeof a === 'object' ? inspect(a, { colors: true, depth: 4 }) : a).join(' ');

        console.log(`${prefix} ${levelStr} ${body}`);
    }

    static info(...a) { Logger._log('info', Logger.COLORS.cyan, ...a); }
    static warn(...a) { Logger._log('warn', Logger.COLORS.yellow, ...a); }
    static error(...a) { Logger._log('error', Logger.COLORS.red, ...a); }
    static debug(...a) { Logger._log('debug', Logger.COLORS.gray, ...a); }
    static ok(...a) { Logger._log('ok', Logger.COLORS.green, ...a); }
}

module.exports = Logger;