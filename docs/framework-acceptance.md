# 框架阶段人工验收清单

> **适用对象**：课程小组成员、指导教师、验收人
> **前置条件**：已完成 [00-overview.md](./00-overview.md) 阅读；本机具备 Node.js 22+（或 Docker）；被测代码为当前 `main` / 课程约定提交
> **预计耗时**：完整走查 40～60 分钟

## 1. 验收说明

- 本清单用于 **M0 框架阶段** 的人工验收，共 24 项。
- “实际结果”“验收人 / 日期”两列**由验收人现场填写**，本仓库不预填、不代填。
- 每项都必须实际执行；无法执行的项填写“未执行 + 原因”，**不得默认通过**。
- 验收结论只有三种：通过 / 有条件通过（列出遗留项与期限）/ 不通过。

## 2. 验收环境（验收人填写）

| 项 | 填写 |
| --- | --- |
| 验收日期 | |
| 代码版本（commit/tag） | |
| 操作系统 | |
| Node.js / npm | |
| 是否使用 MySQL / Docker | |
| 执行人 | |
| 复核人 | |

## 3. 验收方法

| 方法 | 说明 |
| --- | --- |
| 自动检查 | `npm run check`、后端测试、前端构建、冒烟/契约测试 |
| 人工检查 | 目录、文档、配置、浏览器操作、命令复现 |
| 证据 | 命令输出、截图、`requestId`、数据库查询结果（不含真实密钥） |

## 4. 验收检查表

| 编号 | 检查项 | 操作步骤 | 预期结果 | 实际结果 | 验收人 / 日期 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | 目录结构完整 | 对照 README 目录树与 [00-overview.md](./00-overview.md)，检查 `backend/src` 各层、`frontend/src`、`db`、`deploy`、`docs`、`scripts`、`tests` | 目录与文件齐全，职责与文档一致；无空目录占位 | | | |
| F-02 | 仓库无真实密钥 | 执行 `npm run check`；人工抽查 `.env.example`、`docs/`、`deploy/`、截图 | 密钥扫描通过；仅存在占位符；`.env` 未被提交 | | | |
| F-03 | 环境变量模板可用 | `cp .env.example .env` → `node scripts/init-env.mjs`；对照 [05-environment.md](./05-environment.md) 变量表 | 关键变量齐全；`JWT_SECRET` 为随机值；说明与代码一致 | | | |
| F-04 | 数据库迁移可从空库执行 | 准备空 MySQL 8.4 → `.env` 设 `DB_DRIVER=mysql` → `npm --prefix backend run db:migrate` | 自动建库；6 张表创建成功；`schema_migrations` 记录 001 | | | |
| F-05 | 种子账号可用 | `npm --prefix backend run db:seed` → 登录 `admin` / `student`（密码 `Demo@123456`） | 两个账号均可登录；`role` 分别为 admin/student；密码以 bcrypt 存储 | | | |
| F-06 | API 文档完整 | 对照 [03-api.md](./03-api.md) 的端点总表逐项验证；检查统一响应、错误码、分页、上传约定 | 文档字段/示例与实现一致；无未文档化接口 | | | |
| F-07 | 前端可启动 | `npm --prefix frontend install` → `npm --prefix frontend run dev` → 浏览器访问 5173 | 页面正常渲染；`/api` 代理到后端；无控制台报错 | | | |
| F-08 | 健康检查通过 | `curl -sS http://127.0.0.1:3000/api/v1/health` | HTTP 200；`data.status=ok`；带 `requestId`；数据库状态 up | | | |
| F-09 | 最小登录闭环 | 浏览器：未登录访问 `/business` → 跳登录 → 登录 → 概览 → 退出 | 未登录被重定向；登录后可见受限页；退出后回登录页且旧令牌 401 | | | |
| F-10 | 部署文档可复现 | 按 [04-deploy.md](./04-deploy.md) 在授权测试机执行（不要求本次真做公网部署） | 步骤可执行；占位符明确；无伪造 IP/域名/验证结果 | | | |
| F-11 | 隔离与授权说明 | 阅读 [07-security-isolation.md](./07-security-isolation.md)；核对安全组与资源清单 | 独立隔离、仅授权测试、下线流程与检查清单完整 | | | |
| F-12 | 漏洞模板可用 | 阅读 [08-vuln-design.md](./08-vuln-design.md) 与 [09-verify-template.md](./09-verify-template.md) | VULN-01～05 编号/字段/验证模板齐全；明确“未实现” | | | |
| F-13 | 重置脚本可重复演示 | `npm --prefix backend run db:reset` → `db:migrate` → `db:seed`；重复一次 | 每次重置后数据一致；上传目录被清理；可重复登录 | | | |
| F-14 | 冒烟测试通过 | 启动后端 → `npm run smoke`；`npm run contract` | 全部用例通过；失败时有明确提示 | | | |
| F-15 | README 新手可启动 | 让未参与开发的同学按 README“快速开始”独立操作 | 5 分钟内跑通健康检查与登录；无需口头补充 | | | |
| F-16 | 未实际植入漏洞 | 抽查 `backend/src`、`frontend/src`：登录 SQL 是否参数化、渲染是否转义、上传是否有白名单、写接口是否 501 | 无 SQL 拼接、无 `dangerouslySetInnerHTML`、上传有多层校验、写接口 501 | | | |
| F-17 | 统一响应与错误码 | 分别触发成功、400、401、403、404、415、501、503 | 均返回统一信封；`code` 与文档一致；不泄露堆栈 | | | |
| F-18 | 前端路由守卫 | 未登录直接访问 `/`、`/business/1`、`/admin`；学生访问 `/admin` | 未登录跳登录并记住来源；学生看到 403 提示 | | | |
| F-19 | 上传安全基线 | 登录后上传：正常 PNG、改扩展名的文本、超 2MB 文件、未登录请求 | 依次 201 / 415 / 413 / 401；失败无残留文件 | | | |
| F-20 | 审计日志 | 登录成功/失败、退出、上传后查询 `audit_logs` | 记录 actor/action/result/IP；无密码或 token 明文 | | | |
| F-21 | Compose 拓扑安全 | 审查 `deploy/docker-compose.yml`（或 `docker compose config`） | db 无 `ports`；internal 网络 `internal: true`；仅 web 暴露端口 | | | |
| F-22 | 文档头部三要素 | 抽查全部 `docs/*.md` | 每篇开头含适用对象、前置条件、预计耗时 | | | |
| F-23 | 版本与端口锁定 | 对照 [05-environment.md](./05-environment.md) 与 Dockerfile / package.json | Node/MySQL/Nginx/依赖版本一致；端口表与配置一致 | | | |
| F-24 | 资料可交接 | 检查 README 文档索引、成员接入、Issue 拆分建议、[10-access.md](./10-access.md) | 新成员可按文档接手；访问登记为占位模板 | | | |

## 5. 验收结论

| 项 | 填写 |
| --- | --- |
| 通过项数 / 总项数 | |
| 有条件通过（遗留项与期限） | |
| 不通过项及原因 | |
| 结论 | ☐ 通过　☐ 有条件通过　☐ 不通过 |
| 验收人签字 / 日期 | |
| 指导教师签字 / 日期 | |

## 6. 附录 A：搭建阶段已执行的自动检查（参考，不替代人工验收）

> 以下为框架搭建时在本机（Windows 11 / Node v24.18.0 / npm 11.16.0）实际执行的检查，仅供复核。**验收人仍需独立执行第 4 节各项。**

| # | 检查 | 命令 | 结果 |
| --- | --- | --- | --- |
| A-1 | 后端 JS 语法 | `node --check`（遍历 `backend/src`、`scripts`、`tests`） | ✅ 48 个文件全部通过 |
| A-2 | 后端自动化测试 | `node tests/health.test.mjs` 等 4 个文件 | ✅ 23 项断言全部通过 |
| A-3 | 前端生产构建 | `npm --prefix frontend run build` | ✅ 55 个模块，产物 186.99 kB JS + 9.70 kB CSS |
| A-4 | 前端打包（辅助） | `esbuild src/main.jsx --bundle` | ✅ 1.41 MB bundle，无解析错误 |
| A-5 | 环境自检 | `node scripts/check-env.mjs` | ✅ 通过 7 / 警告 1（memory 驱动）/ 失败 0 |
| A-6 | 健康检查 | `curl /api/v1/health` | ✅ 200，`status=ok`，`requestId` 存在 |
| A-7 | 冒烟测试 | `node tests/smoke/smoke.test.mjs` | ✅ 5 项通过 |
| A-8 | API 契约测试 | `node tests/api/contract.test.mjs` | ✅ 6 项通过 |
| A-9 | 框架静态自检 | `npm run check` | ✅ 26 项通过，0 警告，0 失败 |
| A-10 | Compose YAML 语法 | `js-yaml` 解析 | ✅ 语法合法；db 无端口、internal 网络正确 |

## 7. 附录 B：未验证项与原因（必须如实保留）

| 项 | 状态 | 原因 | 后续动作 |
| --- | --- | --- | --- |
| MySQL 迁移 + 种子实际执行 | ❌ 未验证 | 本机未安装 MySQL，也无 Docker | 在具备 MySQL 8.4 的环境执行 `db:migrate` / `db:seed`，补 F-04/F-05 记录 |
| Docker Compose 构建与启动 | ❌ 未验证 | 本机未安装 Docker | 在部署机执行 `compose build` + `up -d`，验证 F-21 |
| 浏览器端到端渲染/交互 | ❌ 未验证 | 无浏览器自动化环境；构建与打包只证明可编译 | 按 F-07/F-09/F-18 人工走查并截图 |
| `scripts/*.sh`、`deploy/scripts/*.sh` 运行 | ❌ 未验证 | Windows 环境未启用 WSL/Unix shell；尝试 `bash -n` 返回 `E_ACCESSDENIED` | 在 Linux/macOS 或 WSL 执行 `bash -n` 与实跑，补记录 |
| 公网部署 / 域名 / HTTPS | ❌ 未执行 | 课程要求不创建真实资源，且框架阶段不部署 | M3 阶段按 [04-deploy.md](./04-deploy.md) 执行并登记 |
| 漏洞可利用性验证 | ❌ 不适用 | 框架阶段明确不实现漏洞 | M2 阶段按 [08](./08-vuln-design.md) / [09](./09-verify-template.md) 执行 |
| 性能/并发 | ❌ 未验证 | 框架阶段不做性能指标 | 后续按需补充 |

## 8. 附录 C：不通过处理

1. 将不通过项登记为 Issue（标题 `[验收] F-xx 不通过：原因`）。
2. 修复后由**同一验收人**复测原条目，并在“实际结果”补充复测记录。
3. 影响框架基线（目录/契约/安全）的修复必须更新对应文档并重新执行 `npm run check`。
4. 全部通过后，才可进入 M1 业务实现。

## 9. 附录 D：框架自检执行记录

> 由 `npm run check` 生成的结果摘要，粘贴于此处（验收人可重新执行比对）。

```text
$ npm run check
...
========================================================================
框架自检完成：通过 26 · 警告 0 · 失败 0
结论：框架静态检查通过。

（执行时间：2026-11-13T12:3xZ，环境：Windows 11 / Node v24.18.0 / npm 11.16.0）
关键通过项：目录与文件完整、Compose YAML 合法、db 无宿主机端口、
internal 网络 internal:true、密钥扫描 122 个文本文件、迁移包含 5 张必需表、
验收表格 24 项字段齐全、后端源码无 eval/child_process。
```
