# 15 · 漏洞测试账号与前置业务数据清单

> **适用对象**：漏洞验证执行人、测试支持、指导教师
> **前置条件**：已完成种子初始化；MySQL 8.4 可用；已获取课程平台发放的测试密码
> **预计耗时**：账号准备 10 分钟；每个漏洞前置数据 5～10 分钟
> **验证方式**：按第 2 节创建账号并登录；按第 3 节准备数据；按第 4 节清理

## 1. 账号口径

本项目统一使用以下三个角色代号，**不再使用 `userB`/`stuA`/`stuB` 混写**：

| 账号 | 角色 | 用途 | 来源 |
| --- | --- | --- | --- |
| `admin` | 管理员 | 管理端、越权对比、上传管理 | `db/seeds/001_seed_base.sql` |
| `student` | 学生 A（可称 `stuA`） | 普通业务、创建自有条目、水平越权 A 侧 | `db/seeds/001_seed_base.sql` |
| `stuB` | 学生 B（可称 `stuB`） | 水平越权 B 侧、双账号对比 | 由 `backend/scripts/create-test-account.mjs` 创建 |

> `stuB` **不在默认种子里**，避免把可登录测试账号和密码固化进仓库。默认种子仍只有 `admin`/`student`（`users=2`）。

## 2. 创建 / 启用测试账号

脚本：`backend/scripts/create-test-account.mjs`（npm：`npm --prefix backend run db:test-account`）。

```bash
# 1) 准备 MySQL 连接（与项目 .env 一致；不要提交密码）
# 2) 从课程平台获取一次性强密码，填入环境变量（不要写入仓库/聊天记录）
export TEST_ACCOUNT_USERNAME='stuB'
export TEST_ACCOUNT_ROLE='student'
export TEST_ACCOUNT_PASSWORD='<课程平台发放的 12+ 位强密码>'
npm --prefix backend run db:test-account

# 3) 验证登录（示例，不打印密码）
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"stuB","password":"<同上密码>"}'

# 4) 测试结束后停用
TEST_ACCOUNT_USERNAME='stuB' npm --prefix backend run db:test-account -- --disable
```

脚本约束：

- 密码只从 `TEST_ACCOUNT_PASSWORD` 读取，使用 bcrypt 哈希写入 `users.password_hash`，**不写入仓库、不打印、不写日志**；
- 密码至少 12 位、至少 3 类字符、字符种类 ≥ 8，且不能使用演示密码 `Demo@123456`；
- 默认拒绝在 `NODE_ENV=production` 下执行，确需执行必须加 `--force`；
- 已存在账号会被更新并重新启用；`--disable` 只停用，不删除；
- 一人一号：有多名测试人员时，分别用不同的 `TEST_ACCOUNT_USERNAME` 创建，不要共用 `admin`。

## 3. 前置业务数据

| 漏洞 | 前置数据 | 准备方式 |
| --- | --- | --- |
| VULN-01 登录 SQL 注入 | 至少 2 个可登录账号（admin/student） | 默认种子即可 |
| VULN-02 存储型 XSS | 学生可创建的条目，描述可写 | `student` 登录后通过 `POST /business-items` 或页面新建 |
| VULN-03 水平越权 | A 侧条目属于 `student`；B 侧账号 `stuB` 可登录 | 默认种子中 id 4/6/7/9 属于 student；`stuB` 用脚本创建 |
| VULN-04 不安全上传 | 可上传的测试文件（仅在本地测试目录） | 准备本地 `evil.html`（内容为测试标记），不要提交 |
| VULN-05 登录限流失效 | 可用的普通账号 | 默认种子 `student` 即可 |

数据字典：

- 角色：`roles.code` ∈ `admin`/`student`；`users.role_id` 关联 `roles.id`。
- 账号：`users.username` 唯一；`status` ∈ `active`/`disabled`；`password_hash` 只存 bcrypt。
- 条目：`business_items.owner_id` 指向 `users.id`；`status` ∈ `draft`/`published`/`reserved`/`sold`/`archived`；`deleted_at` 为软删除。
- 上传：`uploaded_files.owner_id` 指向 `users.id`；`status` ∈ `active`/`archived`。
- 审计：`audit_logs.actor_id`、`action`、`result`、`detail`；禁止写入密码/token。

## 4. 使用与清理

1. 执行对应漏洞测试前，把靶场实例的 `VULN_MODE` 设为对应编号；**同一实例同一时刻只开一个**。
2. 只使用本清单中的课程测试账号；密码通过课程平台/加密渠道领取。
3. 测试结束后：
   - 将 `VULN_MODE` 改回 `off`；
   - 停用 `stuB`（`--disable`）；
   - 清理上传目录中的测试文件；
   - 需要时执行 `bash scripts/seed.sh` 重置演示数据（会清空并重播种）。
4. 验证证据脱敏：不记录密码、完整 token、真实 IP/个人信息。

## 5. 本地验证记录

2026-11-26（Harness，MySQL 8.4.4 独立容器）：

- `create-test-account.mjs` 创建 `stuB`（id=3，student，active）；
- `POST /api/v1/auth/login` 返回 200，`data.user.username=stuB`、`role=student`、`status=active`；
- `--disable` 后账号状态为 `disabled`；
- 密码由本地环境变量注入，未写入仓库或日志。

> 该记录只证明脚本链路可用；B-09 仍需在授权靶场按 `VERIFY-*` 逐项复现并归档证据。
