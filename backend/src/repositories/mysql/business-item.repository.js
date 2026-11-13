/**
 * business_items 仓储（MySQL）：框架阶段只提供列表与详情
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

/**
 * @param {{ page: number, pageSize: number, status?: string, keyword?: string }} params
 */
export async function list({ page, pageSize, status, keyword }) {
  const conditions = ['i.deleted_at IS NULL'];
  const params = [];

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

  // page/pageSize 已由 validateObject 限定为 1..10000 / 1..50 的整数，可安全内联进 LIMIT。
  const offset = toOffset({ page, pageSize });
  const [rows] = await getPool().query(
    `${ITEM_SELECT} WHERE ${whereSql} ORDER BY i.created_at DESC, i.id DESC LIMIT ${pageSize} OFFSET ${offset}`,
    params,
  );

  return { rows, total };
}

export async function findById(id) {
  const [rows] = await getPool().query(`${ITEM_SELECT} WHERE i.id = ? AND i.deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] ?? null;
}
