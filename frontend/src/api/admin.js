/**
 * 管理端 API（A-07）
 * 所有接口均要求 admin 角色；前端守卫只影响可见性。
 */
import { apiRequest } from './client.js';

export function listUsers({ page = 1, pageSize = 10, status, keyword, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);
  return apiRequest(`/admin/users?${params.toString()}`, { signal });
}

export function updateUserStatus(userId, status) {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function listAuditLogs({ page = 1, pageSize = 20, action, actorId, result, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (action) params.set('action', action);
  if (actorId) params.set('actorId', String(actorId));
  if (result) params.set('result', result);
  return apiRequest(`/admin/audit-logs?${params.toString()}`, { signal });
}
