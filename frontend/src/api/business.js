/**
 * 业务条目 API（框架阶段：列表/详情可用，写操作由后端返回 501）
 */
import { apiRequest } from './client.js';

export function listBusinessItems({ page = 1, pageSize = 10, status, keyword, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);

  return apiRequest(`/business-items?${params.toString()}`, { signal });
}

export function fetchBusinessItem(id, { signal } = {}) {
  return apiRequest(`/business-items/${encodeURIComponent(id)}`, { signal });
}

export function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/uploads', { method: 'POST', body: form });
}
