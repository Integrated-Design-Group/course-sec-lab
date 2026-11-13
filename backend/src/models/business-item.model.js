/**
 * business_items 模型（业务条目：二手教材条目）
 * ---------------------------------------------------------------------------
 * 框架阶段只读：列表与详情可查，写操作返回 501（见 docs/03-api.md）。
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

export const listItemsQuerySchema = {
  page: { type: 'int', min: 1, max: 10000, default: 1 },
  pageSize: { type: 'int', min: 1, max: 50, default: 10 },
  status: {
    type: 'enum',
    enum: Object.values(ITEM_STATUS),
  },
  keyword: { type: 'string', min: 1, max: 60 },
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
