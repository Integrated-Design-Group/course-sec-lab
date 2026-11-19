/**
 * 业务条目控制器（M1）
 * 读接口对所有访问者开放（mine=true 需要登录）；
 * 写接口要求登录，权限与状态规则在 services 层。
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import {
  createBusinessItem,
  deleteBusinessItem,
  getBusinessItemById,
  listBusinessItems,
  updateBusinessItem,
} from '../services/business.service.js';
import { parsePositiveIntParam } from '../utils/ids.js';

export const getItems = asyncHandler(async (req, res) => {
  const { page, pageSize, status, keyword, mine } = req.validated.query;
  const { items, pagination } = await listBusinessItems({
    page,
    pageSize,
    status,
    keyword,
    mine: mine === true,
    actor: req.user ?? null,
  });

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

export const createItem = asyncHandler(async (req, res) => {
  const item = await createBusinessItem({
    input: req.validated.body,
    actor: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { status: 201, message: '创建成功', data: { item } });
});

export const updateItem = asyncHandler(async (req, res) => {
  const id = parsePositiveIntParam(req.params.id);
  const item = await updateBusinessItem({
    id,
    input: req.validated.body,
    actor: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { message: '更新成功', data: { item } });
});

export const deleteItem = asyncHandler(async (req, res) => {
  const id = parsePositiveIntParam(req.params.id);
  const result = await deleteBusinessItem({
    id,
    actor: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, { message: '已删除', data: result });
});
