# 课程 Web 安全靶场 · 校园二手教材交易平台

> 状态：**M1 完成 / M2 漏洞分支已验证 / M3 已部署** · `main` 保持安全基线 · VULN-01～05 已在 `vuln/*` 分支实现并完成 loopback 验证（默认 `off`，不合入 main） · 主站 `http://{{PUBLIC_IP}}:8080`（无域名/HTTPS） · 本次文档改动未 push
> 用途：课程小组自主设计的 Web 管理系统靶场，仅用于**课程授权范围**内的安全测试。

## 这是什么

一个可运行的 Web 管理系统：学生发布/浏览二手教材，管理员维护平台内容。`main` 已完成 **M1 业务阶段**：登录/角色、条目增删改查（归属校验 + 状态机 + 乐观锁 + 审计）、封面上传与受控读取、管理端用户启停与审计检索；**VULN-01～05 只在 `vuln/*` 独立分支实现，默认关闭，不合并 main**。

**不是什么**：

- ⚠️ **main 不是漏洞靶场成品**：SQL 注入 / XSS / 越权 / 不安全上传 / 弱认证只存在于 `vuln/*` 分支；VULN-01～05 默认 `VULN_MODE=off`，仅用于课程授权靶场
- ✅ 已在课程授权服务器完成主站部署：`http://{{PUBLIC_IP}}:8080`（Ubuntu 24.04 / Docker Compose / MySQL 8.4；无域名/HTTPS）
- ❌ 不是生产系统（单机课程版、演示账号暂保留、无 HTTPS）

## 快速开始（3 分钟，无需 MySQL）

```bash
# 1) 初始化本地环境变量（自动生成随机 JWT_SECRET，默认内存驱动）
node scripts/init-env.mjs

# 2) 安装依赖
npm --prefix backend install
npm --prefix frontend install

# 3) 启动（两个终端）
npm --prefix backend run dev     # http://127.0.0.1:3000
npm --prefix frontend run dev    # http://127.0.0.1:5173
```

打开 <http://127.0.0.1:5173>，用演示账号登录：

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `Demo@123456` | 管理员 |
| `student` | `Demo@123456` | 学生 |

> 演示账号仅限课程环境；部署到公网前必须改密或停用。

验证后端：

```bash
curl -sS http://127.0.0.1:3000/api/v1/health
# {"success":true,"code":"OK",...,"data":{"status":"ok","checks":{"database":{"driver":"memory",...}}}}
```

> Windows PowerShell 若提示“禁止运行脚本”，请把 `npm` 换成 `npm.cmd`（执行策略限制，不是项目问题）。

## 使用 MySQL（正式开发模式）

```bash
# 1) 准备 MySQL 8.4，并在 .env 中设置：
#    DB_DRIVER=mysql
#    DB_HOST=127.0.0.1 / DB_PORT=3306 / DB_NAME=course_sec_lab
#    DB_USER=lab_user / DB_PASSWORD=<本地密码>
# 2) 建库 + 种子（会自动创建数据库）
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
# 3) 重新启动后端
npm --prefix backend run dev
```

或使用 Docker（需安装 Docker + Compose）：

```bash
docker compose -f deploy/docker-compose.yml --env-file .env up -d
```

> Compose 的 `db` 服务**不暴露宿主机端口**，迁移需在 backend 容器内执行，详见 [部署手册](docs/04-deploy.md)。
> 只想用 Docker 起数据库、前后端仍在本机跑：使用 `deploy/docker-compose.dev.yml` 覆盖文件，完整步骤见 [本地部署](docs/12-local-setup.md)。

## 团队协作入口

| 入口 | 用途 |
| --- | --- |
| [TODO.md](TODO.md) | 课程任务清单、负责人、依赖、完成证据与勾选规则 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献规则速查（提 PR 前必读） |
| [GitHub 协作规范](docs/11-github-collaboration.md) | 术语、分支、push/pull、PR、评审、冲突解决 |
| [本地部署](docs/12-local-setup.md) | 从安装软件到登录成功的每一步与常见错误 |
| [交付流程](docs/13-m1-delivery-runbook.md) | M1 本地测试 → PR 提交 → 合并的逐条命令 |
| [PR 模板](.github/pull_request_template.md) / [Issue 模板](.github/ISSUE_TEMPLATE/task.md) | 提交时自动带出 |

## 目录结构

```text
course-sec-lab/
├── README.md
├── TODO.md                 # 课程任务清单与完成标记
├── CONTRIBUTING.md         # 贡献规则速查
├── .env.example            # 环境变量模板（只含占位符）
├── Makefile                # Linux/macOS/WSL 快捷命令
├── .github/                # PR / Issue 模板
├── docs/                   # 22 篇设计、规范、验证与验收文档
├── backend/                # Node.js + Express
│   ├── src/{config,routes,controllers,services,repositories,middlewares,models,utils,db}
│   ├── scripts/            # 迁移 / 种子 / 重置（mysql2）
│   └── tests/              # node:test 自动化测试（44 项）
├── frontend/               # React 18 + Vite 5
│   ├── src/{api,components,layouts,pages,router,store,utils,styles}
│   └── public/
├── db/
│   ├── migrations/         # 001_init_schema.sql、002_m1_business_indexes.sql
│   ├── seeds/              # 001_seed_base.sql、002_seed_m1_demo.sql
│   └── reset.sql
├── deploy/
│   ├── docker-compose.yml  # web + backend + db
│   ├── docker-compose.dev.yml # 仅本地：把 MySQL 映射到 127.0.0.1
│   ├── docker-compose.lowmem.yml # 低内存主机可选覆盖
│   ├── nginx/default.conf
│   └── scripts/            # deploy / rollback / wait-for-db
├── scripts/                # init-env / check-env / check-framework / dev-up / seed
└── tests/                  # 跨栈冒烟 + API 契约测试
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `node scripts/init-env.mjs` | 生成 `.env`（随机 JWT_SECRET） |
| `node scripts/check-env.mjs [--db]` | 环境自检（含 MySQL 端口探测） |
| `bash scripts/dev-up.sh` | 一键启动本地开发环境 |
| `npm --prefix backend run dev` | 后端（3000，`--watch`） |
| `npm --prefix frontend run dev` | 前端（5173） |
| `npm --prefix backend test` | 后端测试（44 项） |
| `npm run smoke` | 冒烟测试（6 项，需后端已启动） |
| `npm run contract` | API 契约测试（11 项，需后端已启动） |
| `npm --prefix frontend run build` | 前端生产构建 |
| `npm --prefix backend run db:migrate` | 数据库迁移 |
| `npm --prefix backend run db:seed` | 种子数据 |
| `npm --prefix backend run db:test-account` | 创建/启用课程测试账号（密码从环境变量读取，见 [docs/15](docs/15-vuln-test-accounts.md)） |
| `bash scripts/seed.sh` | 重置 + 迁移 + 种子（演示前标准动作） |
| `docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env up -d db` | 仅启动本地 MySQL（绑定 127.0.0.1） |
| `npm run check` | 框架自检（目录/JSON/YAML/密钥/文档） |
| `make help` | Make 快捷命令 |

## API 一览

前缀固定 `/api/v1`，统一响应信封与错误码见 [API 契约](docs/03-api.md)。

| 方法 | 路径 | 状态 |
| --- | --- | --- |
| GET | `/api/v1/health` | ✅ |
| POST | `/api/v1/auth/login` | ✅ |
| POST | `/api/v1/auth/logout` | ✅ |
| GET | `/api/v1/auth/me` | ✅ |
| GET | `/api/v1/business-items` | ✅ 分页 / 过滤 / 我的条目 |
| GET | `/api/v1/business-items/:id` | ✅ |
| POST | `/api/v1/business-items` | ✅ 归属校验 + 初始草稿 + 审计 |
| PATCH | `/api/v1/business-items/:id` | ✅ 归属校验 + 状态机 + 乐观锁 |
| DELETE | `/api/v1/business-items/:id` | ✅ 软删除 + 封面归档 |
| POST | `/api/v1/uploads` | ✅ 安全上传基线 |
| GET | `/api/v1/uploads/:id` | ✅ 受控鉴权读取 |
| GET | `/api/v1/admin/users` | ✅ 管理员 |
| PATCH | `/api/v1/admin/users/:id/status` | ✅ 管理员 |
| GET | `/api/v1/admin/audit-logs` | ✅ 管理员 |

## 文档

| 文档 | 内容 |
| --- | --- |
| [00 总览](docs/00-overview.md) | 业务场景、角色、边界 |
| [01 架构](docs/01-architecture.md) | 拓扑、分层、端口 |
| [02 数据库](docs/02-database.md) | ER 图、表结构、索引、种子 |
| [03 API](docs/03-api.md) | 完整契约与示例 |
| [04 部署](docs/04-deploy.md) | 步骤（占位符）、备份、回滚 |
| [05 环境](docs/05-environment.md) | 版本锁定、命令、日志、变量 |
| [06 规范](docs/06-conventions.md) | 分支、提交、PR、代码规范 |
| [07 隔离授权](docs/07-security-isolation.md) | 独立隔离、授权边界、下线 |
| [08 漏洞设计](docs/08-vuln-design.md) | VULN-01～05（vuln/* 已实现，默认 off） |
| [09 验证模板](docs/09-verify-template.md) | 验证流程与记录模板 |
| [10 访问登记](docs/10-access.md) | 访问信息与账号发放（占位） |
| [11 GitHub 协作](docs/11-github-collaboration.md) | 术语、分支、push/pull、PR、评审、冲突解决 |
| [12 本地部署](docs/12-local-setup.md) | 从安装软件到登录验证的完整步骤 |
| [13 交付流程](docs/13-m1-delivery-runbook.md) | M1 本地测试 + PR 提交的逐条命令 |
| [14 隔离检查](docs/14-vuln-branch-isolation-check.md) | B-10 分支隔离与五漏洞有效性检查 |
| [15 测试账号](docs/15-vuln-test-accounts.md) | 测试账号、造数脚本与数据字典 |
| VERIFY-VULN-0x-01（5 份） | 各漏洞验证方法（B-09 执行） |
| [框架验收](docs/framework-acceptance.md) | M0 框架阶段人工验收基线 |

## 新成员接入

1. 阅读 [00 总览](docs/00-overview.md)、[06 规范](docs/06-conventions.md)、[11 GitHub 协作](docs/11-github-collaboration.md)。
2. 按 [12 本地部署](docs/12-local-setup.md) 跑通健康检查与登录（截图留存，作为接入证明）。
3. 在 [TODO.md](TODO.md) 认领任务并建 Issue，从最新 `main` 拉 `feat/<issue>-<slug>` 分支。
4. 提交前执行：后端测试 + 前端构建 + `npm run check`；跨栈冒烟/契约与完整清单见 [13 交付流程](docs/13-m1-delivery-runbook.md) 第 2 节。
5. 按 [PR 模板](.github/pull_request_template.md) 提 PR，至少 1 人 Review 后 Squash 合并；完成任务时在同一 PR 勾选 TODO 并填写证据。
6. PR 的逐条命令（含提交拆分与描述模板）见 [13 交付流程](docs/13-m1-delivery-runbook.md) 第 3 节。

## 后续 Issue 拆分建议

> 正式任务、负责人与完成标记以 [TODO.md](TODO.md) 为准；下表只作为排期参考。

| 优先级 | Issue | 内容 | 预估 |
| --- | --- | --- | --- |
| P0 | B-02～B-06 | VULN-01～05 独立分支实现（开关默认关闭，不合入 main） | 已完成（独立分支） |
| P1 | B-07～B-11 | 测试账号、验证方法、隔离检查、B-09 复验、清单定稿 | 已完成（服务器 loopback） |
| P0 | C-01～C-05 | 独立云资源、安全组、服务器初始化、生产 `.env`、容器部署 | 已完成 |
| P1 | C-06～C-09 | 公网访问、日志监控、备份回滚、HTTPS | C-06/C-07 完成；C-08 部分；C-09 不适用 |
| P1 | D-01～D-05 | 部署/漏洞/验证/访问/隔离文档定稿 | D-01～D-04 完成；D-05 待签字 |
| P1 | E-01～E-07 | 扫描对接、窗口、日志、分诊、回收、下线、复盘 | 待外部/课程平台 |
| P2 | M0-01（未入 TODO） | 依赖升级与 CI（测试 + 构建 + 自检） | 0.5 天 |

> 主站已部署在课程授权云服务器（HTTP 8080）；B-09 在服务器 loopback 完成；B-12 按要求保留主站未下线。剩余任务以 [TODO.md](TODO.md) 为准。

## 安全与合规

- 本仓库不含真实密码、云密钥、证书私钥；`.env` 已被忽略。
- 演示账号与假数据仅用于课程环境。
- 漏洞实现必须独立分支/独立实例/显式开关，且仅限课程授权测试，详见 [08](docs/08-vuln-design.md) 与 [07](docs/07-security-isolation.md)。
- 禁止对非本项目目标进行任何扫描或攻击。

## 当前验证状态

> 更新于 2026-11-27（Windows 11 + Node v24.18.0；M0 历史数据保留在 [框架验收](docs/framework-acceptance.md)）。

| 项 | 结果 |
| --- | --- |
| 后端自动化测试（内存驱动） | ✅ 44 项通过（本次重跑） |
| 前端生产构建 | ✅ 57 模块通过（本次重跑） |
| 框架静态自检 `npm run check` | ✅ 26 项通过 |
| 冒烟 / 契约测试（内存驱动） | ✅ 6 项 + 11 项通过 |
| MySQL 迁移 / 种子 | ✅ 本地独立容器 + 云服务器 Compose 实例均复验：`001`+`002`，users=2 / items=11 |
| 主站公网 | ✅ `http://{{PUBLIC_IP}}:8080`：health 200、登录 200、前端 200 |
| 前端进度文案 | ✅ 2026-11-27 登录页/主页已同步，并重建 `csl-web` 容器上线 |
| B-09 五漏洞（服务器 loopback） | ✅ 全部执行；VULN-02/03/05 有效，VULN-01/04 部分有效；漏洞容器已删除 |
| 备份 / 恢复 | ✅ DB dump + uploads 打包；DB dump 恢复到临时库核对（2/11）后删除 |
| Docker Compose 编排 | ✅ 云服务器三容器 healthy；镜像本地构建后 `docker load`（服务器 Docker Hub 超时） |
| 浏览器端到端 | ⚠️ VULN-02 用 Edge 158 headless；M1 全量 E2E 仍未自动化 |
| 公网 80 / HTTPS | ⚠️ 80 被云侧拦截，改用 8080；无域名/HTTPS（用户选择暂不需要） |
| B-12/E 外部项 | ⏳ 主站按要求保留；教师签字/扫描对接/复盘未执行 |

> 详细命令、关键输出与仍未验证项见 [框架验收清单](docs/framework-acceptance.md) 附录 A/B/D。

Ciallo～(∠・ω< )⌒☆
