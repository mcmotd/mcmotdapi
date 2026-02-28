# =================================================================
# 第一阶段: 编译前端
# =================================================================
FROM node:24.4.1-slim AS frontend-builder
WORKDIR /app
RUN npm install -g pnpm
COPY front/package*.json front/pnpm-lock.yaml ./
# 路径修正：确保拷贝到正确位置
COPY front/ ./
RUN pnpm install && pnpm run build:docker

# =================================================================
# 第二阶段: 运行环境
# =================================================================
FROM node:20-slim
WORKDIR /app
ENV PORT=3123

# 1. 安装 Debian 下 canvas 所需的系统依赖 (非常稳定)
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# 2. 拷贝 backend 目录
COPY backend/ ./backend/

# 3. 进入目录并安装
WORKDIR /app/backend

# GitHub Actions 环境不需要换源，直接安装
# 如果报错，它会打印出具体的错误原因
RUN npm install --production

# 4. 复制前端产物 (根据你 server.js 访问路径调整)
COPY --from=frontend-builder /app/dist ./dist
# 清理编译工具
RUN apk del .build-deps && rm -rf /var/cache/apk/* /tmp/*

# 暴露端口
EXPOSE $PORT

# --- [关键修正：启动命令] ---
# 因为我们现在在 /app/backend 目录下，直接启动 server.js
CMD [ "node", "server.js" ]