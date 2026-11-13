/**
 * 上传服务（仅实现“安全的上传基线”，不实现任何上传漏洞）
 * ---------------------------------------------------------------------------
 * 流程：multer 落盘 → 读取文件头校验真实类型 → 计算 sha256 → 写元数据 → 审计
 * 失败时删除临时文件，避免残留。
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { repositories } from '../repositories/index.js';
import { AppError } from '../utils/errors.js';
import { detectMimeType, extensionForMime } from '../utils/file-signature.js';
import { UPLOAD_STATUS, toPublicFile } from '../models/uploaded-file.model.js';
import { recordAudit } from './audit.service.js';

async function readHeader(filePath, bytes) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function removeQuietly(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {
    // 文件可能已不存在；不影响主流程
  }
}

function sanitizeOriginalName(name) {
  const base = path.basename(String(name || 'upload'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 255);
  return base.length > 0 ? base : 'upload';
}

/**
 * @param {{ file: Express.Multer.File, user: { id: number }, ip?: string, userAgent?: string }} params
 * @returns {Promise<object>} 对外文件对象
 */
export async function registerUpload({ file, user, ip, userAgent }) {
  if (!file) {
    throw new AppError('VALIDATION_ERROR', '缺少上传文件（字段名必须为 file）', [
      { field: 'file', message: 'file 为必填项' },
    ]);
  }

  const absolutePath = file.path;

  try {
    const detected = detectMimeType(await readHeader(absolutePath, 12));
    const allowed = config.upload.allowedMime;

    if (!detected || !allowed.includes(detected)) {
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', `仅支持以下图片类型：${allowed.join(', ')}`);
    }
    if (detected !== file.mimetype) {
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', '文件内容与声明的 Content-Type 不一致');
    }

    const storedName = path.basename(absolutePath);
    const expectedExtension = extensionForMime(detected);
    if (!storedName.endsWith(expectedExtension)) {
      throw new AppError('UNSUPPORTED_MEDIA_TYPE', '落盘文件名与检测到的文件类型不一致');
    }

    const content = await fs.readFile(absolutePath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const now = new Date();

    const created = await repositories.uploadedFiles.create({
      owner_id: Number(user.id),
      original_name: sanitizeOriginalName(file.originalname),
      stored_name: storedName,
      mime_type: detected,
      size_bytes: content.length,
      sha256,
      storage_path: storedName,
      status: UPLOAD_STATUS.ACTIVE,
      created_at: now,
      updated_at: now,
    });

    await recordAudit({
      actorId: user.id,
      action: 'upload.create',
      resourceType: 'uploaded_file',
      resourceId: created.id,
      result: 'success',
      ip,
      userAgent,
      detail: { mimeType: detected, sizeBytes: content.length },
    });

    return toPublicFile(created);
  } catch (error) {
    await removeQuietly(absolutePath);
    if (error instanceof AppError) {
      await recordAudit({
        actorId: user.id,
        action: 'upload.create',
        resourceType: 'uploaded_file',
        result: 'failure',
        ip,
        userAgent,
        detail: { reason: error.code },
      });
    }
    throw error;
  }
}
