# ===========================================================================
# 后端镜像（框架阶段）
# 构建上下文为仓库根目录：docker build -f backend/Dockerfile .
# ===========================================================================
FROM node:22.14.0-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC

# 先复制依赖清单，利用镜像层缓存
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 再复制源码与数据库脚本
# db/ 必须放在镜像根目录：backend/scripts 通过 REPO_ROOT（/app 的上一级）定位 db/migrations
COPY backend/ ./
COPY db/ /db/

RUN mkdir -p /app/uploads /app/logs && chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
