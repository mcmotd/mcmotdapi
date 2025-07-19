# =================================================================
# 第一阶段 (frontend-builder): 编译前端 (front 文件夹)
# =================================================================
FROM node:24.4.1 AS frontend-builder

# 设置工作目录
WORKDIR /app

# 复制前端的包管理文件
COPY front/package*.json ./
COPY front/pnpm-lock.yaml ./

# 安装 pnpm 并安装前端的所有依赖
RUN npm install -g pnpm && pnpm install

# 复制前端的所有项目文件
COPY front/ .

# 执行前端构建命令，生成 /app/dist 文件夹
RUN pnpm run build


# =================================================================
# 第二阶段 (runner): 运行生产环境 (backend 文件夹)
# =================================================================
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# [核心修复] 安装 node-canvas 所需的系统依赖
# Alpine Linux 是一个极简的系统，需要手动安装编译工具和库
RUN apk add --no-cache build-base g++ cairo-dev jpeg-dev pango-dev giflib-dev python3

ENV PORT=3000

# 复制后端的包管理文件
COPY backend/package*.json ./
COPY backend/package-lock.json ./

# 只安装后端的生产环境依赖 (使用 npm)
# --omit=dev 是 npm v7+ 的推荐用法，等同于 --production 或 --prod
RUN npm install --omit=dev

# 复制后端的所有项目文件
COPY backend/ .

# 从 frontend-builder 阶段复制已经构建好的前端文件
COPY --from=frontend-builder /app/dist ./public

# 声明服务端口
EXPOSE $PORT

# 定义容器启动命令，执行后端 package.json 中的 "start" 脚本
CMD [ "npm", "run", "start" ]