# 05 · 环境与版本锁定

> **适用对象**：全体开发同学、部署负责人
> **前置条件**：无（本文是环境基线，首次开发前必读）
> **预计耗时**：阅读 15 分钟；按本文完成本地环境约 10 分钟

## 1. 版本锁定

### 1.1 运行时与基础设施

| 组件 | 锁定版本 | 用途 | 锁定位置 |
| --- | --- | --- | --- |
| Node.js | **22.14.0**（LTS） | 后端/前端运行时 | `backend/Dockerfile`、`frontend/Dockerfile`、各 `package.json` 的 `engines` |
| npm | 随 Node 22.14.0 镜像自带（10.x） | 依赖安装 | Docker 镜像 |
| MySQL | **8.4.4** | 数据库 | `deploy/docker-compose.yml` |
| Nginx | **1.27.4-alpine** | 静态资源 + 反代 | `frontend/Dockerfile` |
| Docker Engine | 24+ / Compose v2 | 容器编排 | `deploy/docker-compose.yml`（Compose 语法） |
| js-yaml | 4.1.0 | 框架自检脚本解析 YAML | 根 `package.json` |

### 1.2 应用依赖（精确版本，不使用 `^`）

| 包 | 版本 | 端 |
| --- | --- | --- |
| express | 4.21.2 | backend |
| mysql2 | 3.11.5 | backend |
| bcryptjs | 2.4.3 | backend |
| jsonwebtoken | 9.0.2 | backend |
| multer | 2.0.2 | backend |
| helmet | 8.0.0 | backend |
| cors | 2.8.5 | backend |
| dotenv | 16.4.7 | backend |
| react / react-dom | 18.3.1 | frontend |
| react-router-dom | 6.28.0 | frontend |
| vite | 5.4.11 | frontend |
| @vitejs/plugin-react | 4.3.4 | frontend |

> 依赖版本以 `backend/package.json`、`frontend/package.json` 与对应 `package-lock.json` 为准；升级必须走 PR 并说明原因。

### 1.3 本机验证环境（框架搭建阶段）

| 项 | 实际值 |
| --- | --- |
| 操作系统 | Windows 11（PowerShell 5.1） |
| Node.js | v24.18.0（满足 `>= 22`） |
| npm | 11.16.0 |
| Docker | **未安装** → Compose 编排**未在本机验证** |
| MySQL | **未安装** → 真实数据库迁移/种子**未在本机验证**（SQL 经人工审查 + 自检脚本结构检查） |
| 前端构建 | ✅ `vite build` 通过（55 个模块） |
| 后端测试 | ✅ 23 项 `node:test` 全通过（内存驱动） |

> 上表只记录事实。任何“未验证”的项目都不得在验收中写成“通过”。

## 2. 端口分配

| 端口 | 用途 | 开发 | 部署 | 暴露范围 |
| --- | --- | --- | --- | --- |
| 5173 | Vite 开发服务器 | ✅ | - | 本机 |
| 4173 | `vite preview`（构建产物预览） | ✅ | - | 本机 |
| 3000 | 后端 API | ✅ | 容器内 | 开发本机 / 部署仅容器网络 |
| 3306 | MySQL | 本机（可选） | 容器内 | **仅容器网络** |
| 80 | Nginx HTTP | - | ✅ | 公网（安全组收敛） |
| 443 | Nginx HTTPS | - | 规划中 | 公网（证书落地后） |

更改开发端口：后端改 `.env` 的 `PORT`；前端改 `frontend/vite.config.js`（同时调整代理目标）。

## 3. 启动命令

| 目标 | 命令 | 说明 |
| --- | --- | --- |
| 初始化 `.env` | `node scripts/init-env.mjs` | 生成随机 `JWT_SECRET`，默认 `DB_DRIVER=memory` |
| 安装依赖 | `npm --prefix backend install` / `npm --prefix frontend install` | 根目录也有 `npm install`（仅装 js-yaml） |
| 一键开发环境 | `bash scripts/dev-up.sh` | 检查环境 → 装依赖 →（可选）数据库 → 前后端同时启动 |
| 只启动后端 | `npm --prefix backend run dev` | `node --watch`，端口 3000 |
| 只启动前端 | `npm --prefix frontend run dev` | Vite，端口 5173，自动代理 `/api` |
| 后端测试 | `npm --prefix backend test` | `node --test tests/` |
| 冒烟测试 | `npm run smoke` | 需后端已启动 |
| 契约测试 | `npm run contract` | 需后端已启动 |
| 前端构建 | `npm --prefix frontend run build` | 产物 `frontend/dist` |
| 构建确认 | `npm --prefix frontend run preview` | 预览构建产物，端口 4173 |
| 迁移 / 种子 / 重置 | `npm --prefix backend run db:migrate` / `db:seed` / `db:reset` | 仅 `DB_DRIVER=mysql` |
| 演示前一键重置 | `bash scripts/seed.sh` | reset → migrate → seed |
| 框架自检 | `npm run check` | 目录/JSON/YAML/文档/密钥扫描 |
| 环境自检 | `node scripts/check-env.mjs [--db]` | `--db` 额外探测 MySQL 端口 |
| 容器编排 | `docker compose -f deploy/docker-compose.yml --env-file .env up -d` | 需 Docker |
| Make 快捷方式 | `make help` | Linux/macOS/WSL |

## 4. 日志路径

| 场景 | 路径 | 开关 |
| --- | --- | --- |
| 开发（默认） | stdout（JSON Lines） | 始终开启 |
| 开发（落文件） | `backend/logs/app.log`（相对 backend 根） | `LOG_TO_FILE=true` |
| 容器 | `/app/logs/app.log`（卷 `app_logs`） | Compose 已设 `LOG_TO_FILE=true` |
| 容器 stdout | `docker compose logs -f backend` | 始终 |
| Nginx | stdout → `docker compose logs web` | 始终 |

日志级别：`debug` / `info`（默认）/ `warn` / `error`。**日志中禁止出现密码、token、密钥**（代码层已做脱敏约束）。

## 5. 环境变量

> 完整模板见根目录 `.env.example`（已忽略提交）。前端变量单独放在 `frontend/.env.example`。

### 5.1 运行时

| 变量 | 默认 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `NODE_ENV` | `development` | 否 | `development` / `test` / `production`；生产会触发更严格校验 |
| `APP_NAME` | `course-sec-lab` | 否 | 服务名，出现在响应与日志 |
| `APP_VERSION` | 读取 `package.json` | 否 | 版本号 |
| `PORT` | `3000` | 否 | 后端监听端口 |
| `API_PREFIX` | `/api/v1` | 否 | **框架阶段固定**，改成其他值会启动失败 |
| `CORS_ORIGIN` | `http://localhost:5173` | 否 | 逗号分隔的白名单；同源请求自动放行 |
| `TRUST_PROXY` | `0` | 否 | 经 Nginx 时设 `1`（影响 `req.ip` 与限流键） |
| `LOG_LEVEL` | `info` | 否 | 日志级别 |
| `LOG_DIR` | `./logs` | 否 | 相对 `backend/` |
| `LOG_TO_FILE` | `false` | 否 | 是否写文件日志 |
| `DB_DRIVER` | `mysql` | 否 | `mysql` / `memory`；生产禁止 memory |

### 5.2 数据库

| 变量 | 默认 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `DB_HOST` | `127.0.0.1` | 否 | 容器内为 `db` |
| `DB_PORT` | `3306` | 否 | - |
| `DB_NAME` | `course_sec_lab` | 否 | 只允许字母/数字/下划线 |
| `DB_USER` | `lab_user` | 否 | 应用账号（非 root） |
| `DB_PASSWORD` | 空 | **mysql 模式必填** | 禁止占位符、禁止入库 |
| `DB_ROOT_PASSWORD` | 空 | Compose 必填 | 仅初始化与健康检查使用 |
| `DB_POOL_MIN` | `2` | 否 | 连接池下限 |
| `DB_POOL_MAX` | `10` | 否 | 连接池上限 |
| `DB_CONNECT_TIMEOUT_MS` | `10000` | 否 | 连接超时 |

### 5.3 认证

| 变量 | 默认 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `JWT_SECRET` | 无 | **是** | ≥ 32 字符且非占位符，生产强校验；`openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `2h` | 否 | 令牌有效期 |
| `BCRYPT_ROUNDS` | `10` | 否 | 10～14 |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `600000` | 否 | 登录失败统计窗口 |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | `10` | 否 | 窗口内最大失败次数 |

### 5.4 上传

| 变量 | 默认 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `UPLOAD_DIR` | `./uploads` | 否 | 相对 `backend/`；容器内 `/app/uploads` |
| `UPLOAD_MAX_BYTES` | `2097152` | 否 | 2 MB，上限 10 MB |
| `UPLOAD_ALLOWED_MIME` | `image/png,image/jpeg,image/webp` | 否 | 仅允许这三类 |

### 5.5 部署占位

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PUBLIC_HTTP_PORT` | `80` | 宿主机映射到 web 容器的端口 |
| `DEPLOY_PUBLIC_HOST` | `__PUBLIC_IP_OR_DOMAIN__` | 仅文档占位，不参与代码 |
| `DEPLOY_SSH_ALLOWED_CIDR` | `__YOUR_ADMIN_CIDR__` | 仅文档占位 |
| `DEPLOY_TIMEZONE` | `UTC` | 服务器/数据库统一 UTC |

### 5.6 前端

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | 前端请求前缀；Docker 构建时作为 ARG 注入 |
| `VITE_APP_TITLE` | 课程安全靶场… | 页面标题 |

## 6. 两种运行模式

| 模式 | 配置 | 适用场景 | 数据 | 生产可用 |
| --- | --- | --- | --- | --- |
| 内存驱动 | `DB_DRIVER=memory` | 框架演示、无 MySQL 的机器、自动化测试 | 进程内，重启即恢复种子 | ❌（启动校验会拒绝） |
| MySQL | `DB_DRIVER=mysql` | 正式开发、联调、部署 | 持久化 | ✅ |

**推荐路径**：先用内存驱动跑通“健康检查 + 登录”证明环境正常，再切 MySQL 验证迁移与种子。

切换步骤：

```bash
# 1) 修改 .env
#    DB_DRIVER=mysql
#    DB_PASSWORD=<本地数据库密码>
# 2) 建库 + 种子
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
# 3) 重启后端
npm --prefix backend run dev
```

## 7. 时间与编码

- 数据库：`DATETIME(3)`，存 UTC；连接时区 `+00:00`。
- 应用：`timezone: 'Z'`，序列化为 ISO 8601（`…Z`）。
- 前端：`Intl.DateTimeFormat('zh-CN')` 按浏览器本地时区展示。
- 编码：源码 UTF-8（无 BOM）；SQL/JSON 均 UTF-8。

## 8. 故障排查

| 现象 | 处理 |
| --- | --- |
| 启动报 `[config] JWT_SECRET …` | 运行 `node scripts/init-env.mjs --force` 或手动填随机值 |
| 端口 3000 被占用 | 改 `.env` 的 `PORT`，同步改 `frontend/vite.config.js` 代理目标 |
| 前端 5173 请求 404 | 确认后端已启动且代理目标端口一致 |
| `npm install` 权限错误 | 指定可写缓存目录：`npm install --cache ./.npm-cache` |
| MySQL 报 `ER_ACCESS_DENIED` | 检查 `DB_USER`/`DB_PASSWORD`，确认已授权该库 |
| 迁移报 `Unknown database` | 直接运行 `npm run db:migrate`（脚本会自动建库） |
| 登录 401 | 确认种子已执行；`DB_DRIVER=memory` 时重启会重置 `last_login_at`，不影响登录 |
| 上传 415 | 检查文件真实类型（magic bytes）与扩展名是否一致 |

## 9. 版本变更流程

1. 提 Issue 说明升级原因与兼容性影响。
2. 修改 `package.json` / Dockerfile / 本文档，并在 PR 描述中附 `npm ls` 或构建结果。
3. CI/本地至少通过：后端测试、前端构建、冒烟测试。
4. 涉及 Node 大版本升级时，同步评估 `engines` 与 Docker 基础镜像。
