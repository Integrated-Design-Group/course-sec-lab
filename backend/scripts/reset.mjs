/**
 * 数据库重置脚本（危险操作，仅用于课程演示环境）
 * 用法：
 *   npm run db:reset                 # 清空表 + 清空上传目录
 *   node scripts/reset.mjs --keep-uploads
 *   node scripts/reset.mjs --force   # 生产环境下确实要重置时使用
 * 说明：重置后必须重新执行 db:migrate 与 db:seed。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  createDatabaseConnection,
  createServerConnection,
  maskDbTarget,
  REPO_ROOT,
  resolveDbConfig,
  resolveUploadDir,
} from './lib/db-client.mjs';

const args = new Set(process.argv.slice(2));
const keepUploads = args.has('--keep-uploads');
const force = args.has('--force');

async function clearUploads() {
  const dir = resolveUploadDir();
  let removed = 0;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return { dir, removed: 0 };
    throw error;
  }

  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await fs.rm(target, { recursive: true, force: true });
    } else {
      await fs.unlink(target);
    }
    removed += 1;
  }

  return { dir, removed };
}

async function main() {
  if ((process.env.NODE_ENV || '').trim() === 'production' && !force) {
    throw new Error('检测到 NODE_ENV=production，已拒绝重置（如确认要重置请加 --force）');
  }

  const db = resolveDbConfig();
  console.log(`→ 目标数据库：${maskDbTarget(db)}`);

  const server = await createServerConnection(db);
  let exists = false;
  try {
    const [rows] = await server.query('SHOW DATABASES LIKE ?', [db.name]);
    exists = rows.length > 0;
  } finally {
    await server.end();
  }

  if (!exists) {
    console.log(`- 数据库 ${db.name} 不存在，跳过表重置`);
  } else {
    const connection = await createDatabaseConnection(db);
    try {
      const sql = await fs.readFile(path.join(REPO_ROOT, 'db', 'reset.sql'), 'utf8');
      await connection.query(sql);
      console.log('✔ 已删除全部业务表与 schema_migrations');
    } finally {
      await connection.end();
    }
  }

  if (keepUploads) {
    console.log('- 已跳过上传目录清理（--keep-uploads）');
  } else {
    const { dir, removed } = await clearUploads();
    console.log(`✔ 已清理上传目录：${dir}（删除 ${removed} 项）`);
  }

  console.log('下一步：npm run db:migrate && npm run db:seed');
}

main().catch((error) => {
  console.error(`✖ 重置失败：${error.message}`);
  process.exitCode = 1;
});
