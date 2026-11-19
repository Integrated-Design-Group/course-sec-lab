/**
 * 业务条目 API（M1）
 * 读：列表/详情；写：创建/更新/删除；封面：上传 + 受控读取。
 */
import { apiRequest, apiRequestBlob } from './client.js';

export function listBusinessItems({ page = 1, pageSize = 10, status, keyword, mine, signal } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);
  if (mine) params.set('mine', 'true');

  return apiRequest(`/business-items?${params.toString()}`, { signal });
}

export function fetchBusinessItem(id, { signal } = {}) {
  return apiRequest(`/business-items/${encodeURIComponent(id)}`, { signal });
}

export function createBusinessItem(payload) {
  return apiRequest('/business-items', { method: 'POST', body: payload });
}

export function updateBusinessItem(id, payload) {
  return apiRequest(`/business-items/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload });
}

export function deleteBusinessItem(id) {
  return apiRequest(`/business-items/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return apiRequest('/uploads', { method: 'POST', body: form });
}

/** 受控读取封面（需要 Bearer Token，因此不能用 <img src> 直接加载） */
export function fetchCoverBlob(fileId, { signal } = {}) {
  return apiRequestBlob(`/uploads/${encodeURIComponent(fileId)}`, { signal });
}
