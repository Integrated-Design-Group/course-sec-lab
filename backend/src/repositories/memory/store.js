/**
 * 内存数据源（仅框架阶段本地演示 / 自动化冒烟）
 * ---------------------------------------------------------------------------
 * 目的：让“克隆仓库 → 无 MySQL 也能跑通健康检查 + 最小登录闭环”。
 * 约束：
 *  - 数据不持久化、并发不安全，正式部署必须 DB_DRIVER=mysql
 *  - 行结构与 MySQL 表保持一致（snake_case），便于复用同一套序列化与测试
 *  - 演示账号哈希与 db/seeds/001_seed_base.sql 保持一致
 */
import { DEMO_ACCOUNTS } from '../../config/demo-accounts.js';

const CREATED_AT = '2026-03-01T00:00:00.000Z';

export const roles = [
  { id: 1, code: 'admin', name: '管理员', description: '可管理全部业务条目与系统配置', created_at: CREATED_AT },
  { id: 2, code: 'student', name: '学生', description: '可发布与维护自己的教材条目', created_at: CREATED_AT },
];

export const users = DEMO_ACCOUNTS.map((account) => ({
  id: account.id,
  username: account.username,
  email: account.email,
  password_hash: account.passwordHash,
  display_name: account.displayName,
  role_id: account.roleCode === 'admin' ? 1 : 2,
  status: 'active',
  last_login_at: null,
  created_at: CREATED_AT,
  updated_at: CREATED_AT,
  deleted_at: null,
}));

export const businessItems = [
  {
    id: 1,
    owner_id: 2,
    title: '高等数学（第七版）上册',
    author: '同济大学数学系',
    category: 'textbook',
    condition_level: 'good',
    price: '25.00',
    description: '框架阶段演示数据：少量笔记，无缺页。',
    status: 'published',
    cover_file_id: null,
    created_at: '2026-03-02T02:00:00.000Z',
    updated_at: '2026-03-02T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 2,
    owner_id: 2,
    title: '计算机网络：自顶向下方法（第 8 版）',
    author: 'James F. Kurose',
    category: 'textbook',
    condition_level: 'good',
    price: '45.50',
    description: '框架阶段演示数据：含课后习题答案缩印页。',
    status: 'published',
    cover_file_id: null,
    created_at: '2026-03-03T02:00:00.000Z',
    updated_at: '2026-03-03T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 3,
    owner_id: 2,
    title: '数据结构课程笔记（手写扫描版）',
    author: '本组组员整理',
    category: 'notes',
    condition_level: 'fair',
    price: '12.00',
    description: '框架阶段演示数据：用于验证 keyword / status 过滤。',
    status: 'draft',
    cover_file_id: null,
    created_at: '2026-03-04T02:00:00.000Z',
    updated_at: '2026-03-04T02:00:00.000Z',
    deleted_at: null,
  },
];

export const uploadedFiles = [];
export const auditLogs = [];

const sequences = {
  users: DEMO_ACCOUNTS.length + 1,
  business_items: businessItems.length + 1,
  uploaded_files: 1,
  audit_logs: 1,
};

export function nextId(table) {
  const current = sequences[table] ?? 1;
  sequences[table] = current + 1;
  return current;
}
