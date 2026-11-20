/**
 * 上传中间件（multer）
 * ---------------------------------------------------------------------------
 * 第一道防线：声明类型白名单 + 扩展名一致性 + 大小/数量限制
 * 第二道防线在 services/upload.service.js：读取真实文件头再校验
 * 文件落盘名由服务端生成（时间戳 + UUID），不使用用户文件名，避免路径穿越。
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

fs.mkdirSync(config.upload.dir, { recursive: true });

const ALLOWED_EXTENSIONS = new Map([
  ['image/png', ['.png']],
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/webp', ['.webp']],
]);

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, config.upload.dir);
  },
  filename: (req, file, callback) => {
    // ──【刻意漏洞 VULN-04】保留原始文件名（basename 防真实路径穿越）──
    if (config.vuln.mode === 'VULN-04') {
      const original = path.basename(String(file.originalname || 'upload'));
      return callback(null, original);
    }
    const extension = ALLOWED_EXTENSIONS.get(file.mimetype)?.[0] ?? '.bin';
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

function fileFilter(req, file, callback) {
  // ──【刻意漏洞 VULN-04】不安全文件上传：跳过类型/扩展名白名单 ──
  if (config.vuln.mode === 'VULN-04') {
    return callback(null, true);
  }

  if (!config.upload.allowedMime.includes(file.mimetype)) {
    return callback(
      new AppError('UNSUPPORTED_MEDIA_TYPE', `仅支持以下图片类型：${config.upload.allowedMime.join(', ')}`),
    );
  }

  const extension = path.extname(file.originalname || '').toLowerCase();
  const allowedExtensions = ALLOWED_EXTENSIONS.get(file.mimetype) ?? [];
  if (!allowedExtensions.includes(extension)) {
    return callback(new AppError('UNSUPPORTED_MEDIA_TYPE', '文件扩展名与声明的 Content-Type 不匹配'));
  }

  return callback(null, true);
}

export const uploadSingleFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxBytes,
    files: 1,
    fields: 10,
  },
}).single('file');
