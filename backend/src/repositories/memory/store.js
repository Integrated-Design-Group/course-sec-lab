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
  {
    id: 4,
    owner_id: 2,
    title: '线性代数（第六版）',
    author: '同济大学数学系',
    category: 'textbook',
    condition_level: 'good',
    price: '22.00',
    description: 'M1 演示数据：书角轻微磨损，内页干净，可正常使用。',
    status: 'published',
    cover_file_id: null,
    created_at: '2026-03-05T02:00:00.000Z',
    updated_at: '2026-03-05T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 5,
    owner_id: 1,
    title: '操作系统概念（第九版）',
    author: 'Abraham Silberschatz',
    category: 'textbook',
    condition_level: 'new',
    price: '68.00',
    description: 'M1 演示数据：管理员发布的教材，用于验证不同所有者过滤。',
    status: 'published',
    cover_file_id: null,
    created_at: '2026-03-06T02:00:00.000Z',
    updated_at: '2026-03-06T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 6,
    owner_id: 2,
    title: '离散数学及其应用（第八版）',
    author: 'Kenneth H. Rosen',
    category: 'textbook',
    condition_level: 'fair',
    price: '35.00',
    description: 'M1 演示数据：已有人预订，用于验证 reserved 状态展示。',
    status: 'reserved',
    cover_file_id: null,
    created_at: '2026-03-07T02:00:00.000Z',
    updated_at: '2026-03-07T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 7,
    owner_id: 2,
    title: '大学英语四级真题解析',
    author: '课程组整理',
    category: 'notes',
    condition_level: 'good',
    price: '9.90',
    description: 'M1 演示数据：已售出条目，用于验证 sold 状态展示。',
    status: 'sold',
    cover_file_id: null,
    created_at: '2026-03-08T02:00:00.000Z',
    updated_at: '2026-03-08T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 8,
    owner_id: 1,
    title: '网络安全课程实验指导（旧版）',
    author: '实验室整理',
    category: 'other',
    condition_level: 'fair',
    price: '5.00',
    description: 'M1 演示数据：已归档条目，用于验证 archived 状态展示。',
    status: 'archived',
    cover_file_id: null,
    created_at: '2026-03-09T02:00:00.000Z',
    updated_at: '2026-03-09T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 9,
    owner_id: 2,
    title: '概率论与数理统计笔记',
    author: '本组组员整理',
    category: 'notes',
    condition_level: 'good',
    price: '15.00',
    description: 'M1 演示数据：草稿条目，仅本人可在“我的条目”中查看并编辑。',
    status: 'draft',
    cover_file_id: null,
    created_at: '2026-03-10T02:00:00.000Z',
    updated_at: '2026-03-10T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 10,
    owner_id: 1,
    title: '二手计算器（非教材类示例）',
    author: '管理员发布',
    category: 'other',
    condition_level: 'good',
    price: '39.00',
    description: 'M1 演示数据：other 分类，用于验证分类与分页组合。',
    status: 'published',
    cover_file_id: null,
    created_at: '2026-03-11T02:00:00.000Z',
    updated_at: '2026-03-11T02:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 11,
    owner_id: 1,
    title: '计算机网络实验报告模板',
    author: '课程组整理',
    category: 'notes',
    condition_level: 'new',
    price: '6.50',
    description: 'M1 演示数据：已售出笔记，用于验证多状态混合分页。',
    status: 'sold',
    cover_file_id: null,
    created_at: '2026-03-12T02:00:00.000Z',
    updated_at: '2026-03-12T02:00:00.000Z',
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
