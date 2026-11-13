
# 🚀 MC-MOTD-API

[//]: # (Language Switcher)
<p align="center">
  <strong>简体中文</strong> | <a href="./README.md">English</a>
</p>

[//]: # (Badges)
<p align="center">
  <a href="https://github.com/mcmotd/mcmotdapi/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D24.4-brightgreen.svg" alt="Node.js Version"></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-%3E%3D8-orange.svg" alt="PNPM Version"></a>
  <a href="#"><img src="https://img.shields.io/badge/Vue.js-3-42b883.svg" alt="Vue.js"></a>
  <a href="#"><img src="https://img.shields.io/badge/Express.js-4-lightgrey.svg" alt="Express.js"></a>
</p>

[//]: # (Logo)
<p align="center">
  <img src="https://s21.ax1x.com/2025/07/21/pV8WvaF.png" alt="Project Logo">
</p>

> 一款基于 Node.js 的 Minecraft 服务器 MOTD 实时查询与展示服务。
> 前后端分离，前端 Vite + Vue3，后端 Express + JavaScript。

---

## 🎨 效果预览 (Preview)

| 外链拓展 | 主站查询 |
| :---: | :---: |
| [![](https://s21.ax1x.com/2025/07/18/pV3dDgJ.png)](https://imgse.com/i/pV3dDgJ) | [![](https://s21.ax1x.com/2025/07/18/pV3drv9.png)](https://imgse.com/i/pV3drv9) |

---

## 🛠️ 环境要求 (Environment Requirements)

| 工具 (Tool)        | 最低版本 (Minimum) | 推荐版本 (Recommended) |
| ------------------ | ------------------ | ---------------------- |
| Node.js            | `>= 24.4`          | `24.4.0`               |
| pnpm / npm / yarn  | 任意 (Any)         | `pnpm 8+`              |
| Python             | `3.0`              | `3.10+`                |

> **重要提示**: 本项目虽然不直接使用 Python，但在安装 `node-canvas` 依赖时，编译过程会调用您本地的 Python 环境。请确保已正确安装。

---

## 🚀 快速开始 (Getting Started)

### 1. 克隆仓库 (Clone Repository)

``` bash
git clone https://github.com/mcmotd/mcmotdapi.git

cd mcmotdapi
```

### 2\. 安装依赖 (Install Dependencies)

推荐使用 `pnpm` 进行依赖管理。

```bash
# 安装后端依赖
cd backend
pnpm install

# 返回根目录并安装前端依赖
cd ../front
pnpm install
```

### 3\. 修改配置 (Modify Configuration)

所有配置文件均位于 `backend/config/` 目录下，保存后会自动热重载（`serverPort` 与 `database` 需要重启）。

  - **主后端配置**: `backend/config/config.json`
  - **前端配置**: `backend/config/front.json`
  - **图片生成器配置**: `backend/config/pic.json`

#### 数据库：SQLite / MySQL 二选一

`config.json` 的 `database.driver` 决定存储后端，默认 `sqlite`（零依赖，文件为 `backend/data/mcmotd.db`）。

```json
{
  "database": {
    "driver": "mysql",
    "mysql": {
      "host": "127.0.0.1",
      "port": 3306,
      "user": "root",
      "password": "your-password",
      "database": "mcmotd",
      "connectionLimit": 10
    }
  }
}
```

切换驱动后重启服务即可，库与表会自动创建。MySQL 驱动依赖 `mysql2`（已写入 `backend/package.json`）。

#### 访问统计的存储方式

统计不再「一次查询写一行日志」，而是分三层：

| 表 | 作用 | 默认保留 |
| --- | --- | --- |
| `stat_daily` / `stat_hourly` | 按「时间 × 服务器 × 接口 × 成功/缓存」聚合的计数 | 永久 / 60 天 |
| `query_logs` | 短期原始日志（可采样、可跳过缓存命中） | 3 天 |
| `servers` / `clients` / `referrers` | 维度表，日志里只存 ID | — |

写入走内存缓冲 + 定时批量事务，长时间运行数据库体积基本只跟「服务器数量」增长，而不是跟请求量增长。
保留期、采样率、是否记录缓存命中都可以在管理后台调整。

#### 管理后台

访问 `http://localhost:3123/admin`，首次登录使用 `admin` / `password`，登录后会被强制要求修改密码。
管理后台支持：数据统计、原始日志检索、前台配置编辑、服务端配置（超时 / 缓存 / 统计 / 数据库）、数据库维护（落盘 / 清理 / 压缩 / 清空）。

### 4\. 启动项目 (Run the Project)

| 步骤 (Step)       | 命令 (Command)                | 说明 (Description)                               |
| ----------------- | ----------------------------- | ------------------------------------------------ |
| ① 编译前端静态文件 | `npm run build:publish`       | 如果报错，请尝试升级 Node.js 到最新稳定版。 |
| ② 启动后端服务     | `npm run start`               | 默认监听 `http://localhost:3123`      |

> 启动成功后，在浏览器中打开 **http://localhost:3123** 即可查看效果。

-----

## 📜 一键启动脚本 (Optional Scripts)

为了方便，您可以在项目根目录创建以下脚本来一键启动。

#### Linux / macOS (`start.sh`)

```bash
#!/usr/bin/env bash
# 赋予执行权限: chmod +x start.sh

echo "Building front-end files..."
npm run build:publish

echo "Starting server..."
npm run start

wait
```

#### Windows (`start.bat`)

```batch
@echo off
echo "Building front-end files..."
npm run build:publish

echo "Starting server..."
npm run start
```

-----

## 🐳 Docker 部署 (Docker Deployment)

### 1\. 拉取镜像 (Pull Image)

```bash
docker pull sbaoor/mc-status-app:latest
```

### 2\. 启动容器 (Run Container)

此命令会将容器的 `3123` 端口映射到宿主机，并将配置目录挂载出来，方便修改。

```bash
docker run -d --name mc-status-container \
  -p 3123:3123 \
  -v mc-status-config:/app/config \
  sbaoor/mc-status-app:latest
```

-----

## 📄 开源许可证 (License)

[BSD2](https://github.com/mcmotd) © mcmotd

````

