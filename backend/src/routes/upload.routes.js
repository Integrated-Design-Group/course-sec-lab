/**
 * 上传路由
 * POST /uploads     上传（需登录）
 * GET  /uploads/:id 受控鉴权读取（需登录；授权规则见 upload.service）
 */
import { Router } from 'express';
import { getUpload, postUpload } from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadSingleFile } from '../middlewares/upload.js';

export const uploadRouter = Router();

uploadRouter.post('/uploads', authenticate, uploadSingleFile, postUpload);
uploadRouter.get('/uploads/:id', authenticate, getUpload);
