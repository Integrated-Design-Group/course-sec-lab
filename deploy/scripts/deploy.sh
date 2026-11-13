#!/usr/bin/env bash
# ===========================================================================
# 课程环境部署脚本（占位实现，不包含任何真实 IP / 域名 / 密钥）
#
# 前置条件：
#   1. 已在目标服务器安装 Docker 与 Compose 插件
#   2. 仓库根目录存在 .env（从 .env.example 复制并填写，禁止提交）
#   3. 已按 docs/07-security-isolation.md 完成授权与隔离确认
#
# 用法：
#   DEPLOY_ENV=staging bash deploy/scripts/deploy.sh
#   SEED_DEMO_DATA=true DEPLOY_ENV=staging bash deploy/scripts/deploy.sh
#
# 说明：本脚本只构建/启动本仓库定义的容器，不创建云资源、不配置安全组。
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DEPLOY_ENV="${DEPLOY_ENV:-staging}"
SEED_DEMO_DATA="${SEED_DEMO_DATA:-false}"
COMPOSE=(docker compose -f deploy/docker-compose.yml --env-file .env)

echo "== 课程安全靶场部署 =="
echo "环境：${DEPLOY_ENV}"
echo "时间：$(date -u '+%Y-%m-%dT%H:%M:%SZ')（UTC）"

if [[ ! -f .env ]]; then
  echo "✖ 缺少 .env：请先 cp .env.example .env 并填写（不要提交真实密钥）"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "✖ 未安装 docker"
  exit 1
fi

# 防误操作：生产环境需要显式确认
if [[ "$DEPLOY_ENV" == "production" && "${CONFIRM_PRODUCTION:-no}" != "yes" ]]; then
  echo "✖ 生产部署需要 CONFIRM_PRODUCTION=yes，并确认已获得课程负责人授权"
  exit 1
fi

echo "→ 构建镜像"
"${COMPOSE[@]}" build

echo "→ 启动数据库"
"${COMPOSE[@]}" up -d db
bash deploy/scripts/wait-for-db.sh

echo "→ 执行数据库迁移"
"${COMPOSE[@]}" run --rm backend node scripts/migrate.mjs

if [[ "$SEED_DEMO_DATA" == "true" ]]; then
  echo "→ 写入课程演示种子数据（部署到公网前必须改密或删除演示账号）"
  "${COMPOSE[@]}" run --rm backend node scripts/seed.mjs
fi

echo "→ 启动后端与 Web"
"${COMPOSE[@]}" up -d backend web

echo "→ 健康检查"
"${COMPOSE[@]}" ps
HTTP_PORT="$(grep -E '^PUBLIC_HTTP_PORT=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
HTTP_PORT="${HTTP_PORT:-80}"
curl -fsS "http://127.0.0.1:${HTTP_PORT}/api/v1/health" || {
  echo "✖ 健康检查失败，请查看：docker compose -f deploy/docker-compose.yml logs backend"
  exit 1
}

echo ""
echo "✔ 部署完成。请在安全组/防火墙中仅放行 ${HTTP_PORT}/tcp 与课程要求的 SSH 来源网段。"
echo "  回滚：bash deploy/scripts/rollback.sh <上一个 git tag>"
