# 04 · 部署手册

> **适用对象**：部署负责人、运维同学、验收人
> **前置条件**：拥有课程授权的云主机与域名（可选）；本机可通过 SSH 访问服务器；已完成 [07-security-isolation.md](./07-security-isolation.md) 的隔离确认
> **预计耗时**：首次部署 40～60 分钟；熟悉后 15 分钟

> ⚠️ **本文档中的公网 IP、域名、CIDR、密码全部是占位符**。框架搭建阶段没有创建真实云资源；2026-11-26 已在课程授权服务器上完成一次实际部署，记录见下方第 0 节。真实 IP/密码只登记在课程平台与部署机 `.env`，不写入仓库。
>
> **0. 2026-11-26 实际部署记录（脱敏）**
>
> - 主机：Ubuntu 24.04.2 LTS，x86_64，2 vCPU / 894 MiB RAM，30 GiB 磁盘；临时增加 2 GiB swap。
> - 软件：Docker 29.1.3、Compose 2.40.3（Ubuntu 源安装）；MySQL 8.4.4 容器。
> - 入口：`http://{{PUBLIC_IP}}:8080`（无域名、无 HTTPS；80/443 当前放行但未使用）。
> - 镜像：服务器访问 Docker Hub 超时，镜像在本地构建后用 `docker save` + `scp` + `docker load` 导入；镜像文件不入库。
> - 配置：`NODE_ENV=production`、`DB_DRIVER=mysql`、`.env` 权限 600；数据库/JWT 随机生成，不写入仓库。
> - 结果：`/api/v1/health` 200（mysql/up）、`student` 登录 200、前端 `/` 200；`001+002` 迁移、种子 11 条；管理端审计可查。
> - 备份：DB dump + uploads 卷打包；DB dump 已恢复到临时库验证（users=2、items=11），临时库已删除。
> - 低内存：使用 [deploy/docker-compose.lowmem.yml](../deploy/docker-compose.lowmem.yml) 限制 db/backend/web 内存；MySQL 降 buffer pool、关闭 performance_schema。
> - **2026-11-27 前端同步**：登录页/主页进度文案已更新，重新构建 `course-sec-lab/web:0.1.0` 并只重建 `csl-web` 容器；数据库/backend 未动；公网页面已核验。
> - **未完成/限制**：80 端口从外网不可达，改用 8080；HTTPS 未启用；代码回滚脚本未实际演练；B-12 下线未执行（按要求保留主站）；D/E 外部流程待确认。
>
> 复跑时仍需按本文第 3～9 节执行，并自行记录真实结果；不要把真实 IP/密码写回仓库。

## 1. 占位符约定

| 占位符 | 含义 | 示例（仅格式示意） |
| --- | --- | --- |
| `{{PUBLIC_IP}}` | 云主机公网 IP | `203.0.113.10` |
| `{{DOMAIN}}` | 访问域名（可选） | `lab.example.edu` |
| `{{SSH_CIDR}}` | 允许 SSH 的管理员网段 | `198.51.100.0/24` |
| `{{TEST_WINDOW_CIDR}}` | 课程测试来源网段 | `192.0.2.0/24` |
| `{{DEPLOY_DIR}}` | 服务器上的代码目录 | `/opt/course-sec-lab` |
| `{{OPERATOR}}` | 部署操作人 | `张三` |

## 2. 部署目标

| 项 | 要求 |
| --- | --- |
| 主机 | 独立云主机，**不与任何真实业务共用**；建议 2 vCPU / 4 GB / 40 GB SSD |
| 系统 | Ubuntu 22.04/24.04 LTS（或其他可安装 Docker 的 Linux） |
| 软件 | Docker Engine 24+、Docker Compose v2（`docker compose` 子命令） |
| 网络 | 公网仅放行 80（HTTPS 落地后加 443）；SSH 仅放行 `{{SSH_CIDR}}` |
| 数据库 | 与本项目同机容器或独立实例；**不对公网开放 3306** |
| 存储 | Docker 命名卷持久化 `db_data` / `upload_data` / `app_logs` |

## 3. 安全组与端口

| 方向 | 端口 | 来源 | 用途 | 是否必须 |
| --- | --- | --- | --- | --- |
| 入站 | 80/tcp | `0.0.0.0/0`（或课程 `{{TEST_WINDOW_CIDR}}`） | HTTP 访问 | 必须 |
| 入站 | 443/tcp | `0.0.0.0/0` | HTTPS（证书落地后） | 规划中 |
| 入站 | 22/tcp | **仅** `{{SSH_CIDR}}` | SSH 运维 | 必须（收敛来源） |
| 入站 | 3000/3306 | - | - | **禁止放行** |
| 出站 | 任意 | - | 拉取镜像/系统更新 | 按需 |

> 若课程要求“仅本小组可访问”，把 80 的来源收敛为 `{{TEST_WINDOW_CIDR}}`，并在 [10-access.md](./10-access.md) 登记。

## 4. 部署步骤

### 4.1 主机初始化

```bash
# 以具有 sudo 权限的账号登录后执行
sudo timedatectl set-timezone UTC
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
# Docker 安装按官方文档执行（不同发行版命令不同，此处不粘贴）
docker --version
docker compose version
```

创建部署目录并确认磁盘：

```bash
sudo mkdir -p {{DEPLOY_DIR}}
sudo chown "$USER":"$USER" {{DEPLOY_DIR}}
cd {{DEPLOY_DIR}}
```

### 4.2 获取代码

```bash
git clone <课程仓库地址> .
git checkout <课程约定的 tag 或 main>
```

> 本仓库不自动执行 `git push`，也不在服务器上直接改代码；所有变更走 PR。

### 4.3 生成并配置 `.env`

```bash
cp .env.example .env
node scripts/init-env.mjs --force   # 生成随机 JWT_SECRET；随后必须手动改 DB 配置
chmod 600 .env

# 生成强随机密码（不要使用示例值）
openssl rand -base64 24   # 填入 DB_PASSWORD
openssl rand -base64 24   # 填入 DB_ROOT_PASSWORD
```

必须在 `.env` 中确认：

| 变量 | 部署取值 | 说明 |
| --- | --- | --- |
| `NODE_ENV` | `production` | Compose 会强制覆盖 |
| `DB_DRIVER` | `mysql` | 生产禁止 memory |
| `DB_HOST` | `db` | 容器网络内服务名 |
| `DB_NAME` / `DB_USER` | `course_sec_lab` / `lab_user` | 与 compose 一致 |
| `DB_PASSWORD` / `DB_ROOT_PASSWORD` | 随机强密码 | 不入库、不截图 |
| `JWT_SECRET` | 32 字节以上随机值 | 生产启动会强校验 |
| `CORS_ORIGIN` | 如 `https://{{DOMAIN}}` | 同源请求已放行，跨域才需要 |
| `PUBLIC_HTTP_PORT` | `80` | 冲突时可改（如 8080） |
| `TRUST_PROXY` | `1` | 经 Nginx 反代 |

### 4.4 构建与启动

```bash
cd {{DEPLOY_DIR}}
docker compose -f deploy/docker-compose.yml --env-file .env build
docker compose -f deploy/docker-compose.yml --env-file .env up -d db
bash deploy/scripts/wait-for-db.sh

# 迁移（容器内执行，数据库不暴露到宿主机）
docker compose -f deploy/docker-compose.yml --env-file .env run --rm backend node scripts/migrate.mjs

# 课程演示需要种子数据时执行（依次执行 001/002 种子，共 11 条演示条目）；公网长期开放前必须改密/删除演示账号
docker compose -f deploy/docker-compose.yml --env-file .env run --rm backend node scripts/seed.mjs

# 启动应用
docker compose -f deploy/docker-compose.yml --env-file .env up -d backend web
docker compose -f deploy/docker-compose.yml --env-file .env ps
```

或使用带确认的保护脚本：

```bash
DEPLOY_ENV=staging SEED_DEMO_DATA=true bash deploy/scripts/deploy.sh
```

### 4.5 验证

```bash
# 1) 健康检查（经 Nginx）
curl -sS http://{{PUBLIC_IP}}/api/v1/health

# 2) 登录（返回 token 即最小链路可用）
curl -sS -X POST http://{{PUBLIC_IP}}/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"student","password":"Demo@123456"}'

# 3) 前端页面
curl -sSI http://{{PUBLIC_IP}}/ | head -n 1

# 4) 容器状态
docker compose -f deploy/docker-compose.yml --env-file .env ps
```

浏览器验收：打开 `http://{{PUBLIC_IP}}/` → 自动跳转 `/login` → 用演示账号登录 → 概览页显示健康状态 → 教材列表可分页 → 退出后回到登录页。

### 4.6 域名与 HTTPS（可选，未实现）

1. 域名 A 记录指向 `{{PUBLIC_IP}}`。
2. 使用 certbot 申请证书（需额外配置 443 server 块与证书卷）。
3. 把 80 的 HTTP 重定向到 443，并补 `Strict-Transport-Security` 响应头。
4. 更新 `CORS_ORIGIN` 为 `https://{{DOMAIN}}` 并重启 backend。

> 框架阶段 `deploy/nginx/default.conf` **只有 80 端口**，443 与证书属于部署阶段任务，须新增配置并验收，不得声称已启用 HTTPS。

## 5. 上传目录与日志

| 数据 | 容器路径 | 卷名 | 查看方式 |
| --- | --- | --- | --- |
| 上传文件 | `/app/uploads` | `course-sec-lab_upload_data` | `docker volume inspect course-sec-lab_upload_data` |
| 应用日志 | `/app/logs/app.log` | `course-sec-lab_app_logs` | `docker compose ... exec backend tail -f /app/logs/app.log` |
| 容器 stdout | - | - | `docker compose ... logs -f --tail=100 backend` |
| Nginx 访问日志 | stdout | - | `docker compose ... logs -f web` |

日志轮转：Compose 已限制 `json-file` 为 `10m × 3`；文件日志需自行配合 `logrotate` 或定期归档（当前未内置）。

## 6. 备份

```bash
cd {{DEPLOY_DIR}}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)

# 数据库
docker compose -f deploy/docker-compose.yml --env-file .env exec -T db \
  sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines "$MYSQL_DATABASE"' \
  > "backup-db-${STAMP}.sql"

# 上传文件卷
docker run --rm \
  -v course-sec-lab_upload_data:/data:ro \
  -v "$PWD":/backup \
  alpine:3.20 tar czf "/backup/backup-uploads-${STAMP}.tgz" -C /data .

ls -lh backup-*
```

> 卷名前缀来自 Compose 项目名 `course-sec-lab`。若修改了项目名，用 `docker volume ls` 确认真实卷名。

## 7. 恢复

```bash
# 数据库（先停写流量）
docker compose -f deploy/docker-compose.yml --env-file .env stop backend
cat backup-db-<STAMP>.sql | docker compose -f deploy/docker-compose.yml --env-file .env exec -T db \
  sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

# 上传文件
docker run --rm -v course-sec-lab_upload_data:/data -v "$PWD":/backup \
  alpine:3.20 sh -c "rm -rf /data/* && tar xzf /backup/backup-uploads-<STAMP>.tgz -C /data"

docker compose -f deploy/docker-compose.yml --env-file .env start backend
```

## 8. 回滚

```bash
# 代码级回滚（会重建镜像；数据库结构不会自动降级）
bash deploy/scripts/rollback.sh <上一个 git tag>
```

原则：

1. **先备份再回滚**（数据库 + uploads）。
2. 迁移文件只增不改；若新版本包含破坏性结构变更，回滚需按备份恢复数据库。
3. 回滚后必须重新执行健康检查与登录冒烟。

## 9. 常见故障

| 现象 | 可能原因 | 排查 |
| --- | --- | --- |
| 502 Bad Gateway | backend 未启动/健康检查失败 | `docker compose ps`、`logs backend`、确认 `/api/v1/health` |
| 健康检查 503 `DB_UNAVAILABLE` | 数据库未就绪/密码错误 | `logs db`；`docker compose exec db mysqladmin ping` |
| 前端刷新 404 | Nginx 未配置 `try_files … /index.html` | 检查 `deploy/nginx/default.conf` 是否被镜像使用 |
| 登录 401 但密码正确 | 种子未执行/账号被停用 | 执行 `db:seed`，查 `users.status` |
| 上传 413 | 超过 2MB 或 Nginx 3MB 限制 | 调整 `UPLOAD_MAX_BYTES` 与 `client_max_body_size` |
| 跨域 403 | `CORS_ORIGIN` 未包含来源且非同源 | 同源访问；或补 `CORS_ORIGIN` 后重启 |
| 容器反复重启 | `.env` 缺必填项（如 `DB_PASSWORD`） | `logs backend` 查看 `[config]` 报错 |

## 10. 上线检查清单

- [ ] `.env` 权限 600，未进入 git；仓库无真实密钥
- [ ] `DB_DRIVER=mysql`，`NODE_ENV=production`
- [ ] 演示账号已改密或停用；演示业务数据已按课程要求处理
- [ ] 安全组仅放行 80/443 与 `{{SSH_CIDR}}`，**3000/3306 未放行**
- [ ] `/api/v1/health` 返回 200 且 `checks.database.status=up`
- [ ] 最小登录闭环（登录 → 概览 → 退出）通过
- [ ] 已配置数据库与 uploads 备份，并演练过一次恢复
- [ ] 已完成 [framework-acceptance.md](./framework-acceptance.md) 人工验收
- [ ] 已在 [10-access.md](./10-access.md) 登记访问信息与测试窗口
- [ ] 明确告知所有参与者：仅课程授权测试，禁止攻击非本项目目标
