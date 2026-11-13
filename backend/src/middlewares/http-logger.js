/**
 * HTTP 访问日志
 * ---------------------------------------------------------------------------
 * 只记录方法、路径、状态码、耗时、requestId 与来源 IP，不记录请求体，
 * 避免把密码、token 等敏感信息写进日志。
 */
import { logger } from '../utils/logger.js';

export function httpLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const meta = {
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      requestId: res.locals.requestId ?? null,
      ip: req.ip,
    };
    if (req.originalUrl.includes('/health')) {
      logger.debug('http 请求', meta);
    } else {
      logger.info('http 请求', meta);
    }
  });

  next();
}
