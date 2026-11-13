/**
 * 健康检查路由
 */
import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

export const healthRouter = Router();

healthRouter.get('/health', getHealth);
