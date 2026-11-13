#!/usr/bin/env bash
# ===========================================================================
# 重置并重新播种数据库（课程演示前的标准动作）
# 步骤：reset（删表 + 清上传目录）→ migrate → seed
# 用法：bash scripts/seed.sh
# 注意：仅用于本地/课程演示库；生产环境需 --force 且需课程负责人确认。
# ===========================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "✖ 缺少 .env，请先执行：node scripts/init-env.mjs"
  exit 1
fi

DB_DRIVER_VALUE="$(grep -E '^DB_DRIVER=' .env | cut -d= -f2 | tr -d '[:space:]' || true)"
if [[ "${DB_DRIVER_VALUE:-mysql}" == "memory" ]]; then
  echo "✖ 当前 DB_DRIVER=memory，没有可重置的 MySQL 数据库。"
  echo "  如需使用 MySQL：修改 .env 中 DB_DRIVER=mysql 并填写 DB_PASSWORD。"
  exit 1
fi

echo "→ 重置数据库与上传目录"
npm --prefix backend run db:reset

echo "→ 执行迁移"
npm --prefix backend run db:migrate

echo "→ 写入种子数据"
npm --prefix backend run db:seed

echo "✔ 完成。演示账号：admin / student，密码 Demo@123456"
