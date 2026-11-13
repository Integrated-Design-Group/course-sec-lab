/**
 * roles 仓储（MySQL）
 */
import { getPool } from '../../db/pool.js';

export async function findByCode(code) {
  const [rows] = await getPool().query('SELECT id, code, name, description FROM roles WHERE code = ? LIMIT 1', [code]);
  return rows[0] ?? null;
}

export async function listAll() {
  const [rows] = await getPool().query('SELECT id, code, name, description FROM roles ORDER BY id ASC');
  return rows;
}
