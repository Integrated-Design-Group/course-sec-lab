/**
 * 上传控制器
 * POST /api/v1/uploads（multipart/form-data，字段名 file）
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess } from '../utils/response.js';
import { registerUpload } from '../services/upload.service.js';

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
