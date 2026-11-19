/**
 * business_items 仓储（MySQL）
 * ---------------------------------------------------------------------------
 * 只做数据访问：参数化 SQL、字段映射；权限判断与状态机在 services 层。
 * 列表固定按 created_at DESC, id DESC 排序，保证分页稳定。
 */
import { getPool } from '../../db/pool.js';
import { toOffset } from '../../utils/pagination.js';

const ITEM_SELECT = `
  SELECT
    i.id, i.owner_id, i.title, i.author, i.category, i.condition_level, i.price,
    i.description, i.status, i.cover_file_id, i.created_at, i.updated_at,
    u.display_name AS owner_display_name
  FROM business_items i
  JOIN users u ON u.id = i.owner_id
`;

/** 允许通过 update() 修改的列（白名单，防止动态 SQL 注入列名） */
const UPDATABLE_COLUMNS = new Set([
  'title',
  'author',
  'category',
  'condition_level',
  'price',
  'description',
  'status',
  'cover_file_id',
  'updated_at',
]);

/**
 * @param {{ page: number, pageSize: number, status?: string, keyword?: string, ownerId?: number }} params
 */
export async function list({ page, pageSize, status, keyword, ownerId }) {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];

  if (ownerId) {
    conditions.push('i.owner_id = ?');
    params.push(ownerId);
  }
  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (keyword) {
    conditions.push('(i.title LIKE ? OR i.author LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const whereSql = conditions.join(' AND ');
  const [countRows] = await getPool().query(
    `SELECT COUNT(*) AS total FROM business_items i WHERE ${whereSql}`,
    params,
  );
  const total = Number(countRows[0].total);

  // page/pageSize 已由 validateObject 限定为整数范围，可安全内联进 LIMIT。
  const safePageSize = Number(pageSize);
  const offset = toOffset({ page, pageSize });
  const [rows] = await getPool().query(
    `${ITEM_SELECT} WHERE ${whereSql} ORDER BY i.created_at DESC, i.id DESC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  return { rows, total };
}

export async function findById(id) {
  const [rows] = await getPool().query(`${ITEM_SELECT} WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function create(record) {
  const [result] = await getPool().query(
    `INSERT INTO business_items
       (owner_id, title, author, category, condition_level, price, description, status, cover_file_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.owner_id,
      record.title,
      record.author,
      record.category,
      record.condition_level,
      record.price,
      record.description ?? null,
      record.status,
      record.cover_file_id ?? null,
      record.created_at,
      record.updated_at,
    ],
  );
  return { id: result.insertId, ...record };
}

/**
 * @param {number} id
 * @param {Record<string, unknown>} columns 列名 → 新值（列名必须在白名单内）
 */
export async function update(id, columns) {
  const entries = Object.entries(columns);
  if (entries.length === 0) return 0;

  for (const [column] of entries) {
    if (!UPDATABLE_COLUMNS.has(column)) {
      throw new Error(`business_items 不允许更新的列：${column}`);
    }
  }

  const setSql = entries.map(([column]) => `${column} = ?`).join(', ');
  const values = entries.map(([, value]) => value);
  const [result] = await getPool().query(
    `UPDATE business_items SET ${setSql} WHERE id = ? AND deleted_at IS NULL`,
    [...values, id],
  );
  return result.affectedRows;
}

export async function softDelete(id, deletedAt) {
  const [result] = await getPool().query(
    'UPDATE business_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [deletedAt, deletedAt, id],
  );
  return result.affectedRows;
}

/** 统计仍引用了某张封面的未删除条目（用于孤儿文件归档判断） */
export async function countByCoverFileId(fileId) {
  const [rows] = await getPool().query(
    'SELECT COUNT(*) AS total FROM business_items WHERE cover_file_id = ? AND deleted_at IS NULL',
    [fileId],
  );
  return Number(rows[0].total);
}
