/**
 * 统一响应格式
 * ---------------------------------------------------------------------------
 * 成功：{ success: true, code: 'OK', message, data, meta?, requestId, timestamp }
 * 失败：{ success: false, code, message, details?, requestId, timestamp }
 * 详见 docs/03-api.md，前端 src/api/client.js 依赖该结构。
 */

function envelopeBase(res) {
  return {
    requestId: res.locals.requestId ?? null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * @param {import('express').Response} res
 * @param {{ data?: unknown, message?: string, status?: number, meta?: object|null, code?: string }} [options]
 */
export function sendSuccess(res, { data = null, message = 'OK', status = 200, meta = null, code = 'OK' } = {}) {
  const body = {
    success: true,
    code,
    message,
    data,
    ...envelopeBase(res),
  };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * @param {import('express').Response} res
 * @param {{ code: string, message: string, status: number, details?: unknown }} options
 */
export function sendFailure(res, { code, message, status, details = null }) {
  return res.status(status).json({
    success: false,
    code,
    message,
    details,
    ...envelopeBase(res),
  });
}
