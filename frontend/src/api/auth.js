/**
 * 认证相关 API
 */
import { apiRequest } from './client.js';

export function login({ username, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password },
    token: null,
  });
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function fetchMe() {
  return apiRequest('/auth/me');
}
