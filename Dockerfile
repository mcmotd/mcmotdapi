# =================================================================
# 第一阶段: 编译前端
# =================================================================
FROM node:24.4.1 AS frontend-builder
WORKDIR /app
RUN npm install -g pnpm
COPY front/package*.json front/pnpm-lock.yaml ./front/
# 注意这里：要进入 front 目录安装
WORKDIR /app/front
RUN pnpm install
COPY front/ .
RUN pnpm run build:docker

# =================================================================
# 第二阶段: 运行环境
# =================================================================
FROM node:20-alpine
WORKDIR /app
ENV PORT=3123

# 安装系统依赖
RUN apk add --no-cache cairo jpeg pango giflib
RUN apk add --no-cache --virtual .build-deps build-base g++ python3 pkgconf cairo-dev jpeg-dev pango-dev giflib-dev

# --- [关键修正：保持 backend 层级] ---
# 1. 拷贝 backend 整个目录（包含它里面的 package.json）
COPY backend/ ./backend/

# 2. 进入 backend 目录安装后端依赖
WORKDIR /app/backend
RUN npm install --production

# 3. 复制前端产物到指定位置
# 假设你的 backend 代码里是通过 ../dist 或 ./dist 访问前端的，请根据代码调整
COPY --from=frontend-builder /app/dist ./dist

# 清理编译工具
RUN apk del .build-deps && rm -rf /var/cache/apk/* /tmp/*

# 暴露端口
EXPOSE $PORT

# --- [关键修正：启动命令] ---
# 因为我们现在在 /app/backend 目录下，直接启动 server.js
CMD [ "node", "server.js" ]