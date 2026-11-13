/**
 * 认证路由
 */
import { Router } from 'express';
import { getMe, postLogin, postLogout } from '../controllers/auth.controller.js';
import { validateBody } from '../middlewares/validate.js';
import { loginSchema } from '../models/user.model.js';
import { authenticate } from '../middlewares/auth.js';

export const authRouter = Router();

authRouter.post('/auth/login', validateBody(loginSchema), postLogin);
authRouter.post('/auth/logout', authenticate, postLogout);
authRouter.get('/auth/me', authenticate, getMe);
