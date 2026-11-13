# 12 · 新手本地部署

> **适用对象**：第一次运行本项目的同学、需要独立复现环境的验收人
> **前置条件**：一台可安装软件的电脑（Windows 10/11、macOS 或 Linux）；能访问 GitHub 与 npm 源；无需云服务器
> **预计耗时**：内存模式 15～25 分钟；Docker + MySQL 模式 40～60 分钟（首次下载镜像可能更久）
> **验证方式**：按第 13 节清单逐项打勾，最终能打开登录页并用种子账号登录成功

> 本文只讲**本地**。云服务器、域名、HTTPS、安全组属于部署阶段，见 [04 部署](./04-deploy.md)，由后续成员完成后评审。
> **本文不会出现任何真实密码、云密钥或公网地址**；示例密码均为占位或课程演示值。

## 1. 先选一条路线

| 路线 | 需要 Docker？ | 需要 MySQL？ | 数据是否持久 | 适合谁 | 耗时 |
| --- | :---: | :---: | :---: | --- | --- |
| A. 内存模式 | 否 | 否 | 否（重启即恢复种子） | 第一次跑通、只改前端/看页面 | 15～25 分钟 |
| B. Docker 起 MySQL + 本机跑前后端 | 是 | 否（容器内） | 是 | 平时开发、要验证迁移/种子 | 40～60 分钟 |
| C. 全容器（web+backend+db） | 是 | 否 | 是 | 模拟部署、验收 | 40～60 分钟 |

**建议**：第一次先走 A，确认 Node 与项目没问题；需要数据库时再走 B。

### 1.1 名词先解释

| 名词 | 一句话解释 |
| --- | --- |
| Node.js | 运行后端 JavaScript 的运行时；本项目要求 22 及以上 |
| npm | Node 的包管理器，用 `npm install` 安装依赖 |
| 依赖（node_modules） | 项目用到的第三方代码，安装在 `node_modules/`，不进 Git |
| 环境变量 | 通过 `.env` 文件传给程序的配置（端口、数据库密码等） |
| 内存驱动 | `DB_DRIVER=memory` 时数据放在后端进程内存里，不写数据库，重启恢复种子 |
| Docker | 容器工具；把 MySQL 等软件装进隔离的“容器”里运行 |
| 镜像 / 容器 | 镜像=安装包模板；容器=镜像运行起来的实例 |
| 数据卷（volume） | Docker 管理的持久化目录，删容器不丢数据 |
| Compose | 用 YAML 描述多个容器的编排工具（`docker compose` 命令） |
| 迁移（migration） | 按顺序执行 SQL 文件来创建/升级表结构 |
| 种子（seed） | 写入演示数据（角色、账号、条目） |
| 端口 | 程序对外提供服务的数字入口，如 3000、5173、3306 |
| Vite 代理 | 前端开发服务器把 `/api` 请求转发到后端，避免跨域 |

## 2. 开始前的环境检查

打开终端：

- Windows：推荐 **Git Bash**（开始菜单搜索 Git Bash），或 PowerShell。
- macOS：`终端`。
- Linux：任意终端。

```bash
git --version
node --version
npm --version
```

预期（版本号可能更高）：

```text
git version 2.4x.x
v22.x.x   （或 v24.x.x，满足 >= 22 即可）
10.x.x / 11.x.x
```

如果 `node` 提示找不到，先看第 3 节安装。

> **Windows 提示**：如果 `npm` 报“无法加载文件 …npm.ps1，因为在此系统上禁止运行脚本”，把命令里的 `npm` 全部换成 `npm.cmd` 即可；或执行 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`（需确认公司/学校策略允许）。

## 3. 安装必要软件

### 3.1 Git

| 系统 | 安装 | 验证 |
| --- | --- | --- |
| Windows | 下载 Git for Windows（自带 Git Bash） | `git --version` |
| macOS | `xcode-select --install` 或 `brew install git` | `git --version` |
| Ubuntu/Debian | `sudo apt update && sudo apt install -y git` | `git --version` |

首次使用还需配置身份（只做一次）：

```bash
git config --global user.name "你的姓名"
git config --global user.email "你的邮箱@example.com"
git config --global --list
```

### 3.2 Node.js 22+

**Windows**

1. 打开 <https://nodejs.org/> 下载 **LTS 22.x** 安装包，一路下一步。
2. 关闭并重开终端。

**macOS**

```bash
# 方式一：Homebrew
brew install node@22

# 方式二：nvm（推荐，便于切版本）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22
```

**Linux（Ubuntu/Debian）**

```bash
# nvm 方式（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22
```

验证：

```bash
node --version
npm --version
```

预期 `v22.x` 或更高。**低于 22 会启动失败**（项目 `engines` 要求）。

### 3.3 Docker（路线 B/C 需要，路线 A 不需要）

| 系统 | 安装 |
| --- | --- |
| Windows | 安装 Docker Desktop（需要开启 WSL2 或 Hyper-V） |
| macOS | 安装 Docker Desktop for Mac（Intel/Apple Silicon 对应版本） |
| Linux | 按官方文档安装 Docker Engine + Compose 插件 |

验证：

```bash
docker --version
docker compose version
docker info
```

预期：前两条输出版本号；`docker info` 输出 `Server Version: ...`。
如果 `docker info` 报 `Cannot connect to the Docker daemon`，说明 **Docker Desktop 没启动**，先启动它并等鲸鱼图标变绿。

> Windows 若提示 `docker` 不是命令：Docker Desktop 安装后需要重新登录/重启终端。

### 3.4 数据库

- 路线 A：**不需要**安装任何数据库。
- 路线 B/C：数据库跑在 Docker 容器里，**本机也不需要安装 MySQL**。
- 只有当你明确想用本机 MySQL 时，才安装 MySQL 8.4，并跳过本文的 Docker 数据库步骤。

## 4. 克隆仓库并查看结构

```bash
git clone <课程仓库地址> course-sec-lab
cd course-sec-lab
```

```bash
# 确认在正确目录
pwd                      # Windows Git Bash 会显示 /e/course_sec_lab 之类
ls                       # Windows PowerShell 可用 dir
```

预期能看到：`README.md`、`backend/`、`frontend/`、`db/`、`deploy/`、`docs/`、`TODO.md`、`.env.example`。

> 路径尽量不含空格与中文（如 `E:\course_sec_lab`），可避免脚本/工具链的奇怪问题。

## 5. 生成并配置 `.env`

### 5.1 自动生成（推荐）

```bash
node scripts/init-env.mjs
```

它会：

- 复制 `.env.example` → `.env`；
- 生成随机 `JWT_SECRET`（登录令牌签名用）；
- 把 `DB_DRIVER` 设为 `memory`；
- 同时生成 `frontend/.env`。

预期输出：

```text
✔ 已生成：.env
✔ 已生成：frontend\.env
说明：
  * 当前 DB_DRIVER=memory，可立即启动并验证健康检查/登录闭环（数据不持久化）
  ...
```

### 5.2 手动方式（等价）

```bash
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
```

然后编辑 `.env`，把 `JWT_SECRET` 换成长随机值：

```bash
# macOS/Linux
openssl rand -hex 32
# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5.3 关键变量说明

> 完整变量表见 [05 环境](./05-environment.md) 第 5 节。**不要把真实密码写进本文档或提交 `.env`。**

| 变量 | 作用 | 路线 A | 路线 B |
| --- | --- | --- | --- |
| `NODE_ENV` | 运行环境 | `development` | `development` |
| `PORT` | 后端端口 | `3000` | `3000` |
| `API_PREFIX` | API 前缀 | `/api/v1`（固定，别改） | 同左 |
| `JWT_SECRET` | 登录令牌签名密钥，≥32 字符 | 必须随机 | 必须随机 |
| `DB_DRIVER` | 存储驱动 | `memory` | `mysql` |
| `DB_HOST` | 数据库地址 | 不用改 | `127.0.0.1`（宿主机连 Docker） |
| `DB_PORT` | 数据库端口 | 不用改 | `3306`（或 `DB_PUBLISH_PORT`） |
| `DB_NAME` | 数据库名 | 不用改 | `course_sec_lab` |
| `DB_USER` | 应用数据库账号 | 不用改 | `lab_user` |
| `DB_PASSWORD` | 应用数据库密码 | 可留占位 | **改成自己的强密码** |
| `DB_ROOT_PASSWORD` | MySQL root 密码（仅初始化/备份） | 可留占位 | **改成自己的强密码** |
| `LOG_LEVEL` | 日志级别 | `info` | `info` |
| `LOG_TO_FILE` | 是否写日志文件 | `false` | 按需 `true` |
| `UPLOAD_DIR` | 上传目录 | `./uploads` | `./uploads` |
| `UPLOAD_MAX_BYTES` | 上传大小上限 | `2097152`（2MB） | 同左 |
| `PUBLIC_HTTP_PORT` | 部署时宿主机端口 | 不用改 | 不用改 |
| `DB_PUBLISH_PORT` | 本地把 MySQL 映射到宿主机的端口 | 不用 | 默认 `3306`，冲突时改 |

**安全要求**：`.env` 已被 `.gitignore` 忽略；不要 `git add -f .env`，不要把密码贴到群里或写进文档。

## 6. 路线 A：内存模式启动（最快）

不需要数据库，直接跳到第 8 节启动后端。数据在进程内存里，重启后恢复为种子状态。

验证当前是内存模式：

```bash
node scripts/check-env.mjs
```

预期包含：

```text
✔ [PASS] Node.js v2x.x.x
✔ [PASS] .env 存在
✔ [PASS] JWT_SECRET 已配置
! [WARN] DB_DRIVER=memory
✔ [PASS] backend 依赖已安装
...
结论：环境可用。
```

> 若提示依赖缺失，先执行第 7.1 节的安装命令。

## 7. 路线 B：Docker 数据库 + 本机开发

### 7.1 安装项目依赖

```bash
npm --prefix backend install
npm --prefix frontend install
```

作用：安装后端/前端依赖到各自的 `node_modules/`。
预期：`added N packages`，无 `ERESOLVE`/`EACCES` 错误。
可选：根目录 `npm install`（仅安装自检脚本用的 `js-yaml`）。

### 7.2 修改 `.env` 为 MySQL 模式

编辑 `.env`：

```dotenv
DB_DRIVER=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=course_sec_lab
DB_USER=lab_user
DB_PASSWORD=你的强密码
DB_ROOT_PASSWORD=你的另一个强密码
```

生成密码：

```bash
openssl rand -base64 24
```

> `DB_PASSWORD` 必须与 Compose 初始化时用的值一致；**第一次启动后再改密码不会自动生效**（见第 12.6 节）。

### 7.3 启动数据库容器

本地开发使用“基础编排 + 开发覆盖文件”，后者把 MySQL 映射到 `127.0.0.1:3306`（只绑本机，不暴露公网）：

```bash
docker compose \
  -f deploy/docker-compose.yml \
  -f deploy/docker-compose.dev.yml \
  --env-file .env \
  up -d db
```

作用：拉取 `mysql:8.4.4` 镜像并后台启动 `csl-db` 容器。
预期：

```text
[+] Running 2/2
 ✔ Network course-sec-lab_internal  Created
 ✔ Container csl-db                 Started
```

查看状态与日志：

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env ps
docker logs csl-db --tail 30
```

预期：`STATUS` 显示 `Up (healthy)`；日志出现 `ready for connections`。

> 首次启动需要 10～40 秒初始化，`healthy` 之前不要执行迁移。

### 7.4 验证端口映射

```bash
# Windows PowerShell
Test-NetConnection 127.0.0.1 -Port 3306
# macOS/Linux
nc -vz 127.0.0.1 3306
```

预期：连接成功（`TcpTestSucceeded : True` / `succeeded`）。

### 7.5 执行迁移与种子

```bash
npm --prefix backend run db:migrate
```

作用：自动创建数据库 → 建 6 张表 → 记录迁移版本。
预期：

```text
→ 目标数据库：lab_user@127.0.0.1:3306/course_sec_lab
✔ 数据库已就绪：course_sec_lab
✔ 已应用：001_init_schema
完成：本次应用 1 个迁移，共 1 个迁移文件
```

```bash
npm --prefix backend run db:seed
```

作用：写入 2 个角色、2 个演示账号、3 条业务条目。
预期：

```text
✔ 已执行：001_seed_base.sql
完成：roles=2 users=2 business_items=3
演示账号：admin / student，密码 Demo@123456（仅课程环境使用）
```

验证表：

```bash
docker exec -it csl-db mysql -u lab_user -p -e "USE course_sec_lab; SHOW TABLES; SELECT id, username, status FROM users;"
```

预期：6 张表；`admin`、`student` 两条记录（输入密码时不回显）。

### 7.6 重置演示数据

```bash
# 删表 + 清上传目录 + 重新迁移 + 重新种子
npm --prefix backend run db:reset
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
```

或一键（Linux/macOS/Git Bash）：

```bash
bash scripts/seed.sh
```

预期：重置后再次登录仍可用，数据回到 2 账号 / 3 条目。

## 8. 启动后端

打开一个终端，在仓库根目录：

```bash
npm --prefix backend run dev
```

作用：用 `node --watch` 启动 Express，监听 3000。
预期（JSON 日志，字段顺序可能不同）：

```text
{"level":"info","message":"mysql 连接池已创建",...}
{"level":"info","message":"HTTP 服务已启动","url":"http://127.0.0.1:3000/api/v1",...}
{"level":"info","message":"数据库连接正常",...}
```

> 若看到 `无法连接后端服务`，多半是后端没起或端口被占用，见第 12 节。

### 8.1 健康检查

另开终端：

```bash
curl -sS http://127.0.0.1:3000/api/v1/health
```

Windows PowerShell 可用：

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
```

预期（节选）：

```json
{
  "success": true,
  "code": "OK",
  "message": "服务正常",
  "data": {
    "status": "ok",
    "service": "course-sec-lab",
    "version": "0.1.0",
    "checks": { "database": { "driver": "mysql", "status": "up", "latencyMs": 2.1 } }
  },
  "requestId": "…",
  "timestamp": "…"
}
```

关键判断：`"success": true` 且 `checks.database.status` 为 `up`。
若返回 503，说明后端起来了但数据库连不上，看第 12.4 节。

## 9. 启动前端

再开一个终端（后端保持运行）：

```bash
npm --prefix frontend run dev
```

预期：

```text
VITE v5.4.11  ready in 300 ms
➜  Local:   http://127.0.0.1:5173/
➜  Network: use --host to expose
```

浏览器打开 <http://127.0.0.1:5173>。
前端通过 Vite 代理把 `/api` 转发到 `http://127.0.0.1:3000`，所以只需访问 5173。

## 10. 验证最小登录闭环

### 10.1 浏览器验证

1. 打开 <http://127.0.0.1:5173>，未登录会自动跳到 `/login`。
2. 用演示账号登录：

   | 账号 | 密码 | 角色 |
   | --- | --- | --- |
   | `admin` | `Demo@123456` | 管理员 |
   | `student` | `Demo@123456` | 学生 |

3. 登录后应看到“框架概览”，健康状态为“正常”，当前账号信息正确。
4. 点击“教材列表”，应看到 3 条种子条目，可翻页/筛选。
5. 点击“退出登录”，应回到登录页；再用浏览器后退访问受限页，应再次跳转登录。

### 10.2 命令行验证（可选）

```bash
# 登录并取出 token（需要 jq；没有可手动复制）
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"student","password":"Demo@123456"}'
```

预期：`success` 为 true，`data.token` 是 JWT，`data.user.role` 为 `student`。

```bash
# 用上一步的 token 访问当前用户（把 $TOKEN 换成实际值）
curl -sS http://127.0.0.1:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

预期：返回 `username: "student"`。若返回 401，检查 token 是否完整、是否已过期（默认 2 小时）。

## 11. 日志、停止与清理

### 11.1 日志位置

| 场景 | 位置 | 查看方式 |
| --- | --- | --- |
| 后端控制台 | 当前终端 | 直接看 JSON 行 |
| 后端文件日志 | `backend/logs/app.log`（需 `LOG_TO_FILE=true`） | `tail -f backend/logs/app.log` |
| 前端 | Vite 终端 | 直接看 |
| MySQL 容器 | Docker | `docker logs csl-db -f` |
| 全部容器 | Docker | `docker compose ... logs -f` |

### 11.2 停止服务

- 后端/前端：在各自终端按 `Ctrl + C`。
- 数据库容器（保留数据）：

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env stop db
```

### 11.3 清理环境

```bash
# 停止并删除本地 db 容器（数据卷保留，下次启动数据还在）
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env down

# 彻底删除数据（本地专用！会清空数据库）
# docker compose ... down -v
```

删除依赖（一般不需要）：

```bash
rm -rf backend/node_modules frontend/node_modules
```

### 11.4 重置演示数据

```bash
npm --prefix backend run db:reset
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
```

内存模式则直接重启后端（`Ctrl + C` 后重新 `npm --prefix backend run dev`）。

## 12. 常见错误与解决

### 12.1 Docker 未启动

- 现象：`Cannot connect to the Docker daemon at unix:///var/run/docker.sock`
- 原因：Docker Desktop/服务没运行。
- 解决：

```bash
# Windows/macOS：启动 Docker Desktop，等状态变绿
docker info          # 能输出 Server Version 即正常
# Linux
sudo systemctl start docker
```

### 12.2 端口被占用

- 现象：`EADDRINUSE` / `Port 3000 is already in use` / `bind: address already in use`
- 排查与解决：

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

或改端口：

- 后端：改 `.env` 的 `PORT`（如 3001），同时把 `frontend/vite.config.js` 里的代理目标改成同一端口。
- 前端：Vite 端口是 `strictPort`，改 `frontend/vite.config.js` 的 `server.port`。
- MySQL：改 `.env` 的 `DB_PUBLISH_PORT=3307`，并同步 `DB_PORT=3307`。

### 12.3 环境变量缺失或无效

- 现象：启动报 `[config] JWT_SECRET …`、`请在 .env 中设置 DB_PASSWORD`
- 原因：没生成 `.env`、`JWT_SECRET` 仍是占位符、MySQL 模式下密码为空。
- 解决：

```bash
node scripts/init-env.mjs --force   # 重新生成（会覆盖 .env，注意先备份自定义值）
node scripts/check-env.mjs
```

### 12.4 数据库连接失败

- 现象：`/health` 返回 503；日志 `ECONNREFUSED 127.0.0.1:3306`；`ER_ACCESS_DENIED_ERROR`
- 原因：容器未就绪、端口没映射、密码不一致、`DB_DRIVER` 没改成 mysql。
- 解决：

```bash
docker ps                              # 确认 csl-db 在运行且 healthy
docker logs csl-db --tail 50           # 看初始化是否失败
nc -vz 127.0.0.1 3306                  # 确认端口通（Windows 用 Test-NetConnection）
node scripts/check-env.mjs --db        # 检查 DB 配置与端口
```

检查 `.env` 中 `DB_DRIVER=mysql`、`DB_HOST=127.0.0.1`、`DB_PASSWORD` 与容器初始化值一致。

### 12.5 迁移失败

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `ER_ACCESS_DENIED_ERROR` | 账号/密码错 | 核对 `.env`；必要时重建容器卷 |
| `ECONNREFUSED` | 数据库没起来 | 等 `healthy`，再执行迁移 |
| `Unknown database` | 用旧脚本/手写命令 | 用 `npm --prefix backend run db:migrate`（会自动建库） |
| SQL 语法错误 | MySQL 版本过低 | 确认 MySQL 8.0.19+（本项目锁定 8.4） |
| `Table already exists` | 手工执行过 SQL | 用迁移记录表判断；必要时 `db:reset` 后重来 |

### 12.6 改了密码但连不上（MySQL 初始化特性）

- 原因：MySQL 容器**只在数据卷为空时**用 `MYSQL_PASSWORD` 初始化账号；之后改 `.env` 不会自动改数据库密码。
- 解决（本地数据可丢）：

```bash
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env down -v
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env up -d db
npm --prefix backend run db:migrate && npm --prefix backend run db:seed
```

### 12.7 依赖安装失败

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| `EACCES` / `EPERM` | 权限不足或缓存目录不可写 | 不要用 `sudo npm`；指定可写缓存：`npm install --cache ./.npm-cache` |
| `ETIMEDOUT` / `ECONNRESET` | 网络/代理 | 换网络；`npm config set registry https://registry.npmmirror.com` 后重试 |
| `ERESOLVE` | 依赖冲突 | 不要混用 `--legacy-peer-deps`；删除 `node_modules` 与 lock 后重装需先与组长确认 |
| `npm.ps1 无法加载` | PowerShell 执行策略 | 使用 `npm.cmd` |

### 12.8 权限问题（Windows）

- 现象：`EPERM: operation not permitted`、文件被占用、无法删除 `node_modules`
- 解决：关闭占用文件的编辑器/终端；把仓库移到用户目录（如 `C:\Users\<你>\course-sec-lab`）或你的数据盘；**不要**用管理员权限运行 npm（反而会制造 root 属主问题）。

### 12.9 换行符 / 路径问题

- 现象：`bash: $'\r': command not found`、脚本在 Windows 上执行失败。
- 原因：文件被保存为 CRLF。
- 解决：

```bash
git config --global core.autocrlf false
git checkout -- .          # 重新检出（先确认没有未提交改动）
# 或安装 dos2unix 后：dos2unix scripts/*.sh
```

本仓库已用 `.gitattributes` 统一 LF；仍建议在 **Git Bash** 中执行 `.sh` 脚本，而不是 PowerShell。

### 12.10 Node 版本过低

- 现象：语法错误、`engines` 警告、启动即崩溃。
- 解决：`node --version` 确认 ≥ 22；用 nvm 安装并切换。

### 12.11 前端能打开但接口 404 / Network Error

- 原因：后端没启动、代理端口不一致、`VITE_API_BASE_URL` 被改错。
- 解决：先 `curl http://127.0.0.1:3000/api/v1/health`；确认 `vite.config.js` 代理目标与 `.env` 的 `PORT` 一致；重启 Vite。

### 12.12 上传失败

- 413：文件超过 2MB，压缩后再传。
- 415：类型不在 PNG/JPEG/WebP 或文件内容与扩展名不符，换真实图片。
- 401：未登录或 token 过期，重新登录。

## 13. 本地验收清单

完成一项打一个 `x`：

- [ ] `git --version`、`node --version`（≥22）、`npm --version` 正常
- [ ] 已配置 `user.name` / `user.email`
- [ ] 仓库已克隆，`pwd` 在项目根目录
- [ ] 已生成 `.env`，`JWT_SECRET` 非占位符
- [ ] `node scripts/check-env.mjs` 无 FAIL
- [ ] 依赖安装完成（`backend/node_modules`、`frontend/node_modules` 存在）
- [ ] （路线 B）`docker compose ps` 显示 `csl-db` 为 healthy
- [ ] （路线 B）`db:migrate` 输出“已应用：001_init_schema”
- [ ] （路线 B）`db:seed` 输出 `users=2 business_items=3`
- [ ] 后端启动日志出现“HTTP 服务已启动”
- [ ] `GET /api/v1/health` 返回 200 且 `database.status=up`
- [ ] 前端启动，<http://127.0.0.1:5173> 可访问
- [ ] 未登录访问受限页会跳转 `/login`
- [ ] 用 `student / Demo@123456` 登录成功，概览显示角色“学生”
- [ ] 教材列表能看到 3 条种子数据
- [ ] 退出登录后旧会话失效
- [ ] 能找到日志位置（`backend/logs` 或终端）
- [ ] 能停止服务并重新启动
- [ ] 执行一次 `db:reset` + `db:migrate` + `db:seed` 后仍可登录（路线 B）
- [ ] 未把 `.env`、密码、token 提交或截图外传

## 14. 范围与下一步

- 本文只覆盖**本机**。云服务器、域名、HTTPS、安全组、备份与回滚见 [04 部署](./04-deploy.md)，由部署负责人完成后更新并评审。
- 本地**不要**填写任何真实云凭证；云上密码只存在于部署机的 `.env`（权限 600），不进入仓库。
- 卡住超过 30 分钟：把“执行的命令 + 完整报错 + 系统/版本”发到小组群，或按 [11 协作规范](./11-github-collaboration.md) 开 Issue；不要一个人反复重装。
