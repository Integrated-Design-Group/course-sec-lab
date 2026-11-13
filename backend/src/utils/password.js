/**
 * 密码哈希
 * ---------------------------------------------------------------------------
 * 只允许 bcrypt（bcryptjs 纯 JS 实现，避免 CI/Docker 里的原生编译依赖）。
 * 明文密码绝不出现在日志、审计、响应中。
 */
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.auth.bcryptRounds);
}

export function verifyPassword(plainPassword, passwordHash) {
  if (typeof plainPassword !== 'string' || typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(plainPassword, passwordHash);
}
