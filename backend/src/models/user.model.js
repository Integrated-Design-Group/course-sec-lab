/**
 * users 模型：字段约束、角色常量、输入规则、对外序列化
 * ---------------------------------------------------------------------------
 * 数据库真实结构见 db/migrations/001_init_schema.sql；
 * 这里只描述“应用层看到的字段”，避免控制器里散落字符串常量。
 */
import { validateObject } from '../utils/validation.js';

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

export const ROLE_CODES = Object.freeze({
  ADMIN: 'admin',
  STUDENT: 'student',
});

/** 登录入参：用户名或邮箱二选一，框架阶段统一用 username 字段承载。 */
export const loginSchema = {
  username: { required: true, type: 'string', min: 3, max: 64 },
  password: { required: true, type: 'string', min: 8, max: 128 },
};

export function validateLoginPayload(body) {
  return validateObject(body, loginSchema);
}

/** 管理端用户列表查询（A-07） */
export const listUsersQuerySchema = {
  page: { type: 'int', min: 1, max: 10000, default: 1 },
  pageSize: { type: 'int', min: 1, max: 50, default: 10 },
  status: { type: 'enum', enum: Object.values(USER_STATUS) },
  keyword: { type: 'string', min: 1, max: 60 },
};

/** 管理端启用/停用账号（A-07） */
export const updateUserStatusSchema = {
  status: { required: true, type: 'enum', enum: Object.values(USER_STATUS) },
};


/** 内部使用：数据库行（snake_case）→ 对外用户对象（camelCase）。 */
export function toPublicUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    displayName: row.display_name,
    role: row.role_code,
    roleName: row.role_name ?? null,
    status: row.status,
    lastLoginAt: toIsoString(row.last_login_at),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function toIsoString(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
