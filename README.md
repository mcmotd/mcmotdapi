# 🚀 MC-MOTD-API

[//]: # (Language Switcher)
<p align="center">
  <a href="./README.cn.md">简体中文</a> | <strong>English</strong>
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

> A real-time Minecraft server MOTD query and display service based on Node.js.
> Built with a separated front-end (Vite + Vue3) and back-end (Express + JavaScript).

---

## 🎨 Preview

| External embedding | Main site |
| :---: | :---: |
| [![](https://s21.ax1x.com/2025/07/18/pV3dDgJ.png)](https://imgse.com/i/pV3dDgJ) | [![](https://s21.ax1x.com/2025/07/18/pV3drv9.png)](https://imgse.com/i/pV3drv9) |

---

## 🛠️ Environment Requirements

| Tool              | Minimum Version | Recommended Version |
| ----------------- | --------------- | ------------------- |
| Node.js           | `>= 24.4`       | `24.4.0`            |
| pnpm / npm / yarn | Any             | `pnpm 8+`           |
| Python            | `3.0`           | `3.10+`             |

> **Important Note**: Although this project does not use Python directly, your local Python environment is required for compiling the `node-canvas` dependency. Please ensure it is installed correctly.

---

## 🚀 Getting Started

### 1. Clone Repository

``` bash
git clone https://github.com/mcmotd/mcmotdapi.git

cd mcmotdapi
```

### 2\. Install Dependencies

Using `pnpm` is recommended for dependency management.

```bash
# Install backend dependencies
cd backend
pnpm install

# Go back to the root and install frontend dependencies
cd ../front
pnpm install
```

### 3\. Modify Configuration

All configuration files are located in the `backend/config/` directory and are hot-reloaded on save (`serverPort` and `database` require a restart).

  - **Main Backend Config**: `backend/config/config.json`
  - **Frontend Config**: `backend/config/front.json`
  - **Image Generator Config**: `backend/config/pic.json`

#### Database: SQLite or MySQL

`database.driver` in `config.json` selects the storage backend. The default is `sqlite` (zero dependency, file at `backend/data/mcmotd.db`). Switch to `mysql` and restart to use MySQL — the database and tables are created automatically. The `mysql2` driver is already declared in `backend/package.json`.

#### How query analytics are stored

Instead of one row per request, analytics use three layers:

| Table | Purpose | Default retention |
| --- | --- | --- |
| `stat_daily` / `stat_hourly` | aggregated counts per time × server × endpoint × ok/cache | forever / 60 days |
| `query_logs` | short-term raw log (samplable, can skip cache hits) | 3 days |
| `servers` / `clients` / `referrers` | dimension tables, logs only keep IDs | — |

Writes are buffered in memory and flushed in batched transactions, so the database grows with the number of servers rather than the number of requests. Retention, sampling and cache-hit logging can all be tuned in the admin panel.

#### Admin panel

Open `http://localhost:3123/admin` and sign in with `admin` / `password`; you will be forced to change the password on first login. The panel covers analytics, raw log search, frontend config editing, server config (timeouts / cache / analytics / database) and database maintenance (flush / prune / compact / clear).

### 4\. Run the Project

| Step                 | Command                 | Description                                       |
| -------------------- | ----------------------- | ------------------------------------------------- |
| ① Build Static Files | `npm run build:publish` | If you encounter errors, try upgrading Node.js to the latest stable version. |
| ② Start Server       | `npm run start`         | The service will listen on `http://localhost:3123` by default. |

> After a successful start, open **http://localhost:3123** in your browser to see the result.

-----

## 📜 Optional Scripts

For convenience, you can create the following scripts in the project's root directory for a one-click start.

#### Linux / macOS (`start.sh`)

```bash
#!/usr/bin/env bash
# Grant execute permission: chmod +x start.sh

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

## 🐳 Docker Deployment

### 1\. Pull Image

```bash
docker pull sbaoor/mc-status-app:latest
```

### 2\. Run Container

This command maps port `3123` of the container to the host and mounts the configuration directory for easy modification.

```bash
docker run -d --name mc-status-container \
  -p 3123:3123 \
  -v mc-status-config:/app/config \
  sbaoor/mc-status-app:latest
```

-----

## 📄 License

[BSD2](https://github.com/mcmotd) © mcmotd
