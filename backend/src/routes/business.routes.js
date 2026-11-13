/**
 * 业务条目路由
 * 框架阶段：GET 可用，POST/PATCH/DELETE 为 501 占位。
 */
import { Router } from 'express';
import {
  createItem,
  deleteItem,
  getItemDetail,
  getItems,
  updateItem,
} from '../controllers/business.controller.js';
import { validateQuery } from '../middlewares/validate.js';
import { listItemsQuerySchema } from '../models/business-item.model.js';
import { authenticate } from '../middlewares/auth.js';

export const businessRouter = Router();

businessRouter.get('/business-items', validateQuery(listItemsQuerySchema), getItems);
businessRouter.get('/business-items/:id', getItemDetail);

businessRouter.post('/business-items', authenticate, createItem);
businessRouter.patch('/business-items/:id', authenticate, updateItem);
businessRouter.delete('/business-items/:id', authenticate, deleteItem);
