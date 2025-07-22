import { createI18n } from 'vue-i18n';
import { defaultConfig } from './config/app.config';
// 导入我们创建的语言文件
import en from './locales/en.json';
import zhCN   from './locales/zh-CN.json';

// 创建 i18n 实例
const i18n = createI18n({
    // [重要] 指定 Composition API 模式
    legacy: false,

    // 默认语言环境
    locale: defaultConfig.i18n.default,

    // 当在默认语言环境中找不到翻译时，回退到该语言环境
    fallbackLocale: 'en',

    // 所有的语言环境消息
    messages: {
        en: en,
        'zh-CN': zhCN,
    },
});

// 导出 i18n 实例，以便在 main.js 中使用
export default i18n;