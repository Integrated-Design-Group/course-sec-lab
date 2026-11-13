/**
 * 框架阶段演示账号（仅用于本地/课程环境，部署前必须停用或改密）
 * ---------------------------------------------------------------------------
 * 这些是“测试夹具”，不是真实用户凭据：
 *  - 明文仅用于文档与冒烟测试，登录校验永远走 bcrypt
 *  - 对应 SQL 种子 db/seeds/001_seed_base.sql 中使用同一哈希
 *  - docs/07-security-isolation.md 要求上线前删除/改密
 */
export const DEMO_PASSWORD = 'Demo@123456';

/** bcrypt(DEMO_PASSWORD, 10)，与种子 SQL 中一致。 */
export const DEMO_PASSWORD_HASH = '$2a$10$iU9BpCB9yg1rV3HfXfzs7OswsklmeifEVYQX.zs.hofPz8rHSVCgq';

export const DEMO_ACCOUNTS = Object.freeze([
  Object.freeze({
    id: 1,
    username: 'admin',
    email: 'admin@example.edu',
    displayName: '系统管理员（演示）',
    roleCode: 'admin',
    passwordHash: DEMO_PASSWORD_HASH,
  }),
  Object.freeze({
    id: 2,
    username: 'student',
    email: 'student@example.edu',
    displayName: '演示学生（演示）',
    roleCode: 'student',
    passwordHash: DEMO_PASSWORD_HASH,
  }),
]);
