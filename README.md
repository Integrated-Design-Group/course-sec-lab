# 课程 Web 安全靶场 · 校园二手教材交易平台

> 状态：**M1 业务阶段** · 条目 CRUD / 封面 / 管理端已实现 · 未植入任何漏洞 · 未创建云资源 · 未执行 git push
> 用途：课程小组自主设计的 Web 管理系统靶场，仅用于**课程授权范围**内的安全测试。

## 这是什么

一个可运行的 Web 管理系统：学生发布/浏览二手教材，管理员维护平台内容。当前完成 **M1 业务阶段**：登录/角色、条目增删改查（归属校验 + 状态机 + 乐观锁 + 审计）、封面上传与受控读取、管理端用户启停与审计检索；漏洞仅完成设计冻结，代码尚未实现。

**不是什么**：

- ❌ 不是漏洞靶场成品（SQL 注入 / XSS / 越权 / 不安全上传均未实现，VULN-01～05 仅“已设计”）
- ❌ 不是已部署环境（`docs/04-deploy.md` 只有占位符与步骤，未创建任何云资源）
- ❌ 不是生产系统（单机课程版、演示账号、无 HTTPS）

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
├── docs/                   # 15 篇设计与规范文档
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
| [08 漏洞设计](docs/08-vuln-design.md) | VULN-01～05（已设计，未实现） |
| [09 验证模板](docs/09-verify-template.md) | 验证流程与记录模板 |
| [10 访问登记](docs/10-access.md) | 访问信息与账号发放（占位） |
| [11 GitHub 协作](docs/11-github-collaboration.md) | 术语、分支、push/pull、PR、评审、冲突解决 |
| [12 本地部署](docs/12-local-setup.md) | 从安装软件到登录验证的完整步骤 |
| [13 交付流程](docs/13-m1-delivery-runbook.md) | M1 本地测试 + PR 提交的逐条命令 |
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
| P0 | B-02～B-06 | VULN-01～05 独立分支实现（开关默认关闭，不合入 main） | 每个 0.5～1 天 |
| P1 | B-07～B-10 | 测试账号、验证方法、复现归档、隔离边界检查 | 2～3 天 |
| P0 | C-01～C-05 | 独立云资源、安全组、服务器初始化、生产 `.env`、容器部署 | 2 天 |
| P1 | C-06～C-09 | 公网访问、日志监控、备份回滚、HTTPS | 2 天 |
| P1 | D-01～D-05 | 部署/漏洞/验证/访问/隔离文档定稿 | 2 天 |
| P1 | E-01～E-07 | 扫描对接、窗口、日志、分诊、回收、下线、复盘 | 3 天 |
| P2 | M0-01（未入 TODO） | 依赖升级与 CI（测试 + 构建 + 自检） | 0.5 天 |

> M1（A-01～A-07、A-09、A-10）与 B-01 已完成；剩余任务以 [TODO.md](TODO.md) 的勾选状态为准。

## 安全与合规

- 本仓库不含真实密码、云密钥、证书私钥；`.env` 已被忽略。
- 演示账号与假数据仅用于课程环境。
- 漏洞实现必须独立分支/独立实例/显式开关，且仅限课程授权测试，详见 [08](docs/08-vuln-design.md) 与 [07](docs/07-security-isolation.md)。
- 禁止对非本项目目标进行任何扫描或攻击。

## 当前验证状态

> 更新于 2026-11-18（Windows 11 + Node v24.18.0 / npm 11.16.0，内存驱动；M0 历史数据保留在 [框架验收](docs/framework-acceptance.md)）。

| 项 | 结果 |
| --- | --- |
| 后端自动化测试（内存驱动） | ✅ 44 项通过（health 4 / auth 6 / business 10 / business-write 9 / upload 7 / admin 8） |
| 前端生产构建 | ✅ 通过（57 模块） |
| 框架静态自检 `npm run check` | ✅ 26 项通过 |
| 冒烟 / 契约测试（内存驱动） | ✅ 6 项 + 11 项通过 |
| MySQL 迁移 / 种子 / 重置 | ⚠️ `001` 为 M0 历史实测；`002` 迁移与 `002` 种子**未在本次环境复验**（未启动 MySQL） |
| Docker Compose 编排 | ⚠️ M0 已实测通过；M1 未重新构建镜像验证 |
| 浏览器端到端 | ⚠️ M0 有 11 项历史记录；M1 新增表单/管理页尚未做自动化 E2E，手测清单见 [13](docs/13-m1-delivery-runbook.md#26-浏览器手测清单) |
| 公网部署 / 域名 / HTTPS | ⚠️ 未执行（按课程要求未创建云资源） |

> 详细命令、关键输出与仍未验证项见 [13 交付流程](docs/13-m1-delivery-runbook.md) 与 [框架验收清单](docs/framework-acceptance.md) 附录 B。
