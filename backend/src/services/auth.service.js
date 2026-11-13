/**
 * 认证服务：登录 / 退出 / 当前用户 / 令牌校验
 * ---------------------------------------------------------------------------
 * 安全基线（框架阶段就固定下来）：
 *  - 密码只以 bcrypt 哈希存储，校验失败不区分“用户不存在/密码错误”
 *  - 账号不存在时也执行一次哈希比较，降低时序侧信道
 *  - 登录失败按 IP+账号限流；成功登录清零
 *  - JWT 带 jti，退出登录后进入撤销表，立即失效（单进程范围）
 */
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { DEMO_PASSWORD_HASH } from '../config/demo-accounts.js';
import { repositories } from '../repositories/index.js';
import { USER_STATUS, toPublicUser } from '../models/user.model.js';
import { AppError } from '../utils/errors.js';
import { verifyPassword } from '../utils/password.js';
import { isTokenRevoked, revokeToken } from '../utils/token-store.js';
import {
  assertLoginAllowed,
  buildLoginKey,
  clearLoginFailures,
  recordLoginFailure,
} from '../utils/login-throttle.js';
import { recordAudit } from './audit.service.js';

const JWT_ISSUER = 'course-sec-lab';
const JWT_AUDIENCE = 'course-sec-lab-web';
const THROTTLE_POLICY = config.auth.loginRateLimit;

function signAccessToken(userRow) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: String(userRow.id), role: userRow.role_code, jti },
    config.auth.jwtSecret,
    {
      expiresIn: config.auth.jwtExpiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  );
  const decoded = jwt.decode(token);
  return { token, jti, expiresInSeconds: decoded.exp - decoded.iat };
}

/**
 * @param {{ identifier: string, password: string, ip?: string, userAgent?: string }} params
 */
export async function login({ identifier, password, ip, userAgent }) {
  const throttleKey = buildLoginKey(ip, identifier);
  assertLoginAllowed(throttleKey, THROTTLE_POLICY);

  const userRow = await repositories.users.findByUsernameOrEmail(identifier);
  const passwordOk = await verifyPassword(password, userRow?.password_hash ?? DEMO_PASSWORD_HASH);

  if (!userRow || !passwordOk) {
    recordLoginFailure(throttleKey, THROTTLE_POLICY);
    await recordAudit({
      actorId: userRow?.id ?? null,
      action: 'auth.login',
      result: 'failure',
      ip,
      userAgent,
      detail: { reason: 'invalid_credentials' },
    });
    throw new AppError('AUTH_INVALID_CREDENTIALS');
  }

  if (userRow.status !== USER_STATUS.ACTIVE) {
    await recordAudit({
      actorId: userRow.id,
      action: 'auth.login',
      result: 'failure',
      ip,
      userAgent,
      detail: { reason: 'account_disabled' },
    });
    throw new AppError('FORBIDDEN', '账号已被停用，请联系管理员');
  }

  clearLoginFailures(throttleKey);
  await repositories.users.updateLastLogin(userRow.id, new Date());

  const freshUser = (await repositories.users.findById(userRow.id)) ?? userRow;
  const { token, jti, expiresInSeconds } = signAccessToken(freshUser);

  await recordAudit({
    actorId: freshUser.id,
    action: 'auth.login',
    result: 'success',
    ip,
    userAgent,
    detail: { jti },
  });

  return {
    token,
    tokenType: 'Bearer',
    expiresInSeconds,
    user: toPublicUser(freshUser),
  };
}

/**
 * 校验 Access Token。
 * @param {string} token
 * @returns {{ sub: string, role: string, jti: string, exp: number, iat: number }}
 */
export function verifyAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.auth.jwtSecret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('AUTH_TOKEN_EXPIRED');
    }
    throw new AppError('AUTH_TOKEN_INVALID');
  }

  if (isTokenRevoked(payload.jti)) {
    throw new AppError('AUTH_TOKEN_INVALID', '登录凭证已失效，请重新登录');
  }
  return payload;
}

/**
 * 根据令牌中的 sub 加载当前用户；用户被删除/停用时视为凭证失效。
 */
export async function loadUserForAuth(userId) {
  const userRow = await repositories.users.findById(userId);
  if (!userRow) throw new AppError('UNAUTHORIZED', '用户不存在或已被删除');
  if (userRow.status !== USER_STATUS.ACTIVE) throw new AppError('FORBIDDEN', '账号已被停用');
  return userRow;
}

/**
 * 退出登录：把当前 jti 加入撤销表。
 */
export async function logout({ jti, exp, actorId, ip, userAgent }) {
  if (jti && typeof exp === 'number') {
    revokeToken(jti, exp);
  }
  await recordAudit({
    actorId,
    action: 'auth.logout',
    result: 'success',
    ip,
    userAgent,
    detail: { jti },
  });
}

export async function getCurrentUser(userId) {
  const userRow = await repositories.users.findById(userId);
  if (!userRow) throw new AppError('UNAUTHORIZED', '用户不存在或已被删除');
  return toPublicUser(userRow);
}
