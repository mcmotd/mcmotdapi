# =================================================================
# 第一阶段: 编译前端
# =================================================================
FROM node:24.4.1-slim AS frontend-builder
WORKDIR /app
# 移除国内源，利用 GitHub Actions 海外带宽
RUN npm install -g pnpm
COPY front/package*.json front/pnpm-lock.yaml ./
RUN pnpm install
COPY front/ .
RUN pnpm run build:docker

# =================================================================
# 第二阶段: 运行环境
# =================================================================
FROM node:20-alpine3.17
WORKDIR /app

# 安装 Canvas 运行时依赖
RUN apk add --no-cache \
    cairo \
    libjpeg-turbo \
    pango \
    giflib \
    libpng \
    freetype \
    fontconfig \
    libxml2

# 1. 先拷贝 package.json 安装后端依赖
# 注意：确保这个 package.json 包含了 express 等依赖
COPY package*.json ./
RUN npm install --omit=dev --force

# 2. 拷贝后端代码 (假设 server.js 在 backend 目录下)
# 如果你的 server.js 在 backend 文件夹里，拷贝到当前目录
COPY backend/ .

# 3. 从前端构建阶段拷贝产物
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 3000
# 启动
CMD [ "node", "server.js" ]