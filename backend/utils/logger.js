// logger.js
const { inspect } = require('util');
const { log_level } = require("../config.json");

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
        const time = new Date().toISOString().slice(11, 19);
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