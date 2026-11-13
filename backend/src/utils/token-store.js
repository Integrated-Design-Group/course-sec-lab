/**
 * 注销令牌表（进程内实现，框架阶段）
 * ---------------------------------------------------------------------------
 * JWT 本身无状态，为了让“退出登录”在最小闭环里立刻生效，这里维护一个
 * jti 撤销集合，并在过期时间到达后自动清理。
 *
 * 已知边界（写进 docs/03-api.md）：
 *  - 仅单进程有效；多副本部署需换成 Redis 或数据库表
 *  - 进程重启后撤销记录丢失（旧 token 在过期前会重新可用）
 * 因此它只用于框架阶段演示与验收，不作为生产方案。
 */
const revokedTokens = new Map();
const MAX_ENTRIES = 10000;
let cleanupTimer = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [jti, expiresAtMs] of revokedTokens) {
      if (expiresAtMs <= now) revokedTokens.delete(jti);
    }
  }, 60_000);
  // 不阻止进程退出
  cleanupTimer.unref?.();
}

/**
 * @param {string} jti
 * @param {number} expiresAtSeconds JWT 的 exp（秒）
 */
export function revokeToken(jti, expiresAtSeconds) {
  if (!jti) return;
  ensureCleanupTimer();
  if (revokedTokens.size >= MAX_ENTRIES) {
    const oldestKey = revokedTokens.keys().next().value;
    revokedTokens.delete(oldestKey);
  }
  revokedTokens.set(jti, expiresAtSeconds * 1000);
}

export function isTokenRevoked(jti) {
  if (!jti) return false;
  const expiresAtMs = revokedTokens.get(jti);
  if (expiresAtMs === undefined) return false;
  if (expiresAtMs <= Date.now()) {
    revokedTokens.delete(jti);
    return false;
  }
  return true;
}

/** 仅供测试清理状态。 */
export function resetTokenStore() {
  revokedTokens.clear();
}

export function countRevokedTokens() {
  return revokedTokens.size;
}
