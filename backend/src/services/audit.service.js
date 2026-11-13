/**
 * 审计日志服务
 * ---------------------------------------------------------------------------
 * 设计原则：审计失败不能阻断业务，但必须在应用日志里留下痕迹。
 * 记录字段：谁（actor_id）、做了什么（action）、对象（resource_*）、结果、来源 IP/UA。
 */
import { repositories } from '../repositories/index.js';
import { logger } from '../utils/logger.js';

/**
 * @param {{
 *   actorId?: number|null,
 *   action: string,
 *   resourceType?: string|null,
 *   resourceId?: string|number|null,
 *   result: 'success'|'failure',
 *   ip?: string|null,
 *   userAgent?: string|null,
 *   detail?: object|null,
 * }} entry
 */
export async function recordAudit(entry) {
  try {
    await repositories.auditLogs.create({
      actor_id: entry.actorId ?? null,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId === undefined || entry.resourceId === null ? null : String(entry.resourceId),
      result: entry.result,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ? String(entry.userAgent).slice(0, 255) : null,
      detail: entry.detail ?? null,
      created_at: new Date(),
    });
  } catch (error) {
    logger.error('审计日志写入失败', { action: entry.action, errorMessage: error.message });
  }
}
