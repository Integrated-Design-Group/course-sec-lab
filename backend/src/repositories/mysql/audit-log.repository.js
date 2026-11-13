/**
 * audit_logs 仓储（MySQL）
 * 审计写入失败不应影响业务主流程，异常由 services/audit.service.js 兜底。
 */
import { getPool } from '../../db/pool.js';

export async function create(entry) {
  const [result] = await getPool().query(
    `INSERT INTO audit_logs
       (actor_id, action, resource_type, resource_id, result, ip, user_agent, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.actor_id ?? null,
      entry.action,
      entry.resource_type ?? null,
      entry.resource_id ?? null,
      entry.result,
      entry.ip ?? null,
      entry.user_agent ?? null,
      entry.detail ? JSON.stringify(entry.detail) : null,
      entry.created_at ?? new Date(),
    ],
  );
  return result.insertId;
}

export async function listRecent({ limit = 20 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const [rows] = await getPool().query(
    `SELECT id, actor_id, action, resource_type, resource_id, result, ip, created_at
     FROM audit_logs ORDER BY id DESC LIMIT ${safeLimit}`,
  );
  return rows;
}
