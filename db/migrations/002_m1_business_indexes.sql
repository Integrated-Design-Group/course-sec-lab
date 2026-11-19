-- ===========================================================================
-- 002_m1_business_indexes.sql —— M1 业务能力配套索引
-- 目标：
--   1) “我的条目 + 状态过滤”查询（owner_id, status, created_at）
--   2) 管理端审计日志按结果过滤（result, created_at）
-- 说明：
--   * 本文件只新增索引，不改动任何已合并迁移与既有列
--   * 回滚方式（手工执行）：
--       ALTER TABLE business_items DROP INDEX idx_business_items_owner_status_created;
--       ALTER TABLE audit_logs    DROP INDEX idx_audit_logs_result_created;
-- ===========================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE business_items
  ADD KEY idx_business_items_owner_status_created (owner_id, status, created_at);

ALTER TABLE audit_logs
  ADD KEY idx_audit_logs_result_created (result, created_at);
