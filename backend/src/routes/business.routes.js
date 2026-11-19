/**
 * 业务条目路由（M1）
 * 读接口：游客可用；mine=true 由 optionalAuthenticate 识别登录态后要求登录。
 * 写接口：必须登录，权限与状态机在 service 层强制执行。
 */
import { Router } from 'express';
import {
  createItem,
  deleteItem,
  getItemDetail,
  getItems,
  updateItem,
} from '../controllers/business.controller.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import {
  createItemSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from '../models/business-item.model.js';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.js';

export const businessRouter = Router();

businessRouter.get(
  '/business-items',
  optionalAuthenticate,
  validateQuery(listItemsQuerySchema),
  getItems,
);
businessRouter.get('/business-items/:id', getItemDetail);

businessRouter.post('/business-items', authenticate, validateBody(createItemSchema), createItem);
businessRouter.patch('/business-items/:id', authenticate, validateBody(updateItemSchema), updateItem);
businessRouter.delete('/business-items/:id', authenticate, deleteItem);
