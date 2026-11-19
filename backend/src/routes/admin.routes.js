/**
 * 管理端路由（A-07）
 * 全部端点要求管理员角色；前端隐藏入口只是体验优化。
 */
import { Router } from 'express';
import { getAuditLogs, getUsers, patchUserStatus } from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validateBody, validateQuery } from '../middlewares/validate.js';
import { listAuditLogsQuerySchema } from '../models/audit-log.model.js';
import { listUsersQuerySchema, updateUserStatusSchema } from '../models/user.model.js';

export const adminRouter = Router();

adminRouter.use('/admin', authenticate, requireRole('admin'));

adminRouter.get('/admin/users', validateQuery(listUsersQuerySchema), getUsers);
adminRouter.patch('/admin/users/:id/status', validateBody(updateUserStatusSchema), patchUserStatus);
adminRouter.get('/admin/audit-logs', validateQuery(listAuditLogsQuerySchema), getAuditLogs);
