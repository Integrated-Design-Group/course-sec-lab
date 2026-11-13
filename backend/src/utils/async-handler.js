/**
 * 异步控制器包装器
 * ---------------------------------------------------------------------------
 * Express 4 不会自动捕获 async handler 的 rejection，未捕获会变成 unhandledRejection。
 * 所有 async 控制器/中间件都必须经过 asyncHandler 包装，交给统一错误处理中间件。
 */
export function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
