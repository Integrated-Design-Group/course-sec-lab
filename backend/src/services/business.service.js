/**
 * 业务条目服务（M1）
 * ---------------------------------------------------------------------------
 * 规则集中在这里，控制器只做入参→服务→响应：
 *  - 写操作必须登录；只能操作自己的条目，管理员可代为操作
 *  - 新建条目初始状态固定为 draft
 *  - 状态流转必须符合 ITEM_STATUS_TRANSITIONS，否则 409
 *  - 支持 expectedUpdatedAt 乐观并发控制，避免覆盖他人修改
 *  - 封面文件必须是本人（或管理员）上传的 active 文件；替换/删除后归档孤儿封面
 *  - 所有写操作写审计日志（不含密码/token）
 */
import { repositories } from '../repositories/index.js';
import { config } from '../config/index.js';
import {
  ITEM_STATUS,
  ITEM_STATUS_TRANSITIONS,
  toPublicItem,
} from '../models/business-item.model.js';
import { toIsoString } from '../models/user.model.js';
import { buildPaginationMeta } from '../utils/pagination.js';
import { AppError } from '../utils/errors.js';
import { recordAudit } from './audit.service.js';
import { archiveOrphanedFile } from './upload.service.js';

function isAdmin(actor) {
  return actor?.role === 'admin';
}

// ──【刻意漏洞 VULN-02 的安全侧】存储型 XSS 防护 ──
// 安全基线：把描述中的 HTML 特殊字符转义；VULN_MODE=VULN-02 时跳过转义（刻意保留原始 HTML）。
function escapeHtmlForDescription(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeDescription(description) {
  if (description == null || description === '') return description;
  if (config.vuln.mode === 'VULN-02') return description;
  return escapeHtmlForDescription(description);
}

function assertCanOperate(actor, row) {
  if (!actor) throw new AppError('UNAUTHORIZED');
  if (isAdmin(actor)) return;
  if (Number(row.owner_id) !== Number(actor.id)) {
    throw new AppError('FORBIDDEN', '只能操作自己发布的条目');
  }
}

async function assertCoverUsable(coverFileId, actor) {
  const file = await repositories.uploadedFiles.findById(coverFileId);
  if (!file) {
    throw new AppError('VALIDATION_ERROR', '封面文件不存在', [
      { field: 'coverFileId', message: '封面文件不存在或已被删除' },
    ]);
  }
  if (file.status !== 'active') {
    throw new AppError('VALIDATION_ERROR', '封面文件已归档，不能再次引用', [
      { field: 'coverFileId', message: '封面文件已归档' },
    ]);
  }
  if (!isAdmin(actor) && Number(file.owner_id) !== Number(actor.id)) {
    throw new AppError('FORBIDDEN', '只能使用自己上传的文件作为封面');
  }
  return file;
}

/**
 * @param {{ page: number, pageSize: number, status?: string, keyword?: string, mine?: boolean, actor?: object|null }} params
 */
export async function listBusinessItems({ page, pageSize, status, keyword, mine, actor }) {
  if (mine && !actor) {
    throw new AppError('UNAUTHORIZED', '“我的条目”需要登录后查看');
  }

  const { rows, total } = await repositories.businessItems.list({
    page,
    pageSize,
    status,
    keyword,
    ownerId: mine ? Number(actor.id) : undefined,
  });

  return {
    items: rows.map(toPublicItem),
    pagination: buildPaginationMeta({ page, pageSize, total }),
  };
}

export async function getBusinessItemById(id) {
  const row = await repositories.businessItems.findById(id);
  if (!row) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);
  return toPublicItem(row);
}

export async function createBusinessItem({ input, actor, ip, userAgent }) {
  if (input.coverFileId) {
    await assertCoverUsable(input.coverFileId, actor);
  }

  const now = new Date();
  const created = await repositories.businessItems.create({
    owner_id: Number(actor.id),
    title: input.title,
    author: input.author,
    category: input.category,
    condition_level: input.conditionLevel,
    price: input.price,
    description: sanitizeDescription(input.description ? input.description : null),
    status: ITEM_STATUS.DRAFT,
    cover_file_id: input.coverFileId ?? null,
    created_at: now,
    updated_at: now,
  });

  await recordAudit({
    actorId: actor.id,
    action: 'business_item.create',
    resourceType: 'business_item',
    resourceId: created.id,
    result: 'success',
    ip,
    userAgent,
    detail: { status: ITEM_STATUS.DRAFT, coverFileId: input.coverFileId ?? null },
  });

  const row = await repositories.businessItems.findById(created.id);
  return toPublicItem(row);
}

export async function updateBusinessItem({ id, input, actor, ip, userAgent }) {
  const row = await repositories.businessItems.findById(id);
  if (!row) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);
  assertCanOperate(actor, row);

  if (input.expectedUpdatedAt !== undefined) {
    const current = toIsoString(row.updated_at);
    const expected = new Date(input.expectedUpdatedAt);
    if (Number.isNaN(expected.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'expectedUpdatedAt 必须是合法时间', [
        { field: 'expectedUpdatedAt', message: '必须是合法时间' },
      ]);
    }
    if (expected.toISOString() !== current) {
      throw new AppError('CONFLICT', '条目已被他人修改，请刷新后重试', {
        currentUpdatedAt: current,
      });
    }
  }

  if (input.status !== undefined && input.status !== row.status) {
    const allowed = ITEM_STATUS_TRANSITIONS[row.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw new AppError(
        'CONFLICT',
        `不允许从 ${row.status} 流转到 ${input.status}`,
        { from: row.status, to: input.status, allowed },
      );
    }
  }

  if (input.coverFileId !== undefined && input.coverFileId !== null) {
    await assertCoverUsable(input.coverFileId, actor);
  }

  const now = new Date();
  const columns = { updated_at: now };
  const changedFields = [];

  if (input.title !== undefined) {
    columns.title = input.title;
    changedFields.push('title');
  }
  if (input.author !== undefined) {
    columns.author = input.author;
    changedFields.push('author');
  }
  if (input.category !== undefined) {
    columns.category = input.category;
    changedFields.push('category');
  }
  if (input.conditionLevel !== undefined) {
    columns.condition_level = input.conditionLevel;
    changedFields.push('conditionLevel');
  }
  if (input.price !== undefined) {
    columns.price = input.price;
    changedFields.push('price');
  }
  if (input.description !== undefined) {
    columns.description = sanitizeDescription(input.description === '' ? null : input.description);
    changedFields.push('description');
  }
  if (input.status !== undefined) {
    columns.status = input.status;
    changedFields.push('status');
  }
  if (input.coverFileId !== undefined) {
    columns.cover_file_id = input.coverFileId;
    changedFields.push('coverFileId');
  }

  const affected = await repositories.businessItems.update(id, columns);
  if (affected === 0) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);

  const previousCoverId = row.cover_file_id === null || row.cover_file_id === undefined ? null : Number(row.cover_file_id);
  const nextCoverId = input.coverFileId !== undefined ? input.coverFileId : previousCoverId;
  if (previousCoverId !== null && previousCoverId !== nextCoverId) {
    await archiveOrphanedFile(previousCoverId);
  }

  await recordAudit({
    actorId: actor.id,
    action: 'business_item.update',
    resourceType: 'business_item',
    resourceId: id,
    result: 'success',
    ip,
    userAgent,
    detail: { changedFields },
  });

  const fresh = await repositories.businessItems.findById(id);
  return toPublicItem(fresh);
}

export async function deleteBusinessItem({ id, actor, ip, userAgent }) {
  const row = await repositories.businessItems.findById(id);
  if (!row) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);
  assertCanOperate(actor, row);

  const now = new Date();
  const affected = await repositories.businessItems.softDelete(id, now);
  if (affected === 0) throw new AppError('NOT_FOUND', `业务条目不存在：${id}`);

  if (row.cover_file_id !== null && row.cover_file_id !== undefined) {
    await archiveOrphanedFile(Number(row.cover_file_id));
  }

  await recordAudit({
    actorId: actor.id,
    action: 'business_item.delete',
    resourceType: 'business_item',
    resourceId: id,
    result: 'success',
    ip,
    userAgent,
    detail: { softDelete: true },
  });

  return { id: Number(id) };
}
