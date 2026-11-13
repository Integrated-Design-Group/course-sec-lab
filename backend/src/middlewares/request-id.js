/**
 * 请求 ID 中间件
 * ---------------------------------------------------------------------------
 * 每个请求都有 requestId：优先复用调用方传入的 X-Request-Id（限定字符集与长度），
 * 否则生成 UUID。响应头与响应体都带该 ID，便于日志关联与问题定位。
 */
import { randomUUID } from 'node:crypto';

const INCOMING_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  const id = incoming && INCOMING_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
