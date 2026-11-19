/**
 * 上传控制器
 * POST /api/v1/uploads    上传（multipart/form-data，字段名 file）
 * GET  /api/v1/uploads/:id 受控鉴权读取（本人 / 管理员 / 条目封面）
 */
import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import { readUploadForUser, registerUpload } from '../services/upload.service.js';
import { parsePositiveIntParam } from '../utils/ids.js';

export const postUpload = asyncHandler(async (req, res) => {
  const file = await registerUpload({
    file: req.file,
    user: req.user,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  return sendSuccess(res, {
    status: 201,
    message: '上传成功',
    data: { file },
  });
});

export const getUpload = asyncHandler(async (req, res, next) => {
  const fileId = parsePositiveIntParam(req.params.id, 'fileId');
  const { file, absolutePath, size } = await readUploadForUser({ fileId, user: req.user });

  const extension = path.extname(file.stored_name).replace(/[^a-zA-Z0-9.]/g, '');

  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Length', String(size));
  res.setHeader('Content-Disposition', `inline; filename="file-${file.id}${extension}"`);
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = fs.createReadStream(absolutePath);
  stream.on('error', next);
  stream.pipe(res);
  return undefined;
});
