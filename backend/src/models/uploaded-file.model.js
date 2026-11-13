/**
 * uploaded_files 模型
 * ---------------------------------------------------------------------------
 * 只记录元数据，文件内容落在 UPLOAD_DIR（不进数据库、不进 Web 根目录）。
 * 框架阶段不提供“公开下载”接口，避免形成任意文件读取入口。
 */
import { toIsoString } from './user.model.js';

export const UPLOAD_STATUS = Object.freeze({
  ACTIVE: 'active',
  ARCHIVED: 'archived',
});

export function toPublicFile(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes),
    sha256: row.sha256,
    status: row.status,
    ownerId: Number(row.owner_id),
    createdAt: toIsoString(row.created_at),
  };
}
