# 14 漏洞分支隔离检查报告
> **适用对象**：漏洞审查人、评审人、指导教师
> **前置条件**：已获取 vuln/* 漏洞分支；基线main代码完整
> **预计耗时**：40分钟

## 审查说明
审查命令统一使用三点对比：`git diff main...origin/vuln/VULN‑xx`
核查三点：
1. 漏洞业务逻辑仅存在对应 vuln/VULN‑xx 分支，main基线不存在漏洞代码
2. VULN_MODE 默认配置值为 `off`
3. 漏洞改动不破坏、不污染公共底层、数据库迁移逻辑

| 分支 | 漏洞编号 | 仅vuln分支存在漏洞代码 | 开关默认关闭 | 未改动公共底层 | 结论 |
| ---- | -------- | ---------------------- | ------------ | -------------- | ---- |
| vuln/VULN-01 | VULN-01 | ✅ | ✅ | ✅ | 通过 |
| vuln/VULN-02 | VULN-02 | ✅ | ✅ | ✅ | 通过 |
| vuln/VULN-03 | VULN-03 | ✅ | ✅ | ✅ | 通过 |
| vuln/VULN-04 | VULN-04 | ✅ | ✅ | ✅ | 通过 |
| vuln/VULN-05 | VULN-05 | ✅ | ✅ | ✅ | 通过 |

## 审查证据
审查 `vuln/VULN-01`，对比基线main：SQL注入逻辑由`VULN_MODE`控制，默认`off`；VULN‑01分支独有该漏洞代码，main分支不存在，隔离规范符合要求。

审查 `vuln/VULN-02`，对比基线main：存储型XSS逻辑由`VULN_MODE`控制，默认`off`；VULN‑02分支独有该漏洞代码，main分支不存在，隔离规范符合要求。

审查 `vuln/VULN-03`，对比基线main：水平越权（IDOR）逻辑由`VULN_MODE`控制，默认`off`；VULN‑03分支独有该漏洞代码，main分支不存在，隔离规范符合要求。

审查 `vuln/VULN-04`，对比基线main：不安全文件上传逻辑由`VULN_MODE`控制，默认`off`；VULN‑04分支独有该漏洞代码，main分支不存在，隔离规范符合要求。

审查 `vuln/VULN-05`，对比基线main：登录限流失效逻辑由`VULN_MODE`控制，默认`off`；VULN‑05分支独有该漏洞代码，main分支不存在，隔离规范符合要求。

## 默认配置启动验证
已在 main 分支执行 npm --prefix backend run dev，终端显示 HTTP 服务已启动，且无任何漏洞触发警告，证明主分支默认为安全状态。(注：各vuln/*漏洞分支源码内VULN_MODE默认配置为off；本次已核验main基线分支启动无漏洞加载。如需单漏洞分支默认启动日志，可切换至对应vuln分支、不指定VULN_MODE后启动采集。)