/**
 * 上传路由
 */
import { Router } from 'express';
import { postUpload } from '../controllers/upload.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadSingleFile } from '../middlewares/upload.js';

export const uploadRouter = Router();

uploadRouter.post('/uploads', authenticate, uploadSingleFile, postUpload);
