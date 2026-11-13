const express = require('express');
const router = express.Router();
const configService = require('../services/configService');
const Logger = require('../utils/logger');
const { requireAuth } = require('../middleware/auth');

/**
 * 配置写入接口
 *
 * 前端 ConfigEditor 一直 POST /api/update，但后端这段代码被整段注释掉了，
 * 所以后台“保存”永远失败。这里补回来，并做了三件事：
 * 1. 需要登录（token）；
 * 2. 只允许改白名单内的配置项，禁止 __proto__ 之类的原型链注入；
 * 3. 原子写（tmp + rename），写失败不会留下半个文件。
 */
router.post('/', requireAuth, (req, res) => {
    const { target = 'front', key = '', value, updates } = req.body || {};

    try {
        // 支持批量提交：[{target,key,value}, ...]
        if (Array.isArray(updates)) {
            const results = [];
            for (const item of updates) {
                results.push(configService.update({
                    target: item.target || target,
                    key: item.key || '',
                    value: item.value,
                }));
            }
            return res.json({
                success: true,
                message: `已保存 ${results.length} 项配置。`,
                restartRequired: results.some(r => r.restartRequired),
                results,
            });
        }

        const result = configService.update({ target, key, value });
        const label = key ? `${target}.${key}` : target;
        Logger.info('[CONFIG]', `配置已更新: ${label}`);

        return res.json({
            success: true,
            message: `配置项 "${label}" 已保存。${result.restartRequired ? '（该项需要重启服务后生效）' : ''}`,
            restartRequired: result.restartRequired,
            result,
        });
    } catch (err) {
        Logger.warn('[CONFIG]', `配置更新失败: ${err.message}`);
        return res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
