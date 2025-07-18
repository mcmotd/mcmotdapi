# 🚀 MC-MOTD-API  
> 基于 Node.js 的 Minecraft 服务器 MOTD 实时查询与展示服务  
> 前后端分离，前端 Vite + Vue3，后端 Express + TypeScript

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

## 3. 🏁 启动项目

| 步骤 | 命令 | 说明 |
|------|------|------|
| ① 启动后端 | `npm run start` | 默认监听 `http://localhost:3123` |
| ② 启动前端 | `npm run build`   | 如果出现报错升级Nodejs版本到最新版 |

> 浏览器打开 `http://localhost:3123` 即可查看效果。

---

## 4. 🧪 一键脚本（可选）

在项目根目录添加 `start.sh`（Linux/macOS）或 `start.bat`（Windows）：

**start.sh**
```bash
#!/usr/bin/env bash
npm run dev
wait
```

**start.bat**
```bat
@echo off
start cmd /k "npm run dev"
```

赋予可执行权限后，只需 `./start.sh` 或双击 `start.bat` 即可同时启动前后端。

---

## 5. 📦 构建生产版本

```bash
# 前端打包
cd front
npm run build      # 输出到 ../backend/dist
```

打包完成后，后端静态目录 `backend/dist` 即包含前端资源，可直接部署。

---

## 6. 🎨 预览

[![pV3dDgJ.png](https://s21.ax1x.com/2025/07/18/pV3dDgJ.png)](https://imgse.com/i/pV3dDgJ)
[![pV3drv9.png](https://s21.ax1x.com/2025/07/18/pV3drv9.png)](https://imgse.com/i/pV3drv9)

---

## License

MIT © Sbaoor-Fly