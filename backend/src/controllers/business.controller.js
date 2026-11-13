/**
 * 业务条目控制器
 * ---------------------------------------------------------------------------
 * 读接口可用（列表/详情）；写接口在框架阶段统一返回 501，
 * 由后续 Issue 实现并以“登录 + 归属校验 + 角色校验”为前提。
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import { getBusinessItemById, listBusinessItems } from '../services/business.service.js';
import { parsePositiveIntParam } from '../utils/ids.js';
import { notImplemented } from '../utils/errors.js';

export const getItems = asyncHandler(async (req, res) => {
  const { page, pageSize, status, keyword } = req.validated.query;
  const { items, pagination } = await listBusinessItems({ page, pageSize, status, keyword });

  return sendSuccess(res, {
    message: 'OK',
    data: { items },
    meta: { pagination },
  });
});

export const getItemDetail = asyncHandler(async (req, res) => {
  const id = parsePositiveIntParam(req.params.id);
  const item = await getBusinessItemById(id);
  return sendSuccess(res, { message: 'OK', data: { item } });
});

/* ---------- 以下为框架阶段占位：契约已定，实现留给后续 Issue ---------- */

export const createItem = asyncHandler(async () => {
  throw notImplemented('新增业务条目（POST /business-items）');
});

export const updateItem = asyncHandler(async () => {
  throw notImplemented('编辑业务条目（PATCH /business-items/:id）');
});

export const deleteItem = asyncHandler(async () => {
  throw notImplemented('删除业务条目（DELETE /business-items/:id）');
});
