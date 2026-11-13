# 03 · API 契约

> **适用对象**：前端同学、后端同学、接口联调与验收人
> **前置条件**：后端已启动；已阅读 [02-database.md](./02-database.md)；了解 HTTP/JSON
> **预计耗时**：通读 25 分钟；按示例联调 15 分钟

## 1. 基础约定

| 项 | 约定 |
| --- | --- |
| Base URL（开发） | `http://127.0.0.1:3000` |
| Base URL（部署） | `http://{{PUBLIC_IP_OR_DOMAIN}}`（Nginx 同源反代） |
| API 前缀 | `/api/v1` **固定**，不接受其他前缀 |
| 传输格式 | JSON（`Content-Type: application/json`），上传为 `multipart/form-data` |
| 字符集 | UTF-8 |
| 时间格式 | ISO 8601 UTC，例如 `2026-11-13T12:00:00.000Z` |
| 金额 | JSON number（如 `25`、`45.5`），数据库为 `DECIMAL(10,2)` |
| 命名 | 请求/响应字段使用 camelCase；数据库列使用 snake_case |
| 请求标识 | 响应头与响应体都带 `requestId`；客户端可传 `X-Request-Id`（8～64 位 `[A-Za-z0-9._-]`） |

## 2. 统一响应信封

### 2.1 成功

```json
{
  "success": true,
  "code": "OK",
  "message": "服务正常",
  "data": { "status": "ok" },
  "meta": { "pagination": { "page": 1, "pageSize": 10, "total": 3, "totalPages": 1, "hasNext": false, "hasPrev": false } },
  "requestId": "6d1f0c2e-9f1a-4b7c-8a51-3c0e5f7d2b10",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | :---: | --- |
| `success` | boolean | 是 | 成功恒为 `true` |
| `code` | string | 是 | 成功为 `OK`；失败见错误码表 |
| `message` | string | 是 | 可直接展示的中文提示 |
| `data` | any | 是 | 业务数据；无数据时为 `null` |
| `meta` | object | 否 | 仅在需要时出现（如分页） |
| `requestId` | string | 是 | 与响应头 `X-Request-Id` 一致 |
| `timestamp` | string | 是 | 服务端生成时间（UTC） |

### 2.2 失败

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "请求参数校验失败",
  "details": [{ "field": "password", "message": "password 为必填项" }],
  "requestId": "6d1f0c2e-9f1a-4b7c-8a51-3c0e5f7d2b10",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

| 字段 | 类型 | 必有 | 说明 |
| --- | --- | :---: | --- |
| `success` | boolean | 是 | 失败恒为 `false` |
| `code` | string | 是 | 稳定错误码，前端据此分支处理 |
| `message` | string | 是 | 中文可读信息（不包含内部堆栈） |
| `details` | any | 否 | 校验错误数组 / 补充上下文；生产环境不泄露堆栈 |
| `requestId` | string | 是 | 用于日志检索 |
| `timestamp` | string | 是 | 服务端生成时间（UTC） |

## 3. 错误码

| code | HTTP | 含义 | 典型场景 | 客户端建议 |
| --- | :---: | --- | --- | --- |
| `OK` | 200/201 | 成功 | - | 正常处理 |
| `VALIDATION_ERROR` | 400 | 参数校验失败 | 缺字段、枚举非法、id 非正整数 | 展示 `details` |
| `UNAUTHORIZED` | 401 | 未登录 | 缺少 Bearer Token | 跳转登录 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 账号或密码错误 | 登录失败（不区分用户是否存在） | 提示重新输入 |
| `AUTH_TOKEN_INVALID` | 401 | 令牌无效/已撤销 | 伪造、退出后复用、用户被停用 | 清理本地令牌并跳登录 |
| `AUTH_TOKEN_EXPIRED` | 401 | 令牌过期 | 超过 `JWT_EXPIRES_IN` | 跳转登录 |
| `FORBIDDEN` | 403 | 无权限 | 角色不足、CORS 来源不允许、账号停用 | 提示无权限 |
| `NOT_FOUND` | 404 | 资源/接口不存在 | id 不存在、路径拼错 | 展示空状态 |
| `CONFLICT` | 409 | 冲突 | 唯一键冲突（M1 使用） | 提示冲突字段 |
| `PAYLOAD_TOO_LARGE` | 413 | 载荷过大 | 上传超过 2MB、JSON 超过 1MB | 提示限制 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | 类型不支持 | 非 PNG/JPEG/WebP、伪造扩展名 | 提示允许类型 |
| `RATE_LIMITED` | 429 | 请求过于频繁 | 登录失败次数超限 | 展示 `details.retryAfterSeconds` |
| `NOT_IMPLEMENTED` | 501 | 框架阶段未实现 | 写业务接口 | 提示“后续版本开放” |
| `DB_UNAVAILABLE` | 503 | 数据库不可用 | 探活失败、连接拒绝 | 提示稍后重试 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 未捕获异常 | 提示联系管理员并附 `requestId` |

## 4. 认证

| 项 | 说明 |
| --- | --- |
| 方式 | JWT（HS256）Bearer Token |
| 请求头 | `Authorization: Bearer <token>` |
| 签发 | `POST /api/v1/auth/login` |
| 有效期 | `JWT_EXPIRES_IN`，默认 `2h` |
| Claims | `sub`（用户 ID）、`role`、`jti`、`iat`、`exp`、`iss=course-sec-lab`、`aud=course-sec-lab-web` |
| 退出 | `POST /api/v1/auth/logout` 将 `jti` 加入撤销表，同一令牌立即失效 |
| 撤销存储 | **进程内 Map**（单副本有效；重启或多副本部署会丢失，生产需换 Redis/数据库表） |
| 登录限流 | 按 `IP + 账号` 统计**失败**次数，默认 10 次 / 10 分钟；成功登录清零 |
| 密码存储 | bcrypt（cost 10），响应与日志绝不返回哈希 |

受保护接口统一行为：

- 无 `Authorization` → `401 UNAUTHORIZED`
- 签名错误/格式错误 → `401 AUTH_TOKEN_INVALID`
- 过期 → `401 AUTH_TOKEN_EXPIRED`
- 已退出（撤销）→ `401 AUTH_TOKEN_INVALID`
- 账号被停用 → `403 FORBIDDEN`

## 5. 分页约定

所有列表接口统一使用 query 参数：

| 参数 | 类型 | 必填 | 默认 | 约束 |
| --- | --- | :---: | --- | --- |
| `page` | integer | 否 | `1` | 1 ≤ page ≤ 10000 |
| `pageSize` | integer | 否 | `10` | 1 ≤ pageSize ≤ 50 |

响应放在 `meta.pagination`：

```json
{
  "page": 1,
  "pageSize": 10,
  "total": 3,
  "totalPages": 1,
  "hasNext": false,
  "hasPrev": false
}
```

排序约定：当前固定 `created_at DESC, id DESC`，框架阶段不开放自定义排序。

## 6. 上传约定

| 项 | 约定 |
| --- | --- |
| 方法/路径 | `POST /api/v1/uploads` |
| 认证 | 必须登录 |
| Content-Type | `multipart/form-data` |
| 字段名 | `file`（单文件，仅 1 个） |
| 大小上限 | 2 MB（`UPLOAD_MAX_BYTES`；Nginx 侧 3 MB，便于返回结构化 413） |
| 允许类型 | `image/png`、`image/jpeg`、`image/webp` |
| 校验层次 | ① 声明 MIME 白名单 ② 扩展名与声明类型一致 ③ 读取文件头复核真实类型 ④ 服务端重命名 |
| 落盘 | `UPLOAD_DIR`（默认 `backend/uploads`，容器内 `/app/uploads`），**不在 Web 根目录** |
| 返回 | 文件元数据；**不返回可公开访问的下载 URL** |
| 失败清理 | 校验失败会删除已落盘的临时文件 |

## 7. 端点总表

| # | 方法 | 路径 | 认证 | 状态 | 说明 |
| --- | --- | --- | :---: | --- | --- |
| 1 | GET | `/api/v1/health` | 否 | ✅ 可用 | 健康检查 |
| 2 | POST | `/api/v1/auth/login` | 否 | ✅ 可用 | 登录 |
| 3 | POST | `/api/v1/auth/logout` | 是 | ✅ 可用 | 退出（撤销令牌） |
| 4 | GET | `/api/v1/auth/me` | 是 | ✅ 可用 | 当前用户 |
| 5 | GET | `/api/v1/business-items` | 否 | ✅ 可用 | 业务条目列表（只读） |
| 6 | GET | `/api/v1/business-items/:id` | 否 | ✅ 可用 | 业务条目详情（只读） |
| 7 | POST | `/api/v1/business-items` | 是 | 🚧 501 | 新增（占位） |
| 8 | PATCH | `/api/v1/business-items/:id` | 是 | 🚧 501 | 编辑（占位） |
| 9 | DELETE | `/api/v1/business-items/:id` | 是 | 🚧 501 | 删除（占位） |
| 10 | POST | `/api/v1/uploads` | 是 | ✅ 可用 | 上传图片 |
| 11 | GET | `/api/v1` | 否 | ✅ 可用 | API 索引 |

---

## 8. 端点详情

### 8.1 健康检查

`GET /api/v1/health`

**成功 200**

```json
{
  "success": true,
  "code": "OK",
  "message": "服务正常",
  "data": {
    "status": "ok",
    "service": "course-sec-lab",
    "version": "0.1.0",
    "env": "development",
    "apiPrefix": "/api/v1",
    "uptimeSeconds": 128,
    "checks": {
      "database": { "driver": "mysql", "status": "up", "latencyMs": 1.8 }
    }
  },
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

**数据库不可用 503**

```json
{
  "success": false,
  "code": "DB_UNAVAILABLE",
  "message": "数据库探活失败",
  "details": { "checks": { "database": { "driver": "mysql", "status": "down", "latencyMs": 3001, "errorCode": "ECONNREFUSED" } } },
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

> `DB_DRIVER=memory` 时 `checks.database` 为 `{ "driver": "memory", "status": "up", "note": "…" }`，用于本地演示。

### 8.2 登录

`POST /api/v1/auth/login`

| 字段 | 类型 | 必填 | 约束 |
| --- | --- | :---: | --- |
| `username` | string | 是 | 用户名或邮箱，3～64 字符 |
| `password` | string | 是 | 8～128 字符 |

```bash
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"student","password":"Demo@123456"}'
```

**成功 200**

```json
{
  "success": true,
  "code": "OK",
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…",
    "tokenType": "Bearer",
    "expiresInSeconds": 7200,
    "user": {
      "id": 2,
      "username": "student",
      "email": "student@example.edu",
      "displayName": "演示学生（演示）",
      "role": "student",
      "roleName": "学生",
      "status": "active",
      "lastLoginAt": "2026-11-13T12:00:00.000Z",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "updatedAt": "2026-11-13T12:00:00.000Z"
    }
  },
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

**失败**：`400 VALIDATION_ERROR`、`401 AUTH_INVALID_CREDENTIALS`、`403 FORBIDDEN`（账号停用）、`429 RATE_LIMITED`。

### 8.3 退出登录

`POST /api/v1/auth/logout`（需认证）

```bash
curl -sS -X POST http://127.0.0.1:3000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**成功 200**：`data` 为 `null`，`message` 为 `已退出登录`。退出后同一 token 访问任何受保护接口均返回 `401 AUTH_TOKEN_INVALID`。

### 8.4 当前用户

`GET /api/v1/auth/me`（需认证）

**成功 200**：`data` 为用户对象（字段同登录返回的 `user`）。

### 8.5 业务条目列表

`GET /api/v1/business-items`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `page` | integer | 否 | 默认 1 |
| `pageSize` | integer | 否 | 默认 10，最大 50 |
| `status` | enum | 否 | `draft` / `published` / `reserved` / `sold` / `archived` |
| `keyword` | string | 否 | 标题或作者模糊匹配，1～60 字符 |

```bash
curl -sS "http://127.0.0.1:3000/api/v1/business-items?page=1&pageSize=2&status=published"
```

**成功 200**

```json
{
  "success": true,
  "code": "OK",
  "message": "OK",
  "data": {
    "items": [
      {
        "id": 2,
        "title": "计算机网络：自顶向下方法（第 8 版）",
        "author": "James F. Kurose",
        "category": "textbook",
        "conditionLevel": "good",
        "price": 45.5,
        "status": "published",
        "description": "框架阶段演示数据：含课后习题答案缩印页。",
        "coverFileId": null,
        "owner": { "id": 2, "displayName": "演示学生（演示）" },
        "createdAt": "2026-03-03T02:00:00.000Z",
        "updatedAt": "2026-03-03T02:00:00.000Z"
      }
    ]
  },
  "meta": {
    "pagination": { "page": 1, "pageSize": 2, "total": 2, "totalPages": 1, "hasNext": false, "hasPrev": false }
  },
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

### 8.6 业务条目详情

`GET /api/v1/business-items/:id`

**成功 200**：`data.item` 结构同上。

**失败**：`400 VALIDATION_ERROR`（id 非正整数）、`404 NOT_FOUND`（不存在或已软删除）。

### 8.7 写操作占位（501）

`POST /api/v1/business-items`、`PATCH /api/v1/business-items/:id`、`DELETE /api/v1/business-items/:id`

- 未登录 → `401 UNAUTHORIZED`
- 已登录 → `501 NOT_IMPLEMENTED`

```json
{
  "success": false,
  "code": "NOT_IMPLEMENTED",
  "message": "新增业务条目（POST /business-items）：框架阶段仅保留契约与占位，将在后续 Issue 中实现",
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

> 实现时必须同时补上：入参校验（见 02 文档字段约束）、所有者/管理员鉴权、审计日志。

### 8.8 上传

`POST /api/v1/uploads`（需认证，`multipart/form-data`）

```bash
curl -sS -X POST http://127.0.0.1:3000/api/v1/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./cover.png;type=image/png"
```

**成功 201**

```json
{
  "success": true,
  "code": "OK",
  "message": "上传成功",
  "data": {
    "file": {
      "id": 1,
      "originalName": "cover.png",
      "mimeType": "image/png",
      "sizeBytes": 68,
      "sha256": "5f1c…（64 位十六进制）",
      "status": "active",
      "ownerId": 2,
      "createdAt": "2026-11-13T12:00:00.000Z"
    }
  },
  "requestId": "…",
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

**失败**：

| 场景 | HTTP | code |
| --- | :---: | --- |
| 未登录 | 401 | `UNAUTHORIZED` |
| 缺少 `file` 字段 | 400 | `VALIDATION_ERROR` |
| 超过 2MB | 413 | `PAYLOAD_TOO_LARGE` |
| 非白名单类型/伪造扩展名/文件头不符 | 415 | `UNSUPPORTED_MEDIA_TYPE` |

### 8.9 API 索引

`GET /api/v1` 返回服务名、版本、各端点路径与文档位置。

## 9. 前端调用要点

- 所有请求经 `frontend/src/api/client.js`，统一解析信封、抛出 `ApiError`。
- `401` 时自动清理本地令牌并广播 `csl:unauthorized`，由 `AuthProvider` 收敛为未登录态。
- 本地开发通过 Vite 代理把 `/api` 转发到 `127.0.0.1:3000`，生产由 Nginx 同源反代。

## 10. 契约变更流程

1. 先改本文档（字段、示例、错误码），再改代码。
2. 破坏性变更必须提升版本或在 PR 中说明迁移方案。
3. 同步更新 `backend/tests/`、`tests/api/` 中受影响断言。
4. 前端 `api/` 目录同步调整，禁止在页面里直连未文档化接口。

## 11. 未实现清单（框架阶段）

| 能力 | 状态 |
| --- | --- |
| 业务条目 新增/编辑/删除 | 501 占位 |
| 管理员接口（用户管理、内容审核、审计检索） | 未定义 |
| 上传文件的受控读取/缩略图 | 未定义 |
| 刷新令牌 / 记住我 | 未实现 |
| 分页游标、自定义排序 | 未实现 |
| 限流响应头（`X-RateLimit-*`） | 未实现 |
