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
FROM node:20-alpine
WORKDIR /app

# 显式指定从当前构建上下文的 backend 目录拷贝
# 这里的 ./backend 是相对于你 git push 上去的根目录
COPY ./backend/package*.json ./
RUN npm install --production

COPY ./backend/ ./

# 拷贝前端产物
COPY --from=frontend-builder /app/dist ./dist

# 强制检查一次，如果为空，构建直接报错
RUN if [ ! -f "package.json" ]; then echo "文件拷贝失败！" && exit 1; fi

# 如果你还是启动不起来，暂时用这个“假启动”
# CMD ["tail", "-f", "/dev/null"]
# CMD ["npm", "start"]

EXPOSE 3123
# 启动
CMD [ "node", "server.js" ]