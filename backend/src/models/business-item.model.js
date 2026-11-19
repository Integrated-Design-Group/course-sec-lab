/**
 * business_items 模型（业务条目：二手教材条目）
 * ---------------------------------------------------------------------------
 * 读接口对所有访问者开放；写接口要求登录，并在服务层强制“本人或管理员”。
 * 状态流转规则集中在 ITEM_STATUS_TRANSITIONS，避免控制器/前端各自实现一套。
 */
import { validateObject } from '../utils/validation.js';
import { toIsoString } from './user.model.js';

export const ITEM_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  RESERVED: 'reserved',
  SOLD: 'sold',
  ARCHIVED: 'archived',
});

export const ITEM_CATEGORY = Object.freeze({
  TEXTBOOK: 'textbook',
  NOTES: 'notes',
  OTHER: 'other',
});

export const ITEM_CONDITION = Object.freeze({
  NEW: 'new',
  GOOD: 'good',
  FAIR: 'fair',
});

export const ITEM_STATUS_VALUES = Object.freeze(Object.values(ITEM_STATUS));

/**
 * 允许的状态流转（发起者：条目所有者或管理员；管理员同样受状态机约束）。
 * 设计意图：
 *  - draft 可发布或归档
 *  - published 可下架回草稿、被预订、售出或归档
 *  - reserved 可回到 published（取消预订）、售出或归档
 *  - sold 只能归档（保留成交记录）
 *  - archived 可重新回到 draft 重新整理
 */
export const ITEM_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['published', 'archived']),
  published: Object.freeze(['draft', 'reserved', 'sold', 'archived']),
  reserved: Object.freeze(['published', 'sold', 'archived']),
  sold: Object.freeze(['archived']),
  archived: Object.freeze(['draft']),
});

export const listItemsQuerySchema = {
  page: { type: 'int', min: 1, max: 10000, default: 1 },
  pageSize: { type: 'int', min: 1, max: 50, default: 10 },
  status: {
    type: 'enum',
    enum: ITEM_STATUS_VALUES,
  },
  keyword: { type: 'string', min: 1, max: 60 },
  // 仅返回当前登录用户自己的条目；需要登录，未登录时服务层返回 UNAUTHORIZED
  mine: { type: 'boolean' },
};

export const createItemSchema = {
  title: { required: true, type: 'string', min: 1, max: 120 },
  author: { required: true, type: 'string', min: 1, max: 64 },
  category: { type: 'enum', enum: Object.values(ITEM_CATEGORY), default: ITEM_CATEGORY.TEXTBOOK },
  conditionLevel: { type: 'enum', enum: Object.values(ITEM_CONDITION), default: ITEM_CONDITION.GOOD },
  price: { required: true, type: 'number', min: 0, max: 999999.99, maxDecimals: 2 },
  description: { type: 'string', max: 4000, allowEmpty: true },
  coverFileId: { type: 'int', min: 1 },
};

export const updateItemSchema = {
  title: { type: 'string', min: 1, max: 120 },
  author: { type: 'string', min: 1, max: 64 },
  category: { type: 'enum', enum: Object.values(ITEM_CATEGORY) },
  conditionLevel: { type: 'enum', enum: Object.values(ITEM_CONDITION) },
  price: { type: 'number', min: 0, max: 999999.99, maxDecimals: 2 },
  description: { type: 'string', max: 4000, allowEmpty: true },
  coverFileId: { type: 'int', min: 1, nullable: true },
  status: { type: 'enum', enum: ITEM_STATUS_VALUES },
  // 乐观并发控制：请求携带读取时的 updatedAt，不匹配返回 409 CONFLICT
  expectedUpdatedAt: { type: 'string', max: 40 },
};

export function validateListItemsQuery(query) {
  return validateObject(query, listItemsQuerySchema);
}

export function toPublicItem(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    author: row.author,
    category: row.category,
    conditionLevel: row.condition_level,
    price: Number(row.price),
    status: row.status,
    description: row.description ?? null,
    coverFileId: row.cover_file_id === null || row.cover_file_id === undefined ? null : Number(row.cover_file_id),
    owner: {
      id: Number(row.owner_id),
      displayName: row.owner_display_name ?? null,
    },
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}
