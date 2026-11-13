/**
 * 认证与授权中间件
 * ---------------------------------------------------------------------------
 * authenticate：解析 Bearer Token → 校验签名/有效期/撤销状态 → 加载用户
 * requireRole：在 authenticate 之后做角色校验（最小 RBAC）
 */
import { AppError } from '../utils/errors.js';
import { asyncHandler } from '../utils/async-handler.js';
import { loadUserForAuth, verifyAccessToken } from '../services/auth.service.js';
import { toPublicUser } from '../models/user.model.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (!/^Bearer$/i.test(scheme || '') || !token) {
    throw new AppError('UNAUTHORIZED', '缺少 Authorization: Bearer <token> 请求头');
  }

  const payload = verifyAccessToken(token);
  const userRow = await loadUserForAuth(payload.sub);

  req.auth = { token, jti: payload.jti, exp: payload.exp };
  req.user = toPublicUser(userRow);
  next();
});

/**
 * @param {...string} allowedRoles
 */
export function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', `需要以下角色之一：${allowedRoles.join(', ')}`));
    }
    return next();
  };
}
