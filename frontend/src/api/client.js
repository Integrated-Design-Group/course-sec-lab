/**
 * API Client（框架阶段）
 * ---------------------------------------------------------------------------
 * 约定：
 *  - 后端统一响应 { success, code, message, data, meta?, requestId, timestamp }
 *  - 失败统一抛 ApiError，页面只处理 message / code / status
 *  - Token 存在 localStorage（框架阶段方案，生产建议 httpOnly Cookie + CSRF 防护）
 *  - 收到 401 时清理本地令牌并广播 csl:unauthorized，交给 AuthProvider 收敛状态
 */

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
export const API_BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL.slice(0, -1) : RAW_BASE_URL;

const TOKEN_KEY = 'csl.token';
const UNAUTHORIZED_EVENT = 'csl:unauthorized';

export class ApiError extends Error {
  constructor({ code, message, status, details = null, requestId = null }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function parseEnvelope(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * @param {string} path 以 / 开头，例如 /auth/login
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal, token?: string|null, headers?: object }} [options]
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, signal, headers = {} } = options;
  const token = Object.prototype.hasOwnProperty.call(options, 'token') ? options.token : getToken();

  const finalHeaders = { Accept: 'application/json', ...headers };
  let requestBody;

  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: requestBody,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认后端已启动（默认 http://127.0.0.1:3000）',
      status: 0,
    });
  }

  const payload = await parseEnvelope(response);

  if (!response.ok || !payload || payload.success !== true) {
    const apiError = new ApiError({
      code: payload?.code ?? `HTTP_${response.status}`,
      message: payload?.message ?? `请求失败（HTTP ${response.status}）`,
      status: response.status,
      details: payload?.details ?? null,
      requestId: payload?.requestId ?? response.headers.get('x-request-id'),
    });

    if (response.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw apiError;
  }

  return payload;
}

export function onUnauthorized(handler) {
  window.addEventListener(UNAUTHORIZED_EVENT, handler);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
}

/**
 * 读取二进制内容（受控鉴权文件接口）。
 * 不解析 JSON 信封：成功直接返回 Blob，失败按统一错误结构抛 ApiError。
 * @param {string} path 以 / 开头，例如 /uploads/1
 * @param {{ signal?: AbortSignal }} [options]
 */
export async function apiRequestBlob(path, options = {}) {
  const { signal } = options;
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: '无法连接后端服务，请确认后端已启动（默认 http://127.0.0.1:3000）',
      status: 0,
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (response.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }

    throw new ApiError({
      code: payload?.code ?? `HTTP_${response.status}`,
      message: payload?.message ?? `请求失败（HTTP ${response.status}）`,
      status: response.status,
      details: payload?.details ?? null,
      requestId: payload?.requestId ?? response.headers.get('x-request-id'),
    });
  }

  return response.blob();
}
