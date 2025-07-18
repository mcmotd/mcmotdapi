// src/config/app.config.js

export const defaultConfig = {
    header: {
        title: 'MC 服务器状态查询',
        description: '我的世界基岩版/JAVA版本服务器实时状态，随时随地查看你的服务器信息。',
    },
    serverAddress: 'play.easecation.net',
    port: '19132',

    embed: {
        baseUrl: '/iframe'
    },

    api:{
        baseUrl:"/api"
    },

    footer: {
        developer: {
            name: 'Your Name',
            url: 'https://github.com/your-repo',
        },
        poweredBy: {
            name: 'Gemini',
            url: 'https://gemini.google.com/',
        },
        company: {
            name: 'Google',
            url: 'https://google.com',
        }
    }
};
