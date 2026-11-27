/**
 * users 仓储（MySQL）
 * 返回值统一使用数据库行（snake_case），由 models 层负责序列化。
 */
import { getPool } from '../../db/pool.js';
import { isVulnEnabled } from '../../config/index.js';

const USER_SELECT = `
  SELECT
    u.id, u.username, u.email, u.password_hash, u.display_name, u.role_id,
    u.status, u.last_login_at, u.created_at, u.updated_at, u.deleted_at,
    r.code AS role_code, r.name AS role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
`;

export async function findByUsernameOrEmail(identifier) {
  // ──【刻意漏洞 VULN-01】把登录名/邮箱直接拼进 SQL；ALL / VULN-01 启用 ──
  if (isVulnEnabled('VULN-01')) {
    const [rows] = await getPool().query(
      `${USER_SELECT} WHERE (u.username = '${identifier}' OR u.email = '${identifier}') AND u.deleted_at IS NULL LIMIT 1`,
    );
    return rows[0] ?? null;
  }

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

/**
 * 管理端用户列表（A-07）：支持状态过滤与用户名/邮箱/显示名模糊搜索。
 * @param {{ page: number, pageSize: number, status?: string, keyword?: string }} params
 */
export async function list({ page, pageSize, status, keyword }) {
  const conditions = ['u.deleted_at IS NULL'];
  const params = [];

  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }
  if (keyword) {
    conditions.push('(u.username LIKE ? OR u.email LIKE ? OR u.display_name LIKE ?)');
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const whereSql = conditions.join(' AND ');
  const [countRows] = await getPool().query(
    `SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`,
    params,
  );

  const safePageSize = Number(pageSize);
  const offset = (Number(page) - 1) * safePageSize;
  const [rows] = await getPool().query(
    `${USER_SELECT} WHERE ${whereSql} ORDER BY u.id ASC LIMIT ${safePageSize} OFFSET ${offset}`,
    params,
  );

  return { rows, total: Number(countRows[0].total) };
}

export async function updateStatus(id, status, at = new Date()) {
  const [result] = await getPool().query(
    'UPDATE users SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
    [status, at, id],
  );
  return result.affectedRows;
}

/** 统计仍处于 active 的管理员数量，防止把最后一个管理员停用 */
export async function countActiveAdmins() {
  const [rows] = await getPool().query(
    `SELECT COUNT(*) AS total
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.deleted_at IS NULL AND u.status = 'active' AND r.code = 'admin'`,
  );
  return Number(rows[0].total);
}
