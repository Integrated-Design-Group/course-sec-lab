/**
 * 统一错误处理
 * ---------------------------------------------------------------------------
 * 把各类异常归一成 AppError，再按统一响应格式输出：
 *  - 可预期错误（AppError）按其 code/status 输出，details 原样返回
 *  - 请求体解析、multer、MySQL 常见错误做定向映射
 *  - 未知错误只在服务端日志保留堆栈，响应里不泄露内部细节
 */
import multer from 'multer';
import { AppError } from '../utils/errors.js';
import { sendFailure } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const DB_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'PROTOCOL_CONNECTION_LOST',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ER_CON_COUNT_ERROR',
  'ETIMEDOUT',
]);

export function notFoundHandler(req, res, next) {
  next(new AppError('NOT_FOUND', `接口不存在：${req.method} ${req.originalUrl.split('?')[0]}`));
}

function normalizeError(error) {
  if (error instanceof AppError) return error;

  if (error?.type === 'entity.too.large') {
    return new AppError('PAYLOAD_TOO_LARGE', '请求体超过大小限制');
  }
  if (error?.type === 'entity.parse.failed') {
    return new AppError('VALIDATION_ERROR', '请求体不是合法 JSON');
  }
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new AppError(
        'PAYLOAD_TOO_LARGE',
        `文件大小超过限制（最大 ${config.upload.maxBytes} 字节）`,
        { maxBytes: config.upload.maxBytes },
      );
    }
    if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError('VALIDATION_ERROR', '上传字段不正确：只接受单文件且字段名为 file', { field: 'file' });
    }
    return new AppError('VALIDATION_ERROR', `上传失败：${error.code}`, { field: 'file' });
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return new AppError('CONFLICT', '数据已存在，违反唯一约束');
  }
  if (DB_ERROR_CODES.has(error?.code)) {
    return new AppError('DB_UNAVAILABLE', '数据库暂不可用，请稍后重试');
  }

  return new AppError('INTERNAL_ERROR');
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);

  // 501 是“框架阶段有意未实现”，属于预期行为，用 warn 记录，避免污染错误告警
  if (normalized.status >= 500 && normalized.status !== 501) {
    logger.error('请求处理失败', {
      requestId: res.locals.requestId ?? null,
      path: req.originalUrl.split('?')[0],
      method: req.method,
      code: normalized.code,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
  } else {
    logger.warn('请求被拒绝', {
      requestId: res.locals.requestId ?? null,
      path: req.originalUrl.split('?')[0],
      method: req.method,
      code: normalized.code,
      status: normalized.status,
    });
  }

  return sendFailure(res, {
    code: normalized.code,
    message: normalized.message,
    status: normalized.status,
    details: normalized.details ?? null,
  });
}
