#!/usr/bin/env bash
# ===========================================================================
# 本地一键开发环境（Linux / macOS / WSL / Git Bash）
# 步骤：生成 .env → 环境自检 → 安装依赖 →（MySQL 模式）建库/种子 → 启动前后端
# 用法：bash scripts/dev-up.sh
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  node scripts/init-env.mjs
fi

echo "→ 环境自检"
node scripts/check-env.mjs || echo "⚠ 自检存在失败项，仍尝试继续启动（请按上方提示修复）"

if [[ ! -d backend/node_modules ]]; then
  echo "→ 安装后端依赖"
  npm --prefix backend install
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "→ 安装前端依赖"
  npm --prefix frontend install
fi

DB_DRIVER_VALUE="$(grep -E '^DB_DRIVER=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
DB_DRIVER_VALUE="${DB_DRIVER_VALUE:-memory}"

if [[ "$DB_DRIVER_VALUE" == "mysql" ]]; then
  echo "→ DB_DRIVER=mysql，准备数据库"
  if command -v docker >/dev/null 2>&1; then
    docker compose -f deploy/docker-compose.yml --env-file .env up -d db
    bash deploy/scripts/wait-for-db.sh
    npm --prefix backend run db:reset
    npm --prefix backend run db:seed
  else
    echo "⚠ 未检测到 docker：请确保本机 MySQL 已运行，并手动执行："
    echo "    npm --prefix backend run db:reset && npm --prefix backend run db:seed"
  fi
else
  echo "→ DB_DRIVER=memory：跳过数据库初始化（数据仅存在于后端进程内）"
fi

echo ""
echo "→ 后端：http://127.0.0.1:3000${API_PREFIX:-/api/v1}"
echo "→ 前端：http://127.0.0.1:5173"
echo "→ 演示账号：admin / student，密码 Demo@123456"
echo ""

npm --prefix backend run dev &
BACKEND_PID=$!
npm --prefix frontend run dev &
FRONTEND_PID=$!

cleanup() {
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

wait
