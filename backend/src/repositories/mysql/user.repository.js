/**
 * users 仓储（MySQL）
 * 返回值统一使用数据库行（snake_case），由 models 层负责序列化。
 */
import { getPool } from '../../db/pool.js';

const USER_SELECT = `
  SELECT
    u.id, u.username, u.email, u.password_hash, u.display_name, u.role_id,
    u.status, u.last_login_at, u.created_at, u.updated_at, u.deleted_at,
    r.code AS role_code, r.name AS role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

export async function findByUsernameOrEmail(identifier) {
  const [rows] = await getPool().query(
    `${USER_SELECT} WHERE (u.username = ? OR u.email = ?) AND u.deleted_at IS NULL LIMIT 1`,
    [identifier, identifier],
  );
  return rows[0] ?? null;
}

export async function findById(id) {
  const [rows] = await getPool().query(`${USER_SELECT} WHERE u.id = ? AND u.deleted_at IS NULL LIMIT 1`, [id]);
  return rows[0] ?? null;
}

export async function updateLastLogin(id, at = new Date()) {
  const [result] = await getPool().query('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?', [
    at,
    at,
    id,
  ]);
  return result.affectedRows;
}

export async function count() {
  const [rows] = await getPool().query('SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL');
  return Number(rows[0].total);
}
