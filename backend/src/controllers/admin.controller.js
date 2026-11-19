/**
 * 管理端控制器（A-07）
 * 路由层已挂 authenticate + requireRole('admin')，服务层再做一次身份断言。
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import { listAuditLogs, listUsers, updateUserStatus } from '../services/admin.service.js';
import { parsePositiveIntParam } from '../utils/ids.js';

export const getUsers = asyncHandler(async (req, res) => {
  const { page, pageSize, status, keyword } = req.validated.query;
  const { users, pagination } = await listUsers({
    page,
    pageSize,
    status,
    keyword,
    actor: req.user,
  });

  return sendSuccess(res, {
    message: 'OK',
    data: { users },
    meta: { pagination },
  });
});

export const patchUserStatus = asyncHandler(async (req, res) => {
  const userId = parsePositiveIntParam(req.params.id, 'userId');
  const { status } = req.validated.body;

  const user = await updateUserStatus({
    userId,
    status,
    actor: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { message: '用户状态已更新', data: { user } });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, pageSize, action, actorId, result } = req.validated.query;
  const { logs, pagination } = await listAuditLogs({
    page,
    pageSize,
    action,
    actorId,
    result,
    actor: req.user,
  });

  return sendSuccess(res, {
    message: 'OK',
    data: { logs },
    meta: { pagination },
  });
});
