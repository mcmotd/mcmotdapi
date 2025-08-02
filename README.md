# 🚀 MC-MOTD-API  
<center>

![](https://s21.ax1x.com/2025/07/21/pV8WvaF.png)

</center>

> 基于 Node.js 的 Minecraft 服务器 MOTD 实时查询与展示服务  
> 前后端分离，前端 Vite + Vue3，后端 Express + JavaScript

---

## 1. 🛠️ 环境要求

| 工具      | 最低版本 | 推荐版本 |
|-----------|----------|----------|
| Node.js   | >= 24.4    | 24.4.0   |
| pnpm / npm / yarn | 任意 | pnpm 8+ |
|python| 3.0| 3.10+|

> 注意，本项目虽然用不到python，但是您在编译node-canvas的时候会使用本地python环境
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

前端配置文件位于`backend/front.json`

图片生成器配置位于`backend/pic.json`

---

## 4. 🏁 启动项目

| 步骤 | 命令 | 说明 |
|------|------|------|
| ① 编译静态文件 | `npm run build:publish` | 如果出现报错升级Nodejs版本到最新版 |
| ② 启动前端 | `npm run start`   | 默认监听 `http://localhost:3123` |

> 浏览器打开 `http://localhost:3123` 即可查看效果。

---

## 5. 🧪 一键脚本（可选）

在项目根目录添加 `start.sh`（Linux/macOS）或 `start.bat`（Windows）：

**start.sh**
```bash
#!/usr/bin/env bash
npm run build:publish
npm run start
wait
```
 
**start.bat**
```bat
@echo off
npm run build:publish
npm run start
```

赋予可执行权限后，只需 `./start.sh` 或双击 `start.bat` 即可同时启动前后端。

---

## 6. 🐳 Docker部署（可选）

1) 拉取项目

``` bash
git clone https://github.com/mcmotd/mcmotdapi.git
```

2) 进行构建

```bash
docker build -t mc-status-app .
```
3) 修改配置文件

这时候的app文件夹里面只有后端配置文件了，前端已经编译完成

参照 [修改配置](#3-️修改配置)

---

## 7. 🎨 预览

[![pV3dDgJ.png](https://s21.ax1x.com/2025/07/18/pV3dDgJ.png)](https://imgse.com/i/pV3dDgJ)
[![pV3drv9.png](https://s21.ax1x.com/2025/07/18/pV3drv9.png)](https://imgse.com/i/pV3drv9)

---

## License

MIT © mcmotd