/**
 * 业务条目服务（框架阶段）
 * ---------------------------------------------------------------------------
 * 只实现列表与详情读取；新增/编辑/删除由后续 Issue 完成，
 * 当前统一返回 501 NOT_IMPLEMENTED，避免“看起来能用但没做权限校验”的半成品。
 */
import { repositories } from '../repositories/index.js';
import { toPublicItem } from '../models/business-item.model.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../utils/errors.js';

export async function listBusinessItems({ page, pageSize, status, keyword }) {
  const { rows, total } = await repositories.businessItems.list({ page, pageSize, status, keyword });
  return {
    items: rows.map(toPublicItem),
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}

export async function getBusinessItemById(id) {
  const row = await repositories.businessItems.findById(id);
  if (!row) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);
  return toPublicItem(row);
}
