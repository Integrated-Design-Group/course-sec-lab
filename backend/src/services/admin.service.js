/**
 * 管理端服务（A-07）
 * ---------------------------------------------------------------------------
 * 所有函数只应在 requireRole('admin') 之后调用；这里再做一次身份断言，
 * 避免将来路由装配出错时静默放行。
 *  - 用户列表 / 启用停用（禁止停用自己、禁止停用最后一个管理员）
 *  - 审计日志检索（按动作 / 操作人 / 结果）
 */
import { repositories } from '../repositories/index.js';
import { toPublicUser, USER_STATUS } from '../models/user.model.js';
import { toPublicAuditLog } from '../models/audit-log.model.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';

function assertAdmin(actor) {
  if (!actor || actor.role !== 'admin') throw new AppError('FORBIDDEN', '仅管理员可访问');
}

export async function listUsers({ page, pageSize, status, keyword, actor }) {
  assertAdmin(actor);
  const { rows, total } = await repositories.users.list({ page, pageSize, status, keyword });
  return {
    users: rows.map(toPublicUser),
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}

export async function updateUserStatus({ userId, status, actor, ip, userAgent }) {
  assertAdmin(actor);

  if (Number(userId) === Number(actor.id)) {
    throw new AppError('FORBIDDEN', '不能修改当前登录账号的状态');
  }

  const target = await repositories.users.findById(userId);
  if (!target) throw new AppError('NOT_FOUND', `用户不存在：${userId}`);

  if (target.status === status) {
    return toPublicUser(target);
  }

  if (target.role_code === 'admin' && status === USER_STATUS.DISABLED) {
    const activeAdmins = await repositories.users.countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new AppError('CONFLICT', '至少需要保留一个启用状态的管理员');
    }
  }

  const affected = await repositories.users.updateStatus(userId, status, new Date());
  if (affected === 0) throw new AppError('NOT_FOUND', `用户不存在：${userId}`);

  await recordAudit({
    actorId: actor.id,
    action: 'admin.user.status',
    resourceType: 'user',
    resourceId: userId,
    result: 'success',
    ip,
    userAgent,
    detail: { from: target.status, to: status },
  });

  const fresh = await repositories.users.findById(userId);
  return toPublicUser(fresh);
}

export async function listAuditLogs({ page, pageSize, action, actorId, result, actor }) {
  assertAdmin(actor);
  const { rows, total } = await repositories.auditLogs.list({ page, pageSize, action, actorId, result });
  return {
    logs: rows.map(toPublicAuditLog),
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}
