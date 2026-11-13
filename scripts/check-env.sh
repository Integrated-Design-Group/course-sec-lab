#!/usr/bin/env bash
# ===========================================================================
# 环境自检入口（转发到跨平台 Node 实现）
# 用法：bash scripts/check-env.sh [--db]
# ===========================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec node "$ROOT/scripts/check-env.mjs" "$@"
