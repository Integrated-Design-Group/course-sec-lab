# 06 · 协作规范

> **适用对象**：全体小组成员
> **前置条件**：已加入仓库、完成环境搭建（见 [05-environment.md](./05-environment.md)）
> **预计耗时**：阅读 12 分钟；首次按规范提交约 20 分钟

## 1. 分支模型

| 分支 | 用途 | 合并方向 | 保护 |
| --- | --- | --- | --- |
| `main` | 可运行、可验收的主线 | - | 禁止直接 push，必须 PR |
| `feat/<issue>-<slug>` | 新功能 | → `main` | 至少 1 人 Review |
| `fix/<issue>-<slug>` | 缺陷修复 | → `main` | 至少 1 人 Review |
| `docs/<slug>` | 纯文档 | → `main` | 可简化 Review |
| `chore/<slug>` | 构建、依赖、脚本 | → `main` | 至少 1 人 Review |
| `vuln/<VULN-编号>` | 漏洞研究与实现（后续阶段） | 独立靶场分支，**禁止合入 main** | 课程负责人审批 |

示例：

```bash
git switch -c feat/12-business-item-create
git switch -c fix/18-login-rate-limit
```

## 2. 提交规范

采用 Conventional Commits：**标题使用英文**（动词开头、小写、不加句号），类型保留英文；正文可用中文说明动机与影响。完整命令与示例见 [11-github-collaboration.md](./11-github-collaboration.md) 第 7 节。

```text
<type>(<scope>): <english subject>

<可选正文：为什么改、影响范围>
<可选：Refs #12 / Closes #12>
```

| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `docs` | 文档 |
| `refactor` | 重构（不改变行为） |
| `test` | 测试 |
| `chore` | 构建/依赖/脚本 |
| `perf` | 性能 |
| `style` | 格式（不影响逻辑） |

示例：

```text
feat(auth): add login rate limit
fix(api): correct pagination hasNext
docs(db): document business_items indexes
chore(deps): pin vite to 5.4.11
```

> 仓库早期提交使用了中文标题，属历史记录，不强制改写；新提交按本节执行。

要求：

- 一次提交只做一件事；不要把格式化与逻辑修改混在一起。
- 提交前确保 `npm --prefix backend test` 通过（或说明未运行原因）。
- **绝不提交** `.env`、真实密钥、`node_modules`、`dist`、日志、上传文件。

## 3. PR 规范

PR 标题与提交标题同格式。描述模板：

```markdown
## 变更内容
- 

## 关联 Issue
Closes #12

## 验证方式
- [ ] 后端测试通过
- [ ] 前端构建通过
- [ ] 冒烟测试通过（附命令/输出）
- [ ] 未涉及真实密钥

## 风险与回滚
- 
```

Review 清单（Reviewer 必查）：

- [ ] 是否改动 API 契约？是否先更新 `docs/03-api.md`？
- [ ] 是否新增数据库变更？是否新增迁移文件而非修改旧文件？
- [ ] 是否有硬编码密钥、IP、密码？
- [ ] 错误处理是否走 `AppError` + 统一响应？
- [ ] 是否补充了测试或说明了无法测试的原因？
- [ ] 文档开头是否包含“适用对象 / 前置条件 / 预计耗时”？

## 4. 目录职责

| 目录 | 职责 | 禁止 |
| --- | --- | --- |
| `backend/src/routes` | 路由装配 | 业务逻辑、SQL |
| `backend/src/controllers` | 入参→服务→响应 | 直接连数据库 |
| `backend/src/services` | 业务规则、鉴权、审计 | 处理 `req/res` |
| `backend/src/repositories` | 数据访问（参数化 SQL） | HTTP 语义 |
| `backend/src/models` | 常量、schema、序列化 | 访问数据库 |
| `backend/src/middlewares` | 横切关注点 | 业务规则 |
| `frontend/src/api` | 接口封装 | 直接 `fetch` 散落在页面 |
| `frontend/src/pages` | 页面编排 | 复杂数据转换 |
| `docs/` | 设计与规范 | 真实密钥/公网地址（除占位符） |
| `db/migrations` | 只增不改的迁移 | 修改已应用文件 |

## 5. 代码规范

### 5.1 通用

- ESM（`import`/`export`），Node 22+；不使用 CommonJS。
- 2 空格缩进、单引号、语句结尾分号、文件末尾换行。
- 变量/函数 camelCase；常量 UPPER_SNAKE；文件名 kebab-case 或 `*.repository.js`。
- 禁止 `console.log` 调试残留（用 `logger`；脚本可用 `console`）。
- 异步一律 `async/await`；Express 控制器必须经 `asyncHandler` 包装。

### 5.2 后端

- 所有可预期错误抛 `AppError(code, message, details)`，由 `errorHandler` 统一输出。
- 所有入参走 `validateObject` / `validateBody` / `validateQuery`，**不直接信任 `req.body`**。
- SQL 必须参数化；`LIMIT/OFFSET` 只允许使用已校验的整数。
- 日志禁止记录密码、token、密钥；审计 `detail` 同样禁止。
- 新增环境变量必须同时更新：`config/index.js`、`.env.example`、`docs/05-environment.md`。

### 5.3 前端

- 所有请求走 `src/api/client.js`（统一信封、401 处理）。
- 页面必须处理 loading / error / empty 三态。
- 路由守卫只做体验优化，权限判定以后端为准。
- 不引入 UI 框架与重型依赖，样式集中在 `src/styles/global.css`。

### 5.4 数据库

- 迁移文件命名 `NNN_描述.sql`，只增不改。
- 新表必须有：主键、`created_at`、必要的索引、中文注释。
- 时间字段统一 `DATETIME(3)` UTC。
- 涉及接口的字段变化必须同步更新 `docs/02-database.md` 与 `docs/03-api.md`。

## 6. 安全规范（强制）

1. 真实密钥/密码/云凭证**只允许**存在于本地 `.env`（已被 `.gitignore` 忽略）。
2. 截图、录屏、文档中不得出现真实密码、完整 token、云控制台密钥。
3. 演示账号 `Demo@123456` 仅限课程环境；公网部署前必须改密或停用。
4. 禁止在框架阶段实现任何漏洞；漏洞实现必须走 `vuln/*` 分支与独立靶场。
5. 发现密钥误提交：立即在群内上报、轮换密钥、清理历史（必要时重建仓库），不要只删文件了事。
6. 依赖新增需说明用途并锁定版本。

## 7. 文档规范

- 每篇 `docs/*.md` 开头必须有：**适用对象 / 前置条件 / 预计耗时**（引用块形式）。
- 命令、代码、路径保持英文原文；解释用中文。
- 文档内引用其他文档使用相对链接。
- 文档中的公网 IP、域名、账号一律用占位符（如 `{{PUBLIC_IP}}`）。
- “未验证”必须明确写“未验证及原因”，禁止写入未经执行的验证结论。

## 8. Issue 拆分建议

每个 Issue 应包含：背景、验收标准（可勾选）、涉及目录、是否需要文档更新、风险。

推荐粒度：

| 类型 | 示例 | 预估 |
| --- | --- | --- |
| 业务功能 | “实现 POST /business-items + 归属校验 + 审计” | 1～2 天 |
| 前端页面 | “条目新建/编辑表单与错误提示” | 1 天 |
| 测试 | “补充业务写接口的权限与校验测试” | 0.5 天 |
| 文档 | “补充 M1 业务规则到 02/03 文档” | 0.5 天 |
| 部署 | “独立云主机部署 + HTTPS + 访问登记” | 1 天 |
| 漏洞 | 每个 VULN 一个 Issue（独立分支/环境） | 0.5～1 天 |

## 9. 评审与合并

1. 作者自测 → 发起 PR → 至少 1 名成员 Review。
2. CI/本地检查：后端测试、前端构建、`npm run check`。
3. 合并使用 **Squash merge**，保持 `main` 历史线性。
4. 合并后删除功能分支；更新相关文档与验收清单状态。
