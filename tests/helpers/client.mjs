/**
 * 冒烟/契约测试共用的 HTTP 客户端（零依赖）
 * 目标地址：API_BASE_URL，默认 http://127.0.0.1:3000/api/v1
 */
export const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:3000/api/v1').replace(
  /\/$/,
  '',
);

export class HttpResult {
  constructor(response, payload) {
    this.response = response;
    this.payload = payload;
  }

  get status() {
    return this.response.status;
  }

  get ok() {
    return this.response.ok;
  }
}

/**
 * @param {string} path 以 / 开头
 * @param {{ method?: string, body?: unknown, token?: string|null, timeoutMs?: number }} [options]
 */
export async function api(path, { method = 'GET', body, token = null, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    return new HttpResult(response, payload);
  } finally {
    clearTimeout(timer);
  }
}

export async function assertReachable({ timeoutMs = 3000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`/health 返回 HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `无法连接 ${API_BASE_URL}/health（${error.message}）。请先启动后端：npm run dev:backend，或 bash scripts/dev-up.sh`,
    );
  } finally {
    clearTimeout(timer);
  }
}
