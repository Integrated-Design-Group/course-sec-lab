/**
 * 上传服务
 * ---------------------------------------------------------------------------
 * 安全基线：
 *   - 落盘名由服务端生成（时间戳 + UUID），不使用用户文件名
 *   - 声明类型白名单 + 扩展名一致 + 文件头 magic bytes 复核
 *   - 上传目录不在 Web 根目录；不返回可公开访问的 URL
 *   - 读取走受控鉴权接口：本人/管理员，或该文件正被某条未删除条目用作封面
 *   - 封面被替换/条目被删除后，若已无引用则归档元数据并删除文件本体
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/index.js';
import { repositories } from '../repositories/index.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
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

/** 只允许访问 UPLOAD_DIR 内部的路径，防止数据库被篡改后造成任意文件读取 */
function resolveStoredPath(storagePath) {
  const root = path.resolve(config.upload.dir);
  const absolutePath = path.resolve(root, String(storagePath || ''));
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new AppError('NOT_FOUND', '文件路径非法');
  }
  return absolutePath;
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
    let mimeType;
    if (config.vuln.mode === 'VULN-04') {
      // ──【刻意漏洞 VULN-04】不安全文件上传：跳过 magic bytes 与类型一致性校验 ──
      mimeType = file.mimetype || 'application/octet-stream';
    } else {
      const detected = detectMimeType(await readHeader(absolutePath, 12));
      const allowed = config.upload.allowedMime;

      if (!detected || !allowed.includes(detected)) {
        throw new AppError('UNSUPPORTED_MEDIA_TYPE', `仅支持以下图片类型：${allowed.join(', ')}`);
      }
      if (detected !== file.mimetype) {
        throw new AppError('UNSUPPORTED_MEDIA_TYPE', '文件内容与声明的 Content-Type 不一致');
      }

      const expectedExtension = extensionForMime(detected);
      if (!path.basename(absolutePath).endsWith(expectedExtension)) {
        throw new AppError('UNSUPPORTED_MEDIA_TYPE', '落盘文件名与检测到的文件类型不一致');
      }
      mimeType = detected;
    }

    const storedName = path.basename(absolutePath);
    const content = await fs.readFile(absolutePath);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const now = new Date();

    const created = await repositories.uploadedFiles.create({
      owner_id: Number(user.id),
      original_name: sanitizeOriginalName(file.originalname),
      stored_name: storedName,
      mime_type: mimeType,
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
      detail: { mimeType: mimeType, sizeBytes: content.length },
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

/**
 * 受控读取：返回文件元数据与磁盘路径，由控制器以流的方式输出。
 * 授权规则：本人 / 管理员 / 该文件正被某条未删除的业务条目用作封面。
 * @param {{ fileId: number, user: { id: number, role: string } }} params
 */
export async function readUploadForUser({ fileId, user }) {
  const file = await repositories.uploadedFiles.findById(fileId);
  if (!file) throw new AppError('NOT_FOUND', `文件不存在：${fileId}`);

  const isOwner = Number(file.owner_id) === Number(user.id);
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    if (file.status !== UPLOAD_STATUS.ACTIVE) {
      throw new AppError('NOT_FOUND', `文件不存在：${fileId}`);
    }
    const referenced = await repositories.businessItems.countByCoverFileId(fileId);
    if (referenced === 0) {
      throw new AppError('FORBIDDEN', '无权访问该文件');
    }
  }

  if (!config.upload.allowedMime.includes(file.mime_type)) {
    throw new AppError('INTERNAL_ERROR', '文件元数据类型异常');
  }

  const absolutePath = resolveStoredPath(file.storage_path);
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    throw new AppError('NOT_FOUND', '文件内容不存在');
  }
  if (!stat.isFile()) throw new AppError('NOT_FOUND', '文件内容不存在');

  return { file, absolutePath, size: stat.size };
}

/**
 * 归档“孤儿封面”：仅当没有任何未删除条目引用时执行。
 * 元数据置为 archived（保留取证信息），文件本体删除。
 * @param {number} fileId
 */
export async function archiveOrphanedFile(fileId) {
  const id = Number(fileId);
  if (!Number.isSafeInteger(id) || id < 1) return null;

  const file = await repositories.uploadedFiles.findById(id);
  if (!file || file.status === UPLOAD_STATUS.ARCHIVED) return null;

  const referenced = await repositories.businessItems.countByCoverFileId(id);
  if (referenced > 0) return null;

  await repositories.uploadedFiles.updateStatus(id, UPLOAD_STATUS.ARCHIVED, new Date());

  try {
    await fs.unlink(resolveStoredPath(file.storage_path));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('归档孤儿封面时删除文件失败', { fileId: id, errorMessage: error.message });
    }
  }

  return id;
}
