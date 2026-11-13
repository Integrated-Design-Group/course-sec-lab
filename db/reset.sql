-- ===========================================================================
-- reset.sql —— 清空框架阶段所有表（不可在共享/生产库执行）
-- 用途：课程演示前重置数据，配合 backend/scripts/reset.mjs 使用。
-- 注意：
--   * 会连同 schema_migrations 一起删除，重置后必须重新执行迁移
--   * 不删除上传目录中的文件，上传目录清理由 scripts/seed.sh 负责
-- ===========================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS business_items;
DROP TABLE IF EXISTS uploaded_files;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS schema_migrations;

SET FOREIGN_KEY_CHECKS = 1;
