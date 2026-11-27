# 14 · 漏洞分支隔离与全量靶场检查

> **适用对象**：漏洞审查人、评审人、指导教师
> **前置条件**：已获取 `vuln/*` 分支；`main` 基线完整；本地具备 Node.js 22+、Docker（VULN-01 需要 MySQL 8.4）
> **预计耗时**：阅读 10 分钟；复跑 30～45 分钟
> **验证方式**：按第 2 节启动；按第 3 节对照结果；完整原始记录见仓库外本地报告（未提交）

## 1. 检查结论

**检查时间（UTC）**：2026-11-27
**基线**：`main` `a11e0a5`；历史单漏洞分支从 `6bdea94` 分出。
**当前课程内网部署分支**：`vuln/ALL`（已部署服务器），默认 `VULN_MODE=ALL`，5 个漏洞同时开启；`main` 源码仍无漏洞。
**隔离结论**：漏洞代码只在 `vuln/*`（当前全量分支为 `vuln/ALL`），`main` 无 `VULN_MODE`/漏洞渲染代码；单漏洞分支保留为参考。
**实现有效性**：5 个漏洞均按设计有效；VULN-01 已补全无口令登录绕过，VULN-04 已补全公开上传读取/HTML 执行。
**未验证**：未对公网暴露漏洞实例；B-09 仅在服务器 loopback；E-01 扫描对接、D-05 教师签字未完成。

## 2. 分支与开关

| 分支 | 用途 | 默认 `VULN_MODE` | main 无漏洞代码 |
| --- | --- | --- | --- |
| `vuln/ALL`（已部署） | 课程内网全量靶场 | `ALL`（5 个同时开启） | ✅ |
| `vuln/VULN-01` | 单漏洞参考 | `off` | ✅ |
| `vuln/VULN-02` | 单漏洞参考 | `off` | ✅ |
| `vuln/VULN-03` | 单漏洞参考 | `off` | ✅ |
| `vuln/VULN-04` | 单漏洞参考 | `off` | ✅ |
| `vuln/VULN-05` | 单漏洞参考 | `off` | ✅ |

核验方式：

1. `git diff --stat main...vuln/ALL` 确认改动范围；
2. `GET /api/v1/health` 的 `data.vulnMode` 必须为 `ALL`；
3. 启动日志必须出现“靶场漏洞模式已启用”告警；
4. `main` 上 `git grep -n "VULN_MODE" -- backend frontend`、`git grep -n "dangerouslySetInnerHTML" -- frontend` 无命中；
5. 验证后停止全量实例或恢复 `off`。

## 3. 实现有效性结果

| 漏洞 | 结果 | 有效性 |
| --- | --- | --- |
| VULN-01 | ALL：注入型登录名 + 任意密码 → 200 admin；正常用户名 + 错误密码仍 401 | **完全有效** |
| VULN-02 | ALL：描述原样存储，详情页执行 onerror；off：转义且不执行 | **有效** |
| VULN-03 | ALL：学生 PATCH admin 条目 200；off：403 | **有效** |
| VULN-04 | ALL：`text/html` 上传 201，`uploads-public/:id` 无认证 200 `text/html` 且执行；同名覆盖；off：415 | **完全有效** |
| VULN-05 | ALL：15 次失败均 401；off：第 11 次 429 | **有效** |

### 3.1 环境

| 项 | 内容 |
| --- | --- |
| 本地 | Windows 11 / Node v24.18.0 / MySQL 8.4.4 容器 / Edge 158 headless |
| 云服务器 | Ubuntu 24.04.2，2 vCPU / 894MiB + 2GiB swap；Docker 29.1.3 / Compose 2.40.3 |
| 验证方式 | 本地 ALL 实例 + 云服务器 loopback；VULN-02 经 SSH 隧道 + Edge headless |
| 数据 | 课程演示数据；无真实个人信息；测试密码不写入仓库 |

### 3.2 与设计目标的对应

- VULN-01：查询拼接 + 注入语法下跳过 bcrypt，已实现“无需正确密码登录为查询首行用户”。
- VULN-04：上传侧跳过 MIME/magic bytes/扩展名并保留原名；新增无认证公开读取路由，`text/html` 可直接在浏览器执行；同名上传覆盖文件。
- VULN-02：前端通过 `/health` 的 `vulnMode` 决定是否使用 `dangerouslySetInnerHTML`，`ALL` 下渲染原始 HTML。
- 单漏洞分支保持 `off`，避免误把参考分支当默认部署。

## 4. 证据与限制

- 完整清单/验证方法见 [16-vuln-catalog-and-verification.md](./16-vuln-catalog-and-verification.md)。
- 本地证据：`B09-server-verification-report.md`、`B10-vuln-verification-report.md`、`deploy-evidence/`（仓库外，未提交）。
- 云服务器仅保留主站；漏洞容器/网络验证后已删除；漏洞实例未公网暴露。
- 未执行批量利用、拒绝服务、持久化后门或非本项目目标测试。
- 未验证 Chrome/Firefox/Safari；VULN-02 仅 Edge 158 headless。
- VULN-04 的 MySQL 唯一约束同名上传行为未单独复测；内存驱动下覆盖已复现。

## 5. 复跑提示

```bash
# 全量分支（本地）
git switch vuln/ALL

# 后端依赖已存在时，直接启动；需 MySQL（VULN-01）
NODE_ENV=test DB_DRIVER=mysql DB_HOST=127.0.0.1 DB_PORT=3306 \
DB_NAME=course_sec_lab DB_USER=lab_user DB_PASSWORD='<本地测试密码>' \
VULN_MODE=ALL JWT_SECRET='<32+ 位随机值>' PORT=3108 \
node backend/src/server.js

curl -sS http://127.0.0.1:3108/api/v1/health
```

> 复跑必须用独立数据库/上传目录；结束后恢复 `VULN_MODE=off` 或停止实例，清理测试上传文件。
