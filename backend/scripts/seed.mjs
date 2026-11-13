/**
 * 种子数据脚本：按文件名顺序执行 db/seeds/*.sql（可重复执行）
 * 用法：npm run db:seed
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createDatabaseConnection, maskDbTarget, REPO_ROOT, resolveDbConfig } from './lib/db-client.mjs';

const SEEDS_DIR = path.join(REPO_ROOT, 'db', 'seeds');

async function main() {
  const db = resolveDbConfig();
  console.log(`→ 目标数据库：${maskDbTarget(db)}`);

  const connection = await createDatabaseConnection(db);
  try {
    const [tableRows] = await connection.query(
      `SELECT COUNT(*) AS total FROM information_schema.tables
       WHERE table_schema = ? AND table_name IN ('users', 'business_items', 'roles')`,
      [db.name],
    );
    if (Number(tableRows[0].total) < 3) {
      throw new Error('目标库缺少基础表，请先执行 `npm run db:migrate`');
    }

    const files = (await fs.readdir(SEEDS_DIR)).filter((file) => file.endsWith('.sql')).sort();
    if (files.length === 0) {
      console.log('⚠ 未找到种子文件（db/seeds 为空）');
      return;
    }

    for (const file of files) {
      const sql = await fs.readFile(path.join(SEEDS_DIR, file), 'utf8');
      await connection.query(sql);
      console.log(`✔ 已执行：${file}`);
    }

    const [counts] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM business_items) AS items,
        (SELECT COUNT(*) FROM roles) AS roles
    `);
    const summary = counts[0];
    console.log(`完成：roles=${summary.roles} users=${summary.users} business_items=${summary.items}`);
    console.log('演示账号：admin / student，密码 Demo@123456（仅课程环境使用）');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`✖ 种子执行失败：${error.message}`);
  process.exitCode = 1;
});
