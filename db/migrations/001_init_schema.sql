-- ===========================================================================
-- 001_init_schema.sql —— 课程安全靶场（校园二手教材交易平台）初始结构
-- 目标数据库：MySQL 8.4（需 8.0.19+，种子脚本使用了 INSERT ... AS new 语法）
-- 约定：
--   * 时间统一存 UTC（DATETIME(3)），展示层按本地时区渲染
--   * 所有表 InnoDB + utf8mb4
--   * 软删除使用 deleted_at（NULL 表示未删除）
--   * 本文件由 backend/scripts/migrate.mjs 按文件名顺序执行
-- ===========================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- 迁移版本记录（由迁移脚本维护）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version      VARCHAR(64)  NOT NULL COMMENT '迁移版本，取文件名（不含 .sql）',
  description  VARCHAR(255) NOT NULL DEFAULT '' COMMENT '迁移说明',
  applied_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '应用时间（UTC）',
  PRIMARY KEY (version)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '数据库迁移记录';

-- ---------------------------------------------------------------------------
-- roles：角色字典（最小 RBAC）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code         VARCHAR(32)     NOT NULL COMMENT '角色编码：admin / student',
  name         VARCHAR(64)     NOT NULL COMMENT '角色名称',
  description  VARCHAR(255)    NULL DEFAULT NULL COMMENT '角色说明',
  created_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '角色表';

-- ---------------------------------------------------------------------------
-- users：账号（单角色；如需多角色后续增加 user_roles 关联表）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username       VARCHAR(64)     NOT NULL COMMENT '登录名',
  email          VARCHAR(128)    NOT NULL COMMENT '邮箱（可用于登录）',
  password_hash  VARCHAR(100)    NOT NULL COMMENT 'bcrypt 哈希（60 字符，预留扩展）',
  display_name   VARCHAR(64)     NULL DEFAULT NULL COMMENT '显示名称',
  role_id        BIGINT UNSIGNED NOT NULL COMMENT '所属角色',
  status         ENUM('active', 'disabled') NOT NULL DEFAULT 'active' COMMENT '账号状态',
  last_login_at  DATETIME(3)     NULL DEFAULT NULL COMMENT '最近登录时间（UTC）',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at     DATETIME(3)     NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role_id (role_id),
  KEY idx_users_status (status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户表';

-- ---------------------------------------------------------------------------
-- uploaded_files：上传文件元数据（文件本体落 UPLOAD_DIR，不进数据库/Web 根）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uploaded_files (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id       BIGINT UNSIGNED NOT NULL COMMENT '上传者',
  original_name  VARCHAR(255)    NOT NULL COMMENT '原始文件名（仅展示，不用于落盘路径）',
  stored_name    VARCHAR(128)    NOT NULL COMMENT '服务端生成的文件名',
  mime_type      VARCHAR(100)    NOT NULL COMMENT '服务端检测到的真实 MIME',
  size_bytes     INT UNSIGNED    NOT NULL COMMENT '字节数',
  sha256         CHAR(64)        NOT NULL COMMENT '内容哈希，用于去重/取证',
  storage_path   VARCHAR(512)    NOT NULL COMMENT '相对 UPLOAD_DIR 的存储路径',
  status         ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_uploaded_files_stored_name (stored_name),
  KEY idx_uploaded_files_owner_created (owner_id, created_at),
  CONSTRAINT fk_uploaded_files_owner FOREIGN KEY (owner_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_uploaded_files_size CHECK (size_bytes > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '上传文件元数据';

-- ---------------------------------------------------------------------------
-- business_items：业务条目（二手教材 / 笔记）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_items (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_id         BIGINT UNSIGNED NOT NULL COMMENT '发布者',
  title            VARCHAR(120)    NOT NULL COMMENT '标题',
  author           VARCHAR(64)     NOT NULL COMMENT '作者/整理者',
  category         ENUM('textbook', 'notes', 'other') NOT NULL DEFAULT 'textbook' COMMENT '分类',
  condition_level  ENUM('new', 'good', 'fair') NOT NULL DEFAULT 'good' COMMENT '成色',
  price            DECIMAL(10, 2)  NOT NULL DEFAULT 0.00 COMMENT '价格（元）',
  description      TEXT            NULL COMMENT '描述',
  status           ENUM('draft', 'published', 'reserved', 'sold', 'archived') NOT NULL DEFAULT 'draft',
  cover_file_id    BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '封面文件（uploaded_files.id）',
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at       DATETIME(3)     NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (id),
  KEY idx_business_items_status_created (status, created_at),
  KEY idx_business_items_owner_created (owner_id, created_at),
  KEY idx_business_items_category (category),
  KEY idx_business_items_title (title(64)),
  CONSTRAINT fk_business_items_owner FOREIGN KEY (owner_id) REFERENCES users (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_business_items_cover FOREIGN KEY (cover_file_id) REFERENCES uploaded_files (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_business_items_price CHECK (price >= 0.00)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '业务条目（二手教材）';

-- ---------------------------------------------------------------------------
-- audit_logs：审计日志（登录、上传等关键动作）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id       BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '操作者（系统动作可为空）',
  action         VARCHAR(64)     NOT NULL COMMENT '动作标识，如 auth.login',
  resource_type  VARCHAR(32)     NULL DEFAULT NULL COMMENT '资源类型',
  resource_id    VARCHAR(64)     NULL DEFAULT NULL COMMENT '资源 ID（字符串，兼容多种主键）',
  result         ENUM('success', 'failure') NOT NULL COMMENT '结果',
  ip             VARCHAR(45)     NULL DEFAULT NULL COMMENT '来源 IP（兼容 IPv6）',
  user_agent     VARCHAR(255)    NULL DEFAULT NULL COMMENT 'User-Agent（截断）',
  detail         JSON            NULL DEFAULT NULL COMMENT '扩展信息（不含密码/token）',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_logs_actor_created (actor_id, created_at),
  KEY idx_audit_logs_action_created (action, created_at),
  KEY idx_audit_logs_created (created_at),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '审计日志';
