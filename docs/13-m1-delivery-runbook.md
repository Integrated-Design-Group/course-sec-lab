# 13 · M1 本地测试与 PR 交付流程

> **适用对象**：提交 M1 业务阶段改动的成员、评审人、验收人
> **前置条件**：已按 [12 本地部署](./12-local-setup.md) 完成环境准备；已阅读 [06 协作规范](./06-conventions.md) 与 [11 GitHub 协作](./11-github-collaboration.md)
> **预计耗时**：测试 20～35 分钟（不含 Docker 首次拉镜像）；PR 提交 10 分钟
> **验证方式**：本文第 2 节全部命令通过 + 第 3 节 PR 被合并

> **重要**：本文只提供**命令与步骤**，不会自动执行任何 `git` 命令。所有 `git add / commit / push / merge` 必须由操作人手动执行并自行确认。
> 文中不包含真实密码、token、公网地址；`.env` 相关内容一律以占位符表示。

---

## 1. 交付前准备

### 1.1 确认工具链

在仓库根目录执行（Windows 可用 Git Bash 或 PowerShell）：

```bash
git --version
node --version     # 需要 >= 22
npm --version
```

预期：`git version 2.4x`、`v22.x` 或更高、`npm 10.x/11.x`。

> Windows PowerShell 若提示“禁止运行脚本”，把 `npm` 换成 `npm.cmd`；不要修改系统执行策略来绕过。

### 1.2 安装依赖（仅首次或依赖变化时）

```bash
npm --prefix backend install
npm --prefix frontend install
```

根目录的 `npm install` 只安装自检脚本用的 `js-yaml`，首次执行 `npm run check` 前也需要。

### 1.3 准备本地 `.env`

```bash
node scripts/init-env.mjs        # 已存在则跳过；--force 会覆盖，先备份自定义值
node scripts/check-env.mjs       # 期望 0 FAIL（memory 模式会出现 1 个 WARN）
```

- 默认 `DB_DRIVER=memory`，无需 MySQL 即可跑测试与演示。
- 本文所有命令都不需要、也不允许写入真实云凭证。

### 1.4 创建本次工作分支（手动执行）

```bash
git switch main
git pull --rebase origin main
git switch -c feat/m1-business-crud
```

> 分支命名按 [11](./11-github-collaboration.md) 第 4 节；若本次包含漏洞设计文档，可拆为 `docs/b01-vuln-design`。

---

## 2. 本地测试流程（按顺序执行）

### 2.1 静态自检

```bash
npm run check
```

预期：

```text
框架自检完成：通过 26 · 警告 0 · 失败 0
结论：框架静态检查通过。
```

检查内容：目录/文件完整性、JSON/YAML、Compose 拓扑（db 无端口、internal 网络）、`.env.example` 占位符、`.gitignore`、密钥扫描、迁移表、种子、文档头部三要素、验收表、后端红线（eval/child_process）。

### 2.2 后端测试

```bash
npm --prefix backend test
```

预期：**44 项通过、0 失败**，覆盖：

| 测试文件 | 项数 | 覆盖点 |
| --- | :---: | --- |
| `tests/health.test.mjs` | 4 | 健康检查、requestId、404、API 索引 |
| `tests/auth.test.mjs` | 6 | 登录/退出/令牌失效/校验 |
| `tests/business.test.mjs` | 10 | 列表分页、过滤、我的条目、详情、非法 id |
| `tests/business-write.test.mjs` | 9 | 创建/校验/归属/乐观锁/状态机/软删除 |
| `tests/upload.test.mjs` | 7 | 上传校验、受控读取、封面引用 |
| `tests/admin.test.mjs` | 8 | 管理端 403/401、用户启停、审计检索 |

> 测试脚本为 `node --test "tests/*.test.mjs"`（Node 22.6+ 支持 glob，每个测试文件独立进程）。若在本机执行时报 `Cannot find module .../tests`，说明 Node 版本过低或仍在用旧脚本，先执行 `npm --prefix backend install` 并确认 package.json 已是 glob 写法。

### 2.3 前端生产构建

```bash
npm --prefix frontend run build
```

预期：

```text
✓ 57 modules transformed.
dist/assets/index-*.css
dist/assets/index-*.js
✓ built in <1s
```

构建产物在 `frontend/dist/`（已被 `.gitignore` 忽略，**不要提交**）。

### 2.4 数据库模式复核（可选，但建议合并前做一次）

需要 Docker（或本机 MySQL 8.4）：

```bash
# 1) 改 .env：DB_DRIVER=mysql，并填写本地 DB_PASSWORD / DB_ROOT_PASSWORD
# 2) 只起数据库（绑定 127.0.0.1）
docker compose -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml --env-file .env up -d db
bash deploy/scripts/wait-for-db.sh

# 3) 重置 → 迁移 → 种子
npm --prefix backend run db:reset
npm --prefix backend run db:migrate
npm --prefix backend run db:seed
```

预期关键输出：

```text
✔ 已应用：001_init_schema
✔ 已应用：002_m1_business_indexes
完成：roles=2 users=2 business_items=11
```

> 2026-11-26 已用独立 MySQL 8.4.4 容器复验 `001+002` 迁移与种子；项目 Compose 内的 MySQL 组合仍未在本次复跑。

再验证表结构与索引：

```bash
docker exec -it csl-db mysql -u lab_user -p -e \
  "USE course_sec_lab; SHOW TABLES; SHOW INDEX FROM business_items; SELECT COUNT(*) FROM business_items;"
```

预期：6 张表；`business_items` 含 `idx_business_items_owner_status_created`；条目 11 条。

完成后切回内存模式（或保留 MySQL 用于浏览器验收）：

```bash
# .env: DB_DRIVER=memory
node scripts/check-env.mjs
```

> **未验证提示**：若本次环境没有 Docker/MySQL，第 2.4 节必须标注“未验证及原因”，不得在 PR 中写“迁移已通过”。

### 2.5 启动服务并跑跨栈测试

终端 A：

```bash
npm --prefix backend run dev
```

终端 B：

```bash
npm --prefix frontend run dev
```

终端 C（仓库根目录）：

```bash
npm run smoke       # 期望 6 项通过
npm run contract    # 期望 11 项通过
```

预期：

```text
# smoke
tests 6 / pass 6 / fail 0
# contract
tests 11 / pass 11 / fail 0
```

> 冒烟与契约测试要求后端已启动；默认地址 `http://127.0.0.1:3000/api/v1`，可用 `API_BASE_URL` 覆盖。

### 2.6 浏览器手测清单

打开 <http://127.0.0.1:5173>，按顺序勾选：

- [ ] 未登录访问 `/`、`/business`、`/admin` → 跳转 `/login`
- [ ] `student / Demo@123456` 登录 → 概览显示“学生”
- [ ] 教材列表显示 11 条（每页 10 条），翻页/状态筛选/关键词搜索正常
- [ ] 勾选“只看我的” → 只出现 student 的 7 条
- [ ] 新建条目 → 初始状态“草稿”，自动进入详情
- [ ] 详情页编辑标题 → 保存成功，`updatedAt` 变化
- [ ] 上传真实 PNG 封面 → 详情页显示图片；移除封面 → 图片消失
- [ ] 用 `admin` 登录 → 看到另一条（admin 发布的）条目无“编辑/删除”按钮
- [ ] `admin` 管理后台：用户启停、条目状态切换、审计日志检索
- [ ] 学生访问 `/admin` → 403 卡片
- [ ] 退出登录 → 回登录页；浏览器后退访问受限页再次跳转
- [ ] 浏览器控制台无报错

### 2.7 记录测试结果

在 PR 中粘贴“命令 + 关键输出”，不要只写“测试通过”。建议表格：

| 检查 | 命令 | 结果 | 备注 |
| --- | --- | --- | --- |
| 静态自检 | `npm run check` | 26 通过 | |
| 后端测试 | `npm --prefix backend test` | 44 通过 | |
| 前端构建 | `npm --prefix frontend run build` | 57 模块 | |
| 数据库迁移 | `db:reset → db:migrate → db:seed` | 11 条 | 未执行/已执行 |
| 冒烟 | `npm run smoke` | 6 通过 | |
| 契约 | `npm run contract` | 11 通过 | |
| 浏览器手测 | 第 2.6 节 | 全部通过 | 附脱敏截图 |

---

## 3. GitHub PR 提交流程（全部手动执行）

### 3.1 提交前确认

```bash
git status
```

确认：

- 当前分支是 `feat/...` 或 `docs/...`，**不是 `main`**；
- 没有 `.env`、`node_modules`、`dist`、`backend/logs`、`backend/uploads`、`artifacts/`；
- 没有真实密码、token、公网 IP（截图/文档里也要检查）。

### 3.2 审阅改动

```bash
git diff --stat
git diff
```

重点看：

- 迁移文件是否为**新增** `002_...`，而不是修改 `001_...`；
- `docs/03-api.md` 与实现字段/错误码是否一致；
- 新增接口是否有测试；
- 是否夹带无关格式化/重构。

### 3.3 暂存（按路径精确添加）

```bash
# 后端
git add backend/src backend/tests backend/scripts
# 数据库（只新增）
git add db/migrations/002_m1_business_indexes.sql db/seeds/002_seed_m1_demo.sql
# 前端
git add frontend/src frontend/package.json frontend/package-lock.json
# 跨栈测试
git add tests/
# 文档
git add README.md TODO.md docs/00-overview.md docs/01-architecture.md docs/02-database.md \
  docs/03-api.md docs/05-environment.md docs/08-vuln-design.md docs/09-verify-template.md \
  docs/11-github-collaboration.md docs/12-local-setup.md docs/13-m1-delivery-runbook.md
```

再次确认：

```bash
git status
```

> 不要使用 `git add -A` 盲加；`git add -f` 一律禁止。

### 3.4 提交（建议拆成多个逻辑提交）

```bash
git commit -m "feat(business): implement item crud with ownership and status rules"
git commit -m "feat(upload): add authenticated cover read and orphan cleanup"
git commit -m "feat(admin): add user status and audit log endpoints"
git commit -m "feat(web): add item form, cover preview and admin console"
git commit -m "test(m1): cover crud permissions uploads and admin flows"
git commit -m "docs(m1): sync api database todo and add delivery runbook"
```

要求（见 [06](./06-conventions.md) 第 2 节）：

- 标题英文、动词开头、小写、不加句号；
- 一次提交只做一件事；正文可中文说明动机；
- 关联 Issue 可加 `Refs #12`。

### 3.5 推送前同步 main

```bash
git pull --rebase origin main
```

若出现冲突：按 [11](./11-github-collaboration.md) 第 11 节逐个文件解决，**不要**删除对方改动；解决后 `git add <文件>` → `git rebase --continue`。

### 3.6 推送分支

```bash
git push -u origin feat/m1-business-crud
```

预期：`* [new branch] feat/m1-business-crud -> feat/m1-business-crud`。

### 3.7 创建 PR

1. 打开仓库 → “Compare & pull request”；
2. `base: main`，`compare: feat/m1-business-crud`；
3. 标题：`feat(m1): business crud, cover read and admin console`；
4. 按 [PR 模板](../.github/pull_request_template.md) 填写：

| 模板项 | 本次填写要点 |
| --- | --- |
| 变更目的 | 完成 M1：A-01～A-07、A-09、A-10、B-01 |
| 关联 Issue | `Closes #<你的 Issue>` |
| 变更类型 | `feat` + `test` + `docs` |
| 测试步骤与结果 | 粘贴第 2.7 节表格（命令 + 通过数） |
| 截图 | 列表/表单/详情封面/管理后台，**脱敏** |
| 安全与隔离影响 | 新增归属校验、受控文件读取；未引入漏洞；无密钥 |
| 文档更新 | docs/00/01/02/03/05/08/09/11/12/13 + README + TODO |
| TODO 勾选 | A-01～A-07、A-09、A-10、B-01，附证据 |
| 风险与回滚 | 新增迁移 002 可回滚（DROP INDEX）；无破坏性接口变更 |

5. 指定至少 1 名非作者评审人（涉及权限/上传建议 2 人）；
6. 创建 PR。

### 3.8 评审与修改

- 按评论在同一分支继续 commit + push，PR 自动更新；
- 每条意见回复“已改/不改+理由”；
- 评审人重点检查：归属校验是否在后端、文件读取是否越界、迁移是否只增不改、文档是否同步。

### 3.9 合并与清理

1. 评审通过后使用 **Squash merge**；
2. 合并后删除远端分支；
3. 本地清理：

```bash
git switch main
git pull --rebase origin main
git branch -d feat/m1-business-crud   # 未合并提示时确认后再用 -D
```

### 3.10 合并后动作

- 确认 TODO.md 勾选与证据已在同一 PR 合并；
- 如发现遗漏，另开 `docs/` 小 PR 补正，不直接改 `main`；
- 更新本地 `.env` 与数据库（`db:migrate` 应用 002）后重新自测一次。

---

## 4. 本次 M1 变更的提交建议

### 4.1 建议提交拆分（7 个）

| # | 提交信息 | 主要文件 |
| --- | --- | --- |
| 1 | `feat(db): add m1 indexes and demo seed` | `db/migrations/002_*`、`db/seeds/002_*` |
| 2 | `feat(business): implement crud, ownership and status machine` | `backend/src/{models,repositories,services,controllers,routes}` |
| 3 | `feat(upload): add authenticated read and orphan cleanup` | `upload.service.js`、`upload.controller.js`、路由 |
| 4 | `feat(admin): add user status and audit log apis` | `admin.*`、`user.model.js`、`audit-log.model.js` |
| 5 | `feat(web): add forms, cover preview and admin console` | `frontend/src/**` |
| 6 | `test(m1): cover flows, permissions, uploads and admin` | `backend/tests`、`tests/**` |
| 7 | `docs(m1): sync docs and add delivery runbook` | `docs/**`、README、TODO |

> 若单 PR 改动超过 400 行有效代码，按上表拆成 2 个 PR（后端 / 前端+文档），避免评审过载。

### 4.2 PR 描述要点（可直接复制）

```markdown
## 变更目的
完成课程 M1 业务阶段：条目 CRUD（归属/状态机/乐观锁/审计）、封面受控读取、管理端用户与审计、B-01 漏洞设计冻结。

## 关联 Issue
Closes #<issue>

## 变更类型
- [x] feat
- [x] test
- [x] docs

## 测试步骤与结果
- `npm run check`：26 通过
- `npm --prefix backend test`：44 通过
- `npm --prefix frontend run build`：57 模块
- `npm run smoke`：6 通过
- `npm run contract`：11 通过
- MySQL 迁移/种子：已执行/未执行（原因：…）

## 安全与隔离影响
- 写接口强制“本人或管理员”；管理端接口 requireRole('admin')
- 上传读取为受控鉴权，不暴露公开 URL；路径限定在 UPLOAD_DIR
- 未引入 VULN-01～05；未提交密钥/真实地址

## 文档更新
docs/00、01、02、03、05、08、09、11、12、13；README；TODO

## 风险与回滚
- 新增迁移 002：回滚 `ALTER TABLE ... DROP INDEX ...`（见文件头注释）
- 无破坏性 API 变更；旧客户端不受影响
```

---

## 5. 禁止事项

| 禁止 | 原因 |
| --- | --- |
| 直接 push `main` / 在 `main` 上提交 | 保护分支规则；破坏主线 |
| 提交 `.env`、`token`、真实密码、公网 IP、截图中的账号 | 泄露风险 |
| 修改已应用的迁移 `001_*` | 破坏他人环境 |
| 用 `git add -f` 添加被忽略文件 | 破坏忽略规则 |
| 在 PR 中夹带无关重构/格式化 | 评审困难、回滚风险 |
| 未经授权对非本项目目标测试 | 违反 [07 隔离规范](./07-security-isolation.md) |

---

## 6. 快速对照表

| 检查 | 期望 |
| --- | --- |
| `npm run check` | 26 通过 / 0 警告 / 0 失败 |
| `npm --prefix backend test` | 44 通过 |
| `npm --prefix frontend run build` | 57 模块，构建成功 |
| `npm run smoke` | 6 通过 |
| `npm run contract` | 11 通过 |
| 种子条目数 | 11（student 7 / admin 4） |
| 迁移文件 | `001_init_schema.sql`、`002_m1_business_indexes.sql` |
| 种子文件 | `001_seed_base.sql`、`002_seed_m1_demo.sql` |
| 新增接口 | 条目写 3 个、文件读取 1 个、管理端 3 个 |
