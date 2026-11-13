# ===========================================================================
# 课程安全靶场 · Makefile（Linux / macOS / WSL）
# Windows 用户请直接使用 npm scripts（见 README），或安装 make 后在 Git Bash 中执行。
# 所有真实密钥都在 .env（已被 .gitignore 忽略），Makefile 不保存任何凭据。
# ===========================================================================

SHELL := /bin/bash
.DEFAULT_GOAL := help
COMPOSE := docker compose -f deploy/docker-compose.yml --env-file .env

.PHONY: help init install dev api web db-migrate db-seed db-reset seed check check-env test smoke compose-build up down logs ps

help: ## 显示可用命令
	@echo "课程安全靶场 · 常用命令"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

init: ## 生成 .env（随机 JWT_SECRET，默认内存驱动）
	node scripts/init-env.mjs

install: ## 安装前后端依赖
	npm --prefix backend install
	npm --prefix frontend install

dev: ## 一键启动本地开发环境（含数据库准备）
	bash scripts/dev-up.sh

api: ## 只启动后端（http://127.0.0.1:3000）
	npm --prefix backend run dev

web: ## 只启动前端（http://127.0.0.1:5173）
	npm --prefix frontend run dev

db-migrate: ## 执行数据库迁移
	npm --prefix backend run db:migrate

db-seed: ## 写入种子数据
	npm --prefix backend run db:seed

db-reset: ## 重置数据库并清空上传目录（危险）
	npm --prefix backend run db:reset

seed: ## 重置 + 迁移 + 种子（演示前标准动作）
	bash scripts/seed.sh

check: ## 静态框架自检（目录/JSON/YAML/文档/密钥扫描）
	node scripts/check-framework.mjs

check-env: ## 环境自检（--db 额外检查 MySQL 连通性）
	node scripts/check-env.mjs

test: ## 后端自动化测试（node:test）
	npm --prefix backend test

smoke: ## 冒烟测试（需先启动后端）
	npm run smoke

compose-build: ## 构建全部镜像
	$(COMPOSE) build

up: ## 启动全部容器
	$(COMPOSE) up -d

down: ## 停止并移除容器（保留数据卷）
	$(COMPOSE) down

logs: ## 跟踪容器日志
	$(COMPOSE) logs -f --tail=100

ps: ## 查看容器状态
	$(COMPOSE) ps
