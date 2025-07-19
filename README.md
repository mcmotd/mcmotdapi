# 🚀 MC-MOTD-API  
> 基于 Node.js 的 Minecraft 服务器 MOTD 实时查询与展示服务  
> 前后端分离，前端 Vite + Vue3，后端 Express + JavaScript

---

## 1. 🛠️ 环境要求

| 工具      | 最低版本 | 推荐版本 |
|-----------|----------|----------|
| Node.js   | >= 24.4    | 24.4.0   |
| pnpm / npm / yarn | 任意 | pnpm 8+ |

---

## 2. 📥 安装步骤

```bash
# 克隆仓库
git clone https://github.com/Sbaoor-fly/mcmotdapi.git
cd mcmotdapi

# 安装后端依赖
cd backend
pnpm install         # 或 npm install / yarn

# 安装前端依赖
cd ../front
pnpm install
```

---

## 3. ✏️修改配置

后端配置文件位于`backed/config`

<details>
  <summary>点击展开</summary>

``` json
{
  "javaDefaultPort": 25565,  // java版本默认查询端口
  "bedrockDefaultPort": 19132,  // 基岩版默认查询端口
  "queryTimeout": 1000,  // 查询超时时间
  "serverPort": 3123,  // 服务监听的端口
  "log_level": 2  //日志等级
}
```

</details>



前端配置文件位于`front/src/config/app.config.js`

<details>
  <summary>点击展开</summary>

``` js
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
        sloganApi: 'https://v1.hitokoto.cn/?encode=text',   //可以从语言api获取提示语
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
            avatar: 'https://s21.ax1x.com/2025/07/19/pV3bX2F.jpg'
        }
    ]
};
```

</details>

---

## 4. 🏁 启动项目

| 步骤 | 命令 | 说明 |
|------|------|------|
| ① 编译静态文件 | `npm run build` | 如果出现报错升级Nodejs版本到最新版 |
| ② 启动前端 | `npm run start`   | 默认监听 `http://localhost:3123` |

> 浏览器打开 `http://localhost:3123` 即可查看效果。

---

## 5. 🧪 一键脚本（可选）

在项目根目录添加 `start.sh`（Linux/macOS）或 `start.bat`（Windows）：

**start.sh**
```bash
#!/usr/bin/env bash
npm run build
npm run start
wait
```
 
**start.bat**
```bat
@echo off
npm run build
npm run start
```

赋予可执行权限后，只需 `./start.sh` 或双击 `start.bat` 即可同时启动前后端。

---

## 6. 📦 构建生产版本
```bash
# 前端打包
cd front
npm run build      # 输出到 ../backend/dist
```

打包完成后，后端静态目录 `backend/dist` 即包含前端资源，可直接部署。

---

## 7. 🎨 预览

[![pV3dDgJ.png](https://s21.ax1x.com/2025/07/18/pV3dDgJ.png)](https://imgse.com/i/pV3dDgJ)
[![pV3drv9.png](https://s21.ax1x.com/2025/07/18/pV3drv9.png)](https://imgse.com/i/pV3drv9)

---

## License

MIT © Sbaoor-Fly