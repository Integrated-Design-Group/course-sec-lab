/**
 * 统一错误模型
 * ---------------------------------------------------------------------------
 * 所有可预期错误都由 AppError 表达，错误码同时是 API 契约的一部分
 * （见 docs/03-api.md）。HTTP 状态码由错误码映射，避免控制器各自散落 magic number。
 */

export const ERROR_CODES = Object.freeze({
  VALIDATION_ERROR: { status: 400, message: '请求参数校验失败' },
  UNAUTHORIZED: { status: 401, message: '未登录或登录状态无效' },
  AUTH_INVALID_CREDENTIALS: { status: 401, message: '用户名或密码错误' },
  AUTH_TOKEN_INVALID: { status: 401, message: '登录凭证无效' },
  AUTH_TOKEN_EXPIRED: { status: 401, message: '登录已过期，请重新登录' },
  FORBIDDEN: { status: 403, message: '没有权限执行该操作' },
  NOT_FOUND: { status: 404, message: '请求的资源不存在' },
  CONFLICT: { status: 409, message: '资源状态冲突' },
  PAYLOAD_TOO_LARGE: { status: 413, message: '上传内容超过大小限制' },
  UNSUPPORTED_MEDIA_TYPE: { status: 415, message: '不支持的文件类型' },
  RATE_LIMITED: { status: 429, message: '请求过于频繁，请稍后重试' },
  NOT_IMPLEMENTED: { status: 501, message: '框架阶段未实现该能力' },
  DB_UNAVAILABLE: { status: 503, message: '数据库暂不可用' },
  INTERNAL_ERROR: { status: 500, message: '服务器内部错误' },
});

export class AppError extends Error {
  /**
   * @param {keyof typeof ERROR_CODES} code
   * @param {string} [message]
   * @param {unknown} [details]
   */
  constructor(code, message, details = null) {
    const definition = ERROR_CODES[code] ?? ERROR_CODES.INTERNAL_ERROR;
    super(message || definition.message);
    this.name = 'AppError';
    this.code = ERROR_CODES[code] ? code : 'INTERNAL_ERROR';
    this.status = definition.status;
    this.details = details;
    this.expose = true;
  }
}

export function isAppError(error) {
  return error instanceof AppError;
}

/** 占位实现的标准错误：明确告知“框架阶段有意未实现”，而不是伪装成成功。 */
export function notImplemented(feature) {
  return new AppError('NOT_IMPLEMENTED', `${feature}：框架阶段仅保留契约与占位，将在后续 Issue 中实现`);
}
