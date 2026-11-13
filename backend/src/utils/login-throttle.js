/**
 * 登录失败限流（进程内实现）
 * ---------------------------------------------------------------------------
 * 只统计“失败”尝试，成功登录会清零；键为 IP + 账号。
 * 框架阶段用内存 Map 足够；多副本部署需换成 Redis 或网关层限流。
 */
import { AppError } from './errors.js';

const failures = new Map();
let cleanupTimer = null;

function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failures) {
      if (entry.resetAt <= now) failures.delete(key);
    }
  }, 60_000);
  cleanupTimer.unref?.();
}

export function buildLoginKey(ip, identifier) {
  return `${ip || 'unknown'}|${String(identifier || '').toLowerCase()}`;
}

/**
 * @param {string} key
 * @param {{ windowMs: number, maxAttempts: number }} policy
 */
export function assertLoginAllowed(key, policy) {
  ensureCleanup();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= Date.now()) return;

  if (entry.count >= policy.maxAttempts) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000));
    throw new AppError(
      'RATE_LIMITED',
      `登录失败次数过多，请 ${retryAfterSeconds} 秒后再试`,
      { retryAfterSeconds },
    );
  }
}

export function recordLoginFailure(key, policy) {
  ensureCleanup();
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || entry.resetAt <= now) {
    failures.set(key, { count: 1, resetAt: now + policy.windowMs });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(key) {
  failures.delete(key);
}

/** 仅供测试。 */
export function resetLoginThrottle() {
  failures.clear();
}
