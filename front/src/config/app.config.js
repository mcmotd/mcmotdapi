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
    },

    failureState: {
        sloganApi: 'https://v1.hitokoto.cn/?encode=text', 
        defaultSlogan: '山高路远，后会有期。', 
        subtext: '服务器未响应或不存在', 
    },
    client: {
        // 点击“下载”按钮后跳转的网页地址
        downloadUrl: 'https://www.minecraft.net/zh-hans/download' // 这里可以替换为您指定的下载页面
    },
    contributors: [
        {
            name: 'Sbaoor',
            title: '项目发起人 & 全栈开发',
            github: 'https://github.com/Sbaoor-fly',
            slogan: '把宇宙的问候写进第一行，把余生的热爱写进每一行。',
            // 头像可以直接使用 GitHub 的，格式为 https://github.com/用户名.png
            avatar: 'https://s21.ax1x.com/2025/07/19/pV3bX2F.jpg'
        }
    ]
};