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
FROM node:20-alpine3.17

WORKDIR /app

RUN echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/main" > /etc/apk/repositories && \
    echo "https://mirrors.tuna.tsinghua.edu.cn/alpine/v3.17/community" >> /etc/apk/repositories && \
    # 补充官方源，防止清华源不可达
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/main" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.17/community" >> /etc/apk/repositories && \
    apk update && \
    apk upgrade

# 仅安装canvas运行时依赖（无需编译依赖）
RUN apk add --no-cache\
    cairo \
    libjpeg-turbo \
    pango \
    giflib \
    pangomm \
    libpng \
    freetype \
    fontconfig \
    libxml2 \
    musl-dev

ENV canvas_binary_host_mirror=https://registry.npmmirror.com/-/binary/canvas/
# 设置npm镜像源
ENV npm_config_registry=https://registry.npmmirror.com

# 复制package.json（先装依赖，利用缓存）
COPY package.json package-lock.json* ./

# 安装依赖（--omit=dev替代production，适配新版npm）
RUN npm install --omit=dev --force

# 清理缓存
RUN rm -rf /var/cache/apk/* /tmp/* /root/.npm

# 复制代码
COPY backend/ .

# 从 frontend-builder 阶段复制已经构建好的前端文件
COPY --from=frontend-builder /app/dist ./dist
EXPOSE $PORT
CMD [ "npm", "run", "start" ]