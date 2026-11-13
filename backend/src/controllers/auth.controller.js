/**
 * 认证控制器
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import { getCurrentUser, login, logout } from '../services/auth.service.js';

export const postLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.validated.body;
  const result = await login({
    identifier: username,
    password,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { message: '登录成功', data: result });
});

export const postLogout = asyncHandler(async (req, res) => {
  await logout({
    jti: req.auth.jti,
    exp: req.auth.exp,
    actorId: req.user.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { message: '已退出登录', data: null });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(Number(req.user.id));
  return sendSuccess(res, { message: 'OK', data: user });
});
