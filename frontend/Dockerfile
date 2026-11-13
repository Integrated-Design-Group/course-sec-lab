# ===========================================================================
# 前端镜像（框架阶段）：多阶段构建 → Nginx 静态站点
# 构建上下文为仓库根目录：docker build -f frontend/Dockerfile .
# ===========================================================================
FROM node:22.14.0-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./

# 生产环境走 Nginx 同源反代，因此默认 /api/v1
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.27.4-alpine

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
