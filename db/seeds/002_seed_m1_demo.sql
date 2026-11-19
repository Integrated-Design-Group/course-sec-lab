-- ===========================================================================
-- 002_seed_m1_demo.sql —— M1 业务演示数据扩展（可重复执行）
-- 内容：
--   * 8 条业务条目（id 4～11），覆盖 published / reserved / sold / draft / archived
--   * 所有者混合 admin(1) 与 student(2)，用于验证“我的条目”过滤与管理员审核
--   * 分类覆盖 textbook / notes / other，价格与时间跨度用于验证分页与排序
-- 幂等策略：固定主键 + ON DUPLICATE KEY UPDATE（MySQL 8.0.19+ 的别名语法）
-- 说明：全部为课程假数据，不含任何真实学生信息；部署到公网前必须清理
-- ===========================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

START TRANSACTION;

INSERT INTO business_items
  (id, owner_id, title, author, category, condition_level, price, description, status, cover_file_id, created_at, updated_at)
VALUES
  (4, 2, '线性代数（第六版）', '同济大学数学系', 'textbook', 'good', 22.00,
   'M1 演示数据：书角轻微磨损，内页干净，可正常使用。', 'published', NULL, '2026-03-05 02:00:00.000', '2026-03-05 02:00:00.000'),
  (5, 1, '操作系统概念（第九版）', 'Abraham Silberschatz', 'textbook', 'new', 68.00,
   'M1 演示数据：管理员发布的教材，用于验证不同所有者过滤。', 'published', NULL, '2026-03-06 02:00:00.000', '2026-03-06 02:00:00.000'),
  (6, 2, '离散数学及其应用（第八版）', 'Kenneth H. Rosen', 'textbook', 'fair', 35.00,
   'M1 演示数据：已有人预订，用于验证 reserved 状态展示。', 'reserved', NULL, '2026-03-07 02:00:00.000', '2026-03-07 02:00:00.000'),
  (7, 2, '大学英语四级真题解析', '课程组整理', 'notes', 'good', 9.90,
   'M1 演示数据：已售出条目，用于验证 sold 状态展示。', 'sold', NULL, '2026-03-08 02:00:00.000', '2026-03-08 02:00:00.000'),
  (8, 1, '网络安全课程实验指导（旧版）', '实验室整理', 'other', 'fair', 5.00,
   'M1 演示数据：已归档条目，用于验证 archived 状态展示。', 'archived', NULL, '2026-03-09 02:00:00.000', '2026-03-09 02:00:00.000'),
  (9, 2, '概率论与数理统计笔记', '本组组员整理', 'notes', 'good', 15.00,
   'M1 演示数据：草稿条目，仅本人可在“我的条目”中查看并编辑。', 'draft', NULL, '2026-03-10 02:00:00.000', '2026-03-10 02:00:00.000'),
  (10, 1, '二手计算器（非教材类示例）', '管理员发布', 'other', 'good', 39.00,
   'M1 演示数据：other 分类，用于验证分类与分页组合。', 'published', NULL, '2026-03-11 02:00:00.000', '2026-03-11 02:00:00.000'),
  (11, 1, '计算机网络实验报告模板', '课程组整理', 'notes', 'new', 6.50,
   'M1 演示数据：已售出笔记，用于验证多状态混合分页。', 'sold', NULL, '2026-03-12 02:00:00.000', '2026-03-12 02:00:00.000')
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
