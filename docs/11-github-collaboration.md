# 11 · GitHub 协作规范（新手版）

> **适用对象**：第一次参与多人 Git 协作的组员、需要带新人的组长
> **前置条件**：已加入课程 GitHub 仓库；本机已安装 Git（安装步骤见第 3 节）；已阅读 [06 协作规范](./06-conventions.md)
> **预计耗时**：通读 35 分钟；按第 3 节完成一次性准备约 15 分钟
> **验证方式**：能独立完成“拉取 → 建分支 → 提交 → push → 开 PR”全流程；`git status` 工作区干净；PR 模板填写完整并通过评审

> 本文假设你**几乎没有多人协作经验**。每条命令都说明“做什么、为什么、预期看到什么”。
> 遇到没见过的词，先查第 2 节术语表。
> M1 交付的**逐条可执行清单**（本地测试 → PR 提交 → 合并清理）见 [13 交付流程](./13-m1-delivery-runbook.md)；本文保留原理与日常协作说明。

## 1. 先理解三件事

1. **Git 是本地版本库，GitHub 是远端仓库。** 你在本地 commit，只有 push 之后别人才能看到。
2. **`main` 是共享主线，受保护。** 任何人都不直接改 `main`，而是“建分支 → 改 → PR → 评审 → 合并”。
3. **一次 PR 只做一件事。** 小 PR 更容易评审、更少冲突、出问题更好回滚。

## 2. 术语解释

| 术语 | 通俗解释 | 在本项目中的具体含义 |
| --- | --- | --- |
| 仓库（Repository） | 一个被 Git 管理的项目文件夹，含全部历史 | 课程仓库 `course-sec-lab` |
| 远端（Remote） | 托管在 GitHub 上的仓库副本，通常叫 `origin` | `origin` 指向课程仓库 |
| 分支（Branch） | 从某个提交分出来的独立开发线 | `main`、`feat/…`、`fix/…`、`docs/…`、`vuln/…` |
| 提交（Commit） | 一次有说明的本地快照 | `feat(auth): add login skeleton` |
| 暂存区（Staging） | 准备进入下一次提交的改动集合 | `git add` 把改动放进暂存区 |
| push | 把本地提交上传到 GitHub | `git push -u origin <分支>` |
| pull | 把 GitHub 的更新下载并合并到本地 | `git pull --rebase origin main` |
| PR（Pull Request） | “请把我的分支合并进 main”的正式请求，带讨论与评审 | 每个任务一个 PR |
| merge | 合并分支，产生合并提交（或快进） | 本项目用 Squash merge 合并 PR |
| rebase | 把你的提交“搬到”最新主线之上，历史更线性 | 同步 main、解决冲突时使用 |
| 冲突（Conflict） | 同一文件的同一位置被两边修改，Git 无法自动决定 | 手动编辑冲突文件后继续 |
| CI | 持续集成，自动跑测试/构建 | 本项目当前无 CI，靠本地测试 + `npm run check` |
| Issue | 任务/缺陷/讨论的工单 | 与 [TODO.md](../TODO.md) 条目一一对应 |
| 保护分支 | 禁止直接 push、强制要求 PR 与评审的分支 | `main` |
| Fork | 把别人仓库复制到自己账号下 | 本项目**不要求** Fork，直接在同一仓库建分支 |
| 上游（upstream） | 本地分支跟踪的远端分支 | `origin/main` |

## 3. 一次性准备

### 3.1 安装 Git

| 系统 | 安装方式 | 验证命令 | 预期结果 |
| --- | --- | --- | --- |
| Windows | 安装 [Git for Windows](https://git-scm.com/download/win)，建议同时装 Git Bash | `git --version` | `git version 2.x.x` |
| macOS | `xcode-select --install` 或 `brew install git` | `git --version` | 同上 |
| Linux (Debian/Ubuntu) | `sudo apt update && sudo apt install -y git` | `git --version` | 同上 |

### 3.2 配置用户名与邮箱

```bash
# 设置提交作者信息（会写进每个 commit，必须与 GitHub 账号邮箱一致或使用 noreply 邮箱）
git config --global user.name "你的姓名或代号"
git config --global user.email "你的邮箱@example.com"

# 查看配置是否生效
git config --global --list
```

预期：输出中包含 `user.name=…` 与 `user.email=…`。

> 邮箱写错会导致 GitHub 无法把你的提交关联到账号（头像不显示、贡献图不统计）。可在 GitHub → Settings → Emails 中查看到你的邮箱。

### 3.3 配置 SSH（推荐）或 HTTPS

**SSH 方式（推荐，一次配置长期使用）**

```bash
# 生成密钥（一路回车；已有密钥可跳过）
ssh-keygen -t ed25519 -C "你的邮箱@example.com"

# 查看公钥内容并复制
# Windows: type %USERPROFILE%\.ssh\id_ed25519.pub
# macOS/Linux: cat ~/.ssh/id_ed25519.pub
cat ~/.ssh/id_ed25519.pub
```

然后：GitHub → Settings → SSH and GPG keys → New SSH key → 粘贴公钥（**只粘贴 `.pub` 公钥，绝不要粘贴私钥**）。

```bash
# 测试连接；第一次会问是否信任主机，输入 yes
ssh -T git@github.com
```

预期：`Hi <你的用户名>! You've successfully authenticated, but GitHub does not provide shell access.`

**HTTPS 方式（不想配 SSH 时）**

```bash
# 克隆时使用 https 地址；推送时会要求凭据
# 密码处不能填账号密码，必须用 Personal Access Token（GitHub → Settings → Developer settings → Tokens）
```

Windows 安装 Git 后通常自带 Git Credential Manager，会弹窗引导登录；macOS 可用 Keychain；Linux 可配置 `git config --global credential.helper store`（注意：明文存储，公共电脑禁用）。

### 3.4 克隆仓库

```bash
# 克隆到本地（把 <repo-url> 换成课程仓库地址）
git clone <repo-url> course-sec-lab

# 进入目录
cd course-sec-lab

# 查看远端配置
git remote -v
```

预期：

```text
origin  git@github.com:<org>/<repo>.git (fetch)
origin  git@github.com:<org>/<repo>.git (push)
```

### 3.5 确认权限

```bash
# 确认能读取远端引用（只读权限即可通过）
git ls-remote origin | head -n 5
```

预期：列出 `HEAD`、`refs/heads/main` 等。

写权限（能否 push）无法用一条命令安全验证，建议：向组长确认已被加入仓库 Collaborator；或按第 5 节流程推一个**只含文档改动**的分支试一次，失败会明确提示 `403`/`Permission denied`。

### 3.6 Windows 特别设置

```bash
# 仓库已用 .gitattributes 统一 LF；关闭自动换行转换，避免 shell 脚本变 CRLF
git config --global core.autocrlf false

# 如果 npm 报“禁止运行脚本”，把 npm 换成 npm.cmd（PowerShell 执行策略限制）
npm.cmd --version
```

> 路径含空格或中文可能导致个别脚本异常。建议把仓库放在 `E:\course_sec_lab`、`~/work/course-sec-lab` 这类**无空格、纯英文**路径下。

## 4. 分支规范

| 分支 | 用途 | 示例 | 生命周期 |
| --- | --- | --- | --- |
| `main` | 可运行主线，**受保护** | - | 永久 |
| `feat/<issue>-<slug>` | 新功能 | `feat/12-business-item-create` | 合并后删除 |
| `fix/<issue>-<slug>` | 缺陷修复 | `fix/18-login-rate-limit` | 合并后删除 |
| `docs/<slug>` | 文档 | `docs/github-collaboration` | 合并后删除 |
| `chore/<slug>` | 构建/依赖/脚本 | `chore/upgrade-vite` | 合并后删除 |
| `vuln/<VULN-编号>` | 漏洞实现（**禁止合入 main**） | `vuln/VULN-01` | 测试结束后归档 |

规则：

- **禁止直接在 `main` 开发或 push**（保护分支会拒绝）。
- 分支名用小写英文 + 连字符；Issue 编号放在最前，便于追溯。
- 一个分支只做一件事；完成后及时合并并删除，避免长期分支堆积。

## 5. 每日开发流程

> 下面是最常用的“安全路径”。每一步都给出命令、作用、预期结果。

### 第 1 步：确认当前状态

```bash
git status
```

作用：看清当前分支、是否有未提交改动。
预期（干净时）：`On branch main` + `nothing to commit, working tree clean`。
**如果有未提交改动，先按第 6.2 节 commit 或 stash，不要直接切分支。**

### 第 2 步：切回并更新 main

```bash
git switch main
git pull --rebase origin main
```

作用：先让自己基于最新主线开发，减少后续冲突。
预期：`Already up to date.` 或列出更新的文件。

### 第 3 步：创建功能分支

```bash
git switch -c feat/12-business-item-create
```

作用：从当前 `main` 拉出独立分支。
预期：`Switched to a new branch 'feat/12-business-item-create'`。

### 第 4 步：开发与自测

按 Issue 完成代码/文档，本地执行：

```bash
# 后端测试（在 backend/ 下）
npm --prefix backend test

# 前端构建
npm --prefix frontend run build

# 框架自检（在仓库根目录）
npm run check
```

预期：全部通过；若失败，先修复再提交。

### 第 5 步：查看并暂存改动

```bash
git status          # 确认改了哪些文件
git diff            # 查看具体改动
git add <文件路径>   # 精确添加；或 git add -A 添加全部（提交前务必再 status 一次）
```

**禁止** `git add .env`、`git add node_modules`、`git add dist`（已被 `.gitignore` 忽略，但不要用 `-f` 强行添加）。

### 第 6 步：提交

```bash
git commit -m "feat(business): add create endpoint" -m "Refs #12"
```

作用：生成本地快照；`-m` 第二段写正文，关联 Issue。
预期：输出 `[feat/12-business-item-create abc1234] feat(business): add create endpoint`。

### 第 7 步：再次同步 main（push 前必做）

```bash
git pull --rebase origin main
```

作用：把你的提交搬到最新 main 之上，避免“push 被拒”。
预期：`Successfully rebased and updated refs/heads/feat/...`；若有冲突，按第 11 节处理。

### 第 8 步：推送到远端

```bash
git push -u origin feat/12-business-item-create
```

作用：首次推送并建立跟踪关系；之后直接 `git push`。
预期：

```text
* [new branch]      feat/12-business-item-create -> feat/12-business-item-create
branch 'feat/...' set up to track 'origin/feat/...'.
```

### 第 9 步：开 PR

在 GitHub 页面点击 “Compare & pull request” → 选择 `base: main`、`compare: 你的分支` → 填写 [PR 模板](../.github/pull_request_template.md) → 关联 Issue（`Closes #12`）→ 请求评审 → 创建。

### 第 10 步：评审与合并

- 根据评审意见继续在同一分支提交并 push（PR 会自动更新）。
- 评审通过后由评审人/组长执行 **Squash merge**。
- 合并后删除远端分支，并更新本地：

```bash
git switch main
git pull --rebase origin main
git branch -d feat/12-business-item-create
```

> 如果本地分支未合并（例如被 Squash），`-d` 可能提示未合并；确认 PR 已合并后用 `git branch -D` 强制删除本地分支即可。

## 6. push / pull 规范

### 6.1 先 pull 后 push

```bash
git pull --rebase origin main   # 先同步
git push                        # 再推送
```

原因：远端可能已有他人提交；直接 push 会被拒绝（non-fast-forward）。

### 6.2 有未提交改动时

```bash
# 方案 A：先提交（推荐，改动完整）
git add <文件>
git commit -m "wip: ..."     # 注意：wip 提交在 PR 前应整理或 squash

# 方案 B：临时收起
git stash push -m "临时保存：正在改登录页"
git stash list
git stash pop                # 处理完再恢复
```

### 6.3 禁止事项

| 禁止 | 原因 |
| --- | --- |
| 对 `main` 直接 push | 保护分支会拒绝；绕过会破坏主线 |
| 对共享分支 `--force` push | 会覆盖他人提交 |
| 在 PR 中提交 `.env`、密钥、真实数据 | 泄露风险，且历史难以彻底清除 |
| 用 `git add -f` 强行添加被忽略文件 | 破坏忽略规则 |

确实需要 force push（例如 rebase 后更新自己的 PR 分支）：

```bash
# 先确认分支是你一个人的，并在群里说一声
git push --force-with-lease origin feat/12-business-item-create
```

`--force-with-lease` 会在远端有他人新提交时拒绝，比 `--force` 安全。

### 6.4 push 被拒怎么办

| 提示 | 原因 | 处理 |
| --- | --- | --- |
| `! [rejected] ... (non-fast-forward)` | 远端有你没有的提交 | `git pull --rebase origin <分支>` → 解决冲突 → 再 push |
| `! [remote rejected] ... protected branch` | 直接推了 `main` | 改为建分支 + PR |
| `Permission denied (publickey)` | SSH 未配置/公钥未添加 | 重做 3.3；`ssh -T git@github.com` 验证 |
| `403` / `Permission to ... denied` | 无写权限 | 找组长加 Collaborator |
| `Updates were rejected because the remote contains work...` | 同 non-fast-forward | 同上 |

## 7. 提交信息规范

格式：

```text
<type>(<scope>): <subject>

<可选正文：为什么改、影响范围>
<可选：Refs #12 / Closes #12>
```

- `type`：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `perf` / `style`
- `scope`：模块名，如 `auth`、`business`、`upload`、`db`、`git`、`deploy`
- `subject`：**英文、动词开头、小写、不加句号**，建议 ≤ 72 字符
- 正文可用中文说明动机与影响

示例：

```text
feat(auth): add login skeleton
docs(git): add collaboration guide
fix(api): correct pagination hasNext
chore(deps): pin vite to 5.4.11
test(business): cover owner-only update
```

一次提交只做一件事；不要把格式化、依赖升级、业务改动混在一个 commit。

## 8. PR 基本流程

```text
① 从最新 main 建分支
② 开发 + 自测（测试/构建/自检）
③ push 分支
④ 在 GitHub 开 PR（base=main）
⑤ 填写模板：目的/Issue/类型/测试/截图/风险/回滚/文档/TODO
⑥ 关联 Issue（Closes #xx）+ 指定评审人
⑦ 根据意见修改（同一分支继续 commit + push）
⑧ 评审通过（至少 1 人；漏洞 PR 需安全评审）
⑨ Squash merge，删除远端分支
⑩ 本地切回 main 并 pull，删除本地分支
```

### 8.1 PR 标题

与提交信息同格式：

```text
feat(business): add business item create flow
docs(git): add GitHub collaboration guide
```

### 8.2 PR 描述必须包含

| 项 | 说明 |
| --- | --- |
| 变更目的 | 解决什么问题，对应课程/Issue |
| 关联 Issue | `Closes #12`（合并后自动关闭） |
| 变更类型 | feat / fix / docs / chore / test / vuln |
| 测试步骤与结果 | 命令 + 关键输出（不要只写“测试通过”） |
| 截图 | UI 改动必附；脱敏 |
| 风险与回滚 | 可能影响、如何回滚 |
| 安全/隔离影响 | 是否触碰密钥、上传、权限、漏洞分支 |
| 文档更新 | 改了哪些 docs |
| TODO 勾选 | 若完成任务，附 TODO.md diff 链接 |

### 8.3 PR 大小

- 目标：单个 PR ≤ 400 行有效改动（不含 lock/生成文件）。
- 超过时拆分：接口与页面分开、重构与功能分开。
- 文档 PR 可以稍大，但一次只改一个主题。

## 9. PR 模板内容

仓库已提供 [.github/pull_request_template.md](../.github/pull_request_template.md)，新建 PR 会自动带出。包含：

1. 变更目的
2. 关联 Issue
3. 变更类型（复选框）
4. 测试步骤与结果
5. 截图/录屏
6. 安全与隔离影响
7. 文档更新
8. TODO 勾选
9. 检查清单（密钥、测试、文档、无漏洞误入 main 等）
10. 风险与回滚

填写要求：**不要删掉模板里的检查项**；不适用的写“不适用 + 原因”。

## 10. 评审规范

### 10.1 基本要求

| 类型 | 评审要求 |
| --- | --- |
| 普通代码 PR | 至少 1 名非作者成员 |
| 漏洞 PR（`vuln/*`） | 安全评审 + 附验证方法；**不合并到 main** |
| 文档 PR | 文档负责人评审 |
| 部署/脚本 PR | 部署负责人评审 |
| 涉及数据库迁移 | 至少 1 人核对“只增不改、序号递增” |

### 10.2 评审人检查清单

- [ ] 改动是否只做一件事？有没有夹带无关修改？
- [ ] 是否提交了 `.env`、密钥、真实 IP/密码/个人信息？
- [ ] API 变更是否先更新 `docs/03-api.md`？
- [ ] 数据库变更是否新增迁移文件而非修改旧文件？
- [ ] 权限校验是否在后端（而不是只靠前端隐藏）？
- [ ] 错误处理是否使用 `AppError` + 统一响应？
- [ ] 是否补充测试，或说明为何无法测试？
- [ ] 文档是否包含“适用对象/前置条件/预计耗时/验证方式”？
- [ ] 若完成任务，TODO.md 是否在同一 PR 正确勾选并填写证据？

### 10.3 作为作者

- 主动说明“哪里最容易出错”“希望重点看什么”。
- 对意见逐条回复（已改/不改+理由），不要沉默。
- 评审通过前不要自行合并（除非规则允许）。

## 11. 冲突解决

### 11.1 预防

- 小 PR、频繁同步 main；不要长期挂着大分支。
- 开工前在 Issue 里说明“我要改哪些文件”，避免多人同改一处。
- 数据库迁移文件按序号追加，不改别人的文件。

### 11.2 标准解决步骤（rebase）

```bash
# 1) 同步（会发生冲突）
git pull --rebase origin main

# 2) 查看冲突文件
git status
# 预期：Unmerged paths: both modified: src/xxx.js

# 3) 打开冲突文件，找到标记
# <<<<<<< HEAD
# 你的版本
# =======
# 远端版本
# >>>>>>> origin/main

# 4) 手工合并为最终正确内容，删除 <<<<<<<、=======、>>>>>>> 三行标记
# 5) 标记已解决
git add <冲突文件>

# 6) 继续 rebase
git rebase --continue

# 7) 重新测试
npm --prefix backend test

# 8) 推送（若分支已推送过且历史被改写）
git push --force-with-lease
```

放弃本次 rebase（回到操作前）：

```bash
git rebase --abort
```

### 11.3 merge 冲突（不使用 rebase 时）

```bash
git merge origin/main
# 解决冲突后
git add <文件>
git commit            # 生成合并提交
```

### 11.4 特殊冲突

| 场景 | 处理 |
| --- | --- |
| 数据库迁移冲突（两人都建了 `002_`） | **不要删别人的文件**；把你的改为下一个序号（如 `003_`），在群里说明；从空库重新执行 `db:migrate` 验证；更新 docs/02 |
| `package-lock.json` 冲突 | 不要手工编辑 lock；以 `package.json` 为准，`npm install` 重新生成后提交；必要时先 `git checkout --theirs` 再 install |
| 二进制冲突（图片/证书） | 与对方确认保留哪一版；`git checkout --ours/--theirs <文件>` 二选一；避免把大二进制提交进仓库 |
| TODO.md 冲突 | 保留双方新增/勾选的行，合并后核对总数与状态 |
| 不确定怎么解 | `git rebase --abort` 先恢复，再找组长一起看；不要乱删文件 |
| 误提交了 `.env` | 立即 `git rm --cached .env`，轮换密钥，通知组长清理历史；不要只删工作区文件 |

## 12. 保护分支、Issue 与发布

### 12.1 保护分支建议（仓库管理员设置）

| 设置 | 建议值 |
| --- | --- |
| Branch name pattern | `main` |
| Require a pull request before merging | ✅ |
| Require approvals | 1（漏洞/部署 PR 建议 2） |
| Dismiss stale approvals | ✅ |
| Require conversation resolution | ✅ |
| Require status checks | 有 CI 后启用 |
| Require linear history | ✅（配合 Squash） |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

成员角色：管理员（Owner/Admin）负责仓库设置与合并；维护者（Maintainer）可评审；贡献者（Contributor）只能通过 PR 提交。

### 12.2 Issue 与看板

- 每个 TODO 任务建一个 Issue，标题与任务编号对应，如 `[A-02] 业务条目创建接口`。
- 标签建议：`type:feat`、`type:docs`、`type:vuln`、`type:deploy`、`priority:P0/P1`、`status:blocked`。
- 看板列：`待认领 → 进行中 → 待评审 → 完成`，与 TODO 状态一致。
- Issue 里记录：目标、验收标准、依赖、涉及目录、文档更新要求。

### 12.3 发布与回滚

```bash
# 打标签（版本号遵循语义化：主.次.修订）
git switch main
git pull --rebase origin main
git tag -a v0.2.0 -m "M1 业务可用"
git push origin v0.2.0
```

回滚代码：

```bash
# 方式一：部署回滚脚本（见 docs/04）
bash deploy/scripts/rollback.sh v0.1.0

# 方式二：本地切到旧版本验证
git switch --detach v0.1.0
```

> 数据库结构没有“自动降级”，回滚前先备份；详见 [04 部署](./04-deploy.md)。

### 12.4 常见问题 FAQ

| 问题 | 解决 |
| --- | --- |
| `fatal: not a git repository` | 不在仓库目录；`cd` 到项目根目录 |
| 提交作者不对 | `git config user.name/email` 检查；必要时 `git commit --amend --reset-author`（仅未推送） |
| 改错分支了（还没提交） | `git stash` → 切正确分支 → `git stash pop` |
| 提交到 main 了（还没 push） | `git switch -c feat/xx` 把提交带走 → `git branch -f main origin/main`（先确认） |
| 已经 push 到 main | 立即通知组长；用 revert PR 回退，不要 force push main |
| 忘记加文件进上一次提交 | `git add <文件>` → `git commit --amend --no-edit`（仅未推送） |
| 想撤销工作区改动 | `git restore <文件>`（不可恢复，谨慎） |
| 想看历史 | `git log --oneline --graph --decorate -20` |
| 找回误删分支 | `git reflog` 找到提交 → `git switch -c <分支> <commit>` |
| 中文乱码 | `git config --global core.quotepath false`；终端设 UTF-8 |

### 12.5 每日 / 每周检查清单

**每天开工**

- [ ] `git status` 干净
- [ ] `git switch main && git pull --rebase origin main`
- [ ] 从最新 main 建分支
- [ ] Issue 里认领并写“进行中”

**每天收工**

- [ ] 改动已 commit（或 stash 并注明）
- [ ] 分支已 push（避免只存在本地）
- [ ] PR 描述/测试结果已更新

**每周**

- [ ] TODO.md 状态与实际一致
- [ ] 关闭已合并分支
- [ ] 清理本地分支：`git branch --merged main`
- [ ] 检查是否有长期未合并分支并拆分
- [ ] 与组长同步阻塞项

## 13. Windows / macOS / Linux 差异速查

| 场景 | Windows | macOS / Linux |
| --- | --- | --- |
| Shell | PowerShell 或 Git Bash | zsh / bash |
| npm 脚本被拦 | 用 `npm.cmd` | 无此问题 |
| 换行符 | `.gitattributes` 已统一 LF；设置 `core.autocrlf false` | 默认 LF |
| SSH 公钥路径 | `%USERPROFILE%\.ssh\id_ed25519.pub` | `~/.ssh/id_ed25519.pub` |
| 查看文件 | `type 文件` | `cat 文件` |
| 端口占用 | `netstat -ano \| findstr :3000` | `lsof -i :3000` |
| 路径 | 避免空格/中文；Git Bash 中 `/e/course_sec_lab` | 无特殊要求 |
| 文件权限 | `chmod` 支持有限，`.env` 用属性保护 | `chmod 600 .env` |

> 更多环境细节见 [05 环境与版本](./05-environment.md)，本地部署见 [12 本地部署](./12-local-setup.md)。
