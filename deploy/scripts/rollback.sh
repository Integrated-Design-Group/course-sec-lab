#!/usr/bin/env bash
# ===========================================================================
# 回滚脚本（占位实现）
# 前提：部署代码来自 git 仓库，且历史版本仍可重新构建
# 说明：
#   * 框架阶段没有 down migration；涉及表结构的回滚必须走数据库备份恢复
#   * 回滚前请先备份 uploads 与数据库（见 docs/04-deploy.md）
# 用法：bash deploy/scripts/rollback.sh <git-ref>
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="${1:-}"
COMPOSE=(docker compose -f "$ROOT/deploy/docker-compose.yml" --env-file "$ROOT/.env")

if [[ -z "$TARGET" ]]; then
  echo "用法：bash deploy/scripts/rollback.sh <git-ref>（例如 v0.1.0 或某个 commit）"
  exit 1
fi

cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✖ 工作区存在未提交改动，拒绝自动回滚。请先提交或 stash。"
  exit 1
fi

echo "即将回滚到：${TARGET}"
echo "注意：容器镜像会被重新构建，数据库不会被自动降级。"
read -r -p "输入 yes 确认：" answer
[[ "$answer" == "yes" ]] || { echo "已取消"; exit 1; }

git fetch --tags --all
git checkout "$TARGET"

"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d backend web

HTTP_PORT="$(grep -E '^PUBLIC_HTTP_PORT=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
HTTP_PORT="${HTTP_PORT:-80}"
curl -fsS "http://127.0.0.1:${HTTP_PORT}/api/v1/health" || {
  echo "✖ 回滚后健康检查失败，请查看日志并考虑使用数据库备份恢复"
  exit 1
}

echo "✔ 已回滚到 ${TARGET}（数据库结构如需回退，请按备份恢复流程操作）"
