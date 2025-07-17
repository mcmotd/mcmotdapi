// src/config/app.config.js

export const defaultConfig = {
    // ... header 和 serverAddress 配置不变 ...
    header: {
        title: 'MC 服务器状态查询',
        description: '的世界基岩版/JAVA版本服务器实时状态，随时随地查看你的服务器信息。',
    },
    serverAddress: 'play.easecation.net',
    port: '19132',

    // [新增] 嵌入代码生成器的配置
    embed: {
        // 这里是您提供 iframe 内容的页面的基础URL
        // 作为示例，我们暂时指向一个不存在的地址
        // 部署后您应将其替换为真实地址
        baseUrl: '/iframe'
    },

    api:{
        baseUrl:"/api"
    },

    // [核心改动] 将 footer 配置完全拆分
    footer: {
        developer: {
            name: 'Your Name', // 替换为你的名字或ID
            url: 'https://github.com/your-repo', // 你的链接
        },
        poweredBy: {
            name: 'Gemini', // 驱动方名称
            url: 'https://gemini.google.com/', // 驱动方链接
        },
        company: {
            name: 'Google', // 公司名称
            url: 'https://google.com', // 公司链接
        }
    }
};