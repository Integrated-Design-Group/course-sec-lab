# 贡献指南（CONTRIBUTING）

> **适用对象**：所有向本仓库提交代码/文档的成员
> **前置条件**：已加入仓库；本地能跑通项目（见 [本地部署](docs/12-local-setup.md)）
> **预计耗时**：阅读 5 分钟
> **验证方式**：按本文第 3 节流程成功合并一个 PR

本文件只列**必须知道的最小规则**。完整说明见：

- 分支/提交/PR/评审/冲突解决：[docs/11-github-collaboration.md](docs/11-github-collaboration.md)
- 目录职责、代码风格、文档规范：[docs/06-conventions.md](docs/06-conventions.md)
- 任务与进度：[TODO.md](TODO.md)
- 本地环境：[docs/12-local-setup.md](docs/12-local-setup.md)
- PR 模板：[.github/pull_request_template.md](.github/pull_request_template.md)
- Issue 模板：[.github/ISSUE_TEMPLATE/task.md](.github/ISSUE_TEMPLATE/task.md)

## 1. 四条硬规则

1. **不直接改 `main`**：一律建分支 → 提 PR → 至少 1 人评审 → Squash 合并。
2. **不提交敏感信息**：`.env`、真实密码、云密钥、证书私钥、真实个人信息一律不进仓库。
3. **一个 PR 只做一件事**：小步提交，便于评审与回滚。
4. **接口/结构变更先改文档**：`docs/03-api.md`、`docs/02-database.md` 先行，再改代码。

## 2. 分支与提交

```bash
git switch main
git pull --rebase origin main
git switch -c feat/<issue>-<slug>     # 或 fix/ docs/ chore/ vuln/
```

提交格式：

```text
<type>(<scope>): <英文短句>

<正文可中文，说明动机与影响>
Refs #12
```

## 3. 提交前检查

```bash
npm --prefix backend test
npm --prefix frontend run build
npm run check
```

- [ ] 测试/构建/自检通过
- [ ] 未提交 `.env`、密钥、产物、日志
- [ ] 更新了受影响的文档
- [ ] 完成 TODO 任务时，在同一 PR 内勾选并填写证据

## 4. 提 PR

1. push 分支：`git push -u origin <分支>`。
2. 在 GitHub 开 PR，base 选 `main`。
3. 按模板填写：目的、Issue、类型、测试、截图、安全影响、文档、TODO 勾选。
4. 关联 Issue（`Closes #12`），指定评审人。
5. 评审通过后由评审人/组长 Squash merge；合并后删除分支并更新本地 `main`。

## 5. 不会用 Git？

先读 [docs/11-github-collaboration.md](docs/11-github-collaboration.md) 第 3～5 节，按里面的命令逐条执行；卡住时把“命令 + 完整报错”发到群里，不要反复重装或强推。
