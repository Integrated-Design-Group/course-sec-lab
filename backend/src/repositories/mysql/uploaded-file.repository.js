/**
 * uploaded_files 仓储（MySQL）
 */
import { getPool } from '../../db/pool.js';

export async function create(record) {
  const [result] = await getPool().query(
    `INSERT INTO uploaded_files
       (owner_id, original_name, stored_name, mime_type, size_bytes, sha256, storage_path, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.owner_id,
      record.original_name,
      record.stored_name,
      record.mime_type,
      record.size_bytes,
      record.sha256,
      record.storage_path,
      record.status,
      record.created_at,
      record.updated_at,
    ],
  );
  return { id: result.insertId, ...record };
}

export async function findById(id) {
  const [rows] = await getPool().query('SELECT * FROM uploaded_files WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

export async function findByIdForOwner(id, ownerId) {
  const [rows] = await getPool().query('SELECT * FROM uploaded_files WHERE id = ? AND owner_id = ? LIMIT 1', [
    id,
    ownerId,
  ]);
  return rows[0] ?? null;
}
