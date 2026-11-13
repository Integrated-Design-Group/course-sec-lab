/**
 * 健康检查 API
 */
import { apiRequest } from './client.js';

export function fetchHealth({ signal } = {}) {
  return apiRequest('/health', { token: null, signal });
}
