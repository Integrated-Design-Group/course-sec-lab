/**
 * audit_logs 模型（管理端只读检索用）
 * ---------------------------------------------------------------------------
 * 审计记录只追加、不修改；响应中不返回密码/token 等敏感字段
 * （写入侧由 services/audit.service.js 保证 detail 不含敏感值）。
 */
import { toIsoString } from './user.model.js';

export const AUDIT_RESULTS = Object.freeze(['success', 'failure']);

export const listAuditLogsQuerySchema = {
  page: { type: 'int', min: 1, max: 10000, default: 1 },
  pageSize: { type: 'int', min: 1, max: 50, default: 20 },
  action: { type: 'string', min: 1, max: 64 },
  actorId: { type: 'int', min: 1 },
  result: { type: 'enum', enum: AUDIT_RESULTS },
};

export function toPublicAuditLog(row) {
  if (!row) return null;
  let detail = row.detail ?? null;
  if (typeof detail === 'string') {
    try {
      detail = JSON.parse(detail);
    } catch {
      detail = null;
    }
  }
  return {
    id: Number(row.id),
    actorId: row.actor_id === null || row.actor_id === undefined ? null : Number(row.actor_id),
    action: row.action,
    resourceType: row.resource_type ?? null,
    resourceId: row.resource_id ?? null,
    result: row.result,
    ip: row.ip ?? null,
    userAgent: row.user_agent ?? null,
    detail,
    createdAt: toIsoString(row.created_at),
  };
}
