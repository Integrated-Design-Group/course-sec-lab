# 14 · 漏洞分支隔离与实现有效性检查

> **适用对象**：漏洞审查人、评审人、指导教师
> **前置条件**：已获取 `vuln/*` 分支；`main` 基线完整；本地具备 Node.js 22+、Docker（VULN-01 需要 MySQL 8.4）
> **预计耗时**：阅读 10 分钟；复跑 30～45 分钟
> **验证方式**：按本文第 2 节逐分支启动；按第 3 节对照结果；完整原始记录见仓库外本地报告（未提交）

## 1. 检查结论

**检查时间（UTC）**：2026-11-26T13:51Z
**基线**：`main` `a11e0a5`；5 个 `vuln/*` 分支均从 `6bdea94`（M1 合并）分出。
**隔离结论**：5 个漏洞的代码只存在于对应 `vuln/VULN-0x` 分支；`main` 的后端/前端源码无 `VULN_MODE` 配置、无漏洞分支代码；5 个分支的 `VULN_MODE` 默认均为 `off`。
**实现有效性结论**：VULN-02、VULN-03、VULN-05 按设计有效；VULN-01、VULN-04 **部分有效**，与设计预期存在差异，详见第 3 节。
**未验证**：B-09 已在课程授权云服务器的独立容器/端口上完成 loopback 复验（2026-11-26），未向公网暴露漏洞实例；公网仅保留主站。第三方扫描系统对接（E-01）与教师签字（D-05）仍未完成。

## 2. 分支与开关核验

| 分支 | 漏洞 | commit | 默认 `VULN_MODE` | 仅分支存在漏洞代码 | main 无漏洞代码 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| `vuln/VULN-01` | 登录 SQL 注入 | `ac2d403` | `off` | ✅ | ✅ | 隔离通过 |
| `vuln/VULN-02` | 存储型 XSS | `d8955f5` | `off` | ✅ | ✅ | 隔离通过 |
| `vuln/VULN-03` | 水平越权（IDOR） | `ddb46b8` | `off` | ✅ | ✅ | 隔离通过 |
| `vuln/VULN-04` | 不安全文件上传 | `e14dbce` | `off` | ✅ | ✅ | 隔离通过 |
| `vuln/VULN-05` | 登录限流失效 | `6297129` | `off` | ✅ | ✅ | 隔离通过 |

核验方式：

1. `git ls-remote --heads origin` 确认 5 个远端分支及 commit；
2. `git diff --stat main...origin/vuln/VULN-0x` 确认改动范围；
3. 每个分支分别以 `VULN_MODE=off` 和对应 `VULN_MODE=VULN-0x` 启动后端；
4. `GET /api/v1/health` 的 `data.vulnMode` 必须分别为 `off` / 对应编号；
5. 启动日志在非 `off` 时必须出现“靶场漏洞模式已启用”告警；
6. `main` 上执行 `git grep -n "VULN_MODE" -- backend frontend`、`git grep -n "dangerouslySetInnerHTML" -- frontend` 均无命中。

## 3. 实现有效性检查结果

> 完整检查共 30 项，全部按预期通过；下表“有效性”是人工对漏洞是否达到设计目标的判断，不等同于检查脚本通过。

| 漏洞 | 检查数 | 结果 | 有效性判断 | 说明 |
| --- | ---: | --- | --- | --- |
| VULN-01 | 8 | 全部符合预期 | **部分有效** | `off` 下非法输入返回 401；`VULN-01` 下构造非法查询可触发 500（注入点存在），布尔改写用户名可登录为 admin；但**必须同时知道 admin 口令**，仅注入不能绕过密码校验。与 docs/08 “绕过登录”的目标不完全一致。 |
| VULN-02 | 6 | 全部符合预期 | **有效** | `off` 下描述被 HTML 转义，详情页不执行；`VULN-02` 下描述原样存储，详情页通过 `dangerouslySetInnerHTML` 渲染，`onerror` 在 Edge headless 中执行。 |
| VULN-03 | 4 | 全部符合预期 | **有效** | `off` 下学生修改 admin 条目返回 403；`VULN-03` 下同一请求返回 200，条目 owner 仍为 admin。 |
| VULN-04 | 8 | 全部符合预期 | **部分有效** | `off` 下 `text/html` 上传返回 415；`VULN-04` 下返回 201、按原名 `evil.html` 落盘；但受控读取仍被 MIME 白名单拦截（500），上传目录不在 Web 根，**未能执行**；同名上传会覆盖首份文件（内存驱动）。 |
| VULN-05 | 4 | 全部符合预期 | **有效** | `off` 下第 11 次失败登录返回 429；`VULN-05` 下连续 15 次失败均为 401。 |

### 3.1 环境与方法

| 项 | 内容 |
| --- | --- |
| 操作系统 | Windows 11 |
| Node.js | v24.18.0 |
| 浏览器 | Edge 158 headless（CDP） |
| 数据库 | MySQL 8.4.4（独立容器，`127.0.0.1:33306`）；VULN-01 强制使用；其余漏洞使用内存驱动 |
| VULN-01 | 先执行分支自己的 `db:migrate` + `db:seed`，确认 `roles=2 users=2 business_items=11`；再以 `off` / `VULN-01` 分别启动 |
| VULN-02 | 后端 + Vite 5173 + Edge headless；用测试账号写入描述，浏览器打开详情页观察 `window.__xss` |
| VULN-03/04/05 | 内存驱动；每个模式重启后端，避免状态串扰 |
| 数据 | 仅课程演示数据；未使用真实个人信息；测试账号密码由本地环境变量注入，不写入仓库 |
| B-09 云上复验 | 2026-11-26 在 Ubuntu 24.04.2 云服务器（2 vCPU / 894MiB + 2GiB swap，Docker 29.1.3）上逐项执行；VULN-02 浏览器验证经 SSH 隧道在本机 Edge 158 headless 完成；验证后已删除漏洞容器 |

### 3.2 与设计文档的差异

1. **VULN-01**：docs/08 的目标包含“绕过登录”。实际实现中 SQL 注入只改写了用户查询，登录流程仍执行 bcrypt 密码校验；只有使用已知 admin 口令 + 布尔改写才能登录为 admin。若要达到“无口令绕过”，需要进一步修改，但会影响漏洞设计的可控性，建议在 B-09/B-11 中重新界定影响。
2. **VULN-04**：docs/08 的目标包含“上传可执行内容/可访问”。实际实现只绕过了上传侧校验；读取侧 `readUploadForUser` 仍校验 MIME 白名单，且上传目录不在 Web 根，未形成执行链。同名上传覆盖文件是额外发现，建议在文档中登记为“可用性/覆盖”影响。
3. **VULN-02**：详情页底部仍显示“未植入任何漏洞”的旧文案；在 `VULN-02` 实例上会误导使用者。该文案属于前端静态文案，B-09 前应改为按 `vulnMode` 提示或移除。
4. **VULN-05**：健康检查返回 `vulnMode`，但页面/响应没有其他告警；启动日志有告警，符合 docs/08 要求。

## 4. 证据与限制

- B-10 本地检查与 B-09 云服务器 loopback 结果一致：VULN-02/03/05 有效，VULN-01/04 部分有效；完整原始记录见仓库外本地 `B10-vuln-verification-report.md` 与 `B09-server-verification-report.md`（**未提交**）。
- 云服务器仅保留主站；漏洞容器/网络验证后已删除。B-09 未做公网漏洞暴露。
- 未执行批量利用、拒绝服务、持久化后门或任何非本项目目标测试。
- 未验证 Chrome/Firefox/Safari；VULN-02 仅在 Edge 158 headless 下验证。
- 未对 VULN-04 的 MySQL 唯一约束行为单独复测；内存驱动下同名覆盖已复现。

## 5. 复跑提示

```bash
# 1) 拉取分支（不应合入 main）
git fetch origin 'refs/heads/vuln/*:refs/remotes/origin/vuln/*'
git worktree add --detach .tmp-vuln/VULN-01 origin/vuln/VULN-01
# ... 其余分支同理

# 2) VULN-01 需要 MySQL 8.4；先迁移/种子
cd .tmp-vuln/VULN-01/backend
NODE_ENV=test DB_DRIVER=mysql DB_HOST=127.0.0.1 DB_PORT=3306 \
DB_NAME=course_sec_lab DB_USER=lab_user DB_PASSWORD='<本地测试密码>' \
node scripts/migrate.mjs && node scripts/seed.mjs

# 3) 启动时显式设置 VULN_MODE；默认 off 时健康检查应为 off
VULN_MODE=off PORT=3101 JWT_SECRET='<32+ 位随机值>' node src/server.js
curl -sS http://127.0.0.1:3101/api/v1/health
```

> 复跑时必须使用独立端口/数据库/上传目录；结束后关闭开关、停止进程、清理测试上传文件。禁止在 `main` 或演示实例上开启 `VULN_MODE`。
