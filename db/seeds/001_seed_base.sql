-- ===========================================================================
-- 001_seed_base.sql —— 框架阶段种子数据（可重复执行）
-- 内容：
--   2 个角色、2 个演示账号、3 条业务条目
-- 演示密码：Demo@123456（bcrypt cost=10），仅用于课程假数据，部署前必须改密/停用
-- 幂等策略：固定主键 + ON DUPLICATE KEY UPDATE（MySQL 8.0.19+ 的别名语法）
-- ===========================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

-- ---------- 角色 ----------
INSERT INTO roles (id, code, name, description, created_at, updated_at) VALUES
  (1, 'admin',   '管理员', '可管理全部业务条目与系统配置', '2026-03-01 00:00:00.000', '2026-03-01 00:00:00.000'),
  (2, 'student', '学生',   '可发布与维护自己的教材条目',   '2026-03-01 00:00:00.000', '2026-03-01 00:00:00.000')
AS new
ON DUPLICATE KEY UPDATE
  name = new.name,
  description = new.description,
  updated_at = new.updated_at;

-- ---------- 演示账号 ----------
-- 哈希对应明文 Demo@123456（与 backend/src/config/demo-accounts.js 保持一致）
INSERT INTO users (id, username, email, password_hash, display_name, role_id, status, last_login_at, created_at, updated_at) VALUES
  (1, 'admin', 'admin@example.edu',
   '$2a$10$iU9BpCB9yg1rV3HfXfzs7OswsklmeifEVYQX.zs.hofPz8rHSVCgq',
   '系统管理员（演示）', 1, 'active', NULL, '2026-03-01 00:00:00.000', '2026-03-01 00:00:00.000'),
  (2, 'student', 'student@example.edu',
   '$2a$10$iU9BpCB9yg1rV3HfXfzs7OswsklmeifEVYQX.zs.hofPz8rHSVCgq',
   '演示学生（演示）', 2, 'active', NULL, '2026-03-01 00:00:00.000', '2026-03-01 00:00:00.000')
AS new
ON DUPLICATE KEY UPDATE
  email = new.email,
  password_hash = new.password_hash,
  display_name = new.display_name,
  role_id = new.role_id,
  status = new.status,
  updated_at = new.updated_at;

-- ---------- 业务条目（owner_id = 2 演示学生） ----------
INSERT INTO business_items
  (id, owner_id, title, author, category, condition_level, price, description, status, cover_file_id, created_at, updated_at)
VALUES
  (1, 2, '高等数学（第七版）上册', '同济大学数学系', 'textbook', 'good', 25.00,
   '框架阶段演示数据：少量笔记，无缺页。', 'published', NULL, '2026-03-02 02:00:00.000', '2026-03-02 02:00:00.000'),
  (2, 2, '计算机网络：自顶向下方法（第 8 版）', 'James F. Kurose', 'textbook', 'good', 45.50,
   '框架阶段演示数据：含课后习题答案缩印页。', 'published', NULL, '2026-03-03 02:00:00.000', '2026-03-03 02:00:00.000'),
  (3, 2, '数据结构课程笔记（手写扫描版）', '本组组员整理', 'notes', 'fair', 12.00,
   '框架阶段演示数据：用于验证 keyword / status 过滤。', 'draft', NULL, '2026-03-04 02:00:00.000', '2026-03-04 02:00:00.000')
AS new
ON DUPLICATE KEY UPDATE
  owner_id = new.owner_id,
  title = new.title,
  author = new.author,
  category = new.category,
  condition_level = new.condition_level,
  price = new.price,
  description = new.description,
  status = new.status,
  cover_file_id = new.cover_file_id,
  updated_at = new.updated_at;

COMMIT;
