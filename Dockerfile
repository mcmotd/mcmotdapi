# =================================================================
# 第一阶段 (frontend-builder): 编译前端 (front 文件夹)
# =================================================================
FROM node:24.4.1 AS frontend-builder

WORKDIR /app
COPY front/package*.json ./
COPY front/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY front/ .
RUN pnpm run build:docker


# =================================================================
# 第二阶段 (runner): 运行生产环境 (backend 文件夹)
# =================================================================
FROM node:20-alpine

WORKDIR /app

ENV PORT=3123

# --- [核心修正] ---
# 步骤 1: 先只复制包管理文件
# 这一层可以被 Docker 缓存。只要依赖不变，下次构建会直接跳过最耗时的 npm install 步骤。
COPY backend/package*.json ./
COPY backend/package-lock.json ./

# 步骤 2: 在一个 RUN 指令中，完成安装依赖、编译、清理
# 由于上一步 COPY 了 package.json，现在容器内可以找到它们了。
RUN \
    # 安装 node-canvas 的【运行时】依赖，这些必须保留
    apk add --no-cache cairo jpeg pango giflib \
    \
    # 将【编译时】的工具和开发库安装为一个虚拟包
    && apk add --no-cache --virtual .build-deps build-base g++ python3 cairo-dev jpeg-dev pango-dev giflib-dev \
    \
    # 执行 npm install
    && npm install --omit=dev \
    \
    # [关键] 删除所有编译时的依赖和缓存，为镜像瘦身
    && apk del .build-deps \
    && rm -rf /var/cache/apk/* /tmp/*

# 步骤 3: 复制后端的所有项目源代码
# 这一步在 npm install 之后，这样修改业务代码不会导致依赖重新安装。
COPY backend/ .

# 从 frontend-builder 阶段复制已经构建好的前端文件
COPY --from=frontend-builder /app/dist ./dist

EXPOSE $PORT
CMD [ "npm", "run", "start" ]