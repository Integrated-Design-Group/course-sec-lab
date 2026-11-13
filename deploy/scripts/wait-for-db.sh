#!/usr/bin/env bash
# ===========================================================================
# 等待 MySQL 容器就绪（框架阶段部署辅助脚本）
# 用法：bash deploy/scripts/wait-for-db.sh
# 依赖：docker / docker compose；密码从容器内环境读取，不在宿主机打印
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE=(docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$ROOT/.env")
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  if "${COMPOSE[@]}" exec -T db sh -c 'mysqladmin ping -h 127.0.0.1 -u root -p"$MYSQL_ROOT_PASSWORD" --silent' >/dev/null 2>&1; then
    echo "✔ MySQL 已就绪（第 ${attempt} 次探测）"
    exit 0
  fi
  echo "… 等待 MySQL 就绪（${attempt}/${MAX_ATTEMPTS}）"
  sleep 2
done

echo "✖ 等待 MySQL 超时，请查看：docker compose -f deploy/docker-compose.yml logs db"
exit 1
