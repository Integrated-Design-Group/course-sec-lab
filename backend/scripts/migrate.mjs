/**
 * 数据库迁移脚本：按文件名顺序执行 db/migrations/*.sql
 * 用法：npm run db:migrate（在 backend/ 或仓库根目录）
 * 特性：自动建库、记录 schema_migrations、跳过已应用版本、失败即退出。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createDatabaseConnection, createServerConnection, maskDbTarget, REPO_ROOT, resolveDbConfig } from './lib/db-client.mjs';

const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations');

async function main() {
  const db = resolveDbConfig();
  console.log(`→ 目标数据库：${maskDbTarget(db)}`);

  const server = await createServerConnection(db);
  try {
    await server.query(
      `CREATE DATABASE IF NOT EXISTS \`${db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
    console.log(`✔ 数据库已就绪：${db.name}`);
  } finally {
    await server.end();
  }

  const connection = await createDatabaseConnection(db);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) NOT NULL,
        description VARCHAR(255) NOT NULL DEFAULT '',
        applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (version)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
    `);

    const [rows] = await connection.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));

    const files = (await fs.readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();
    if (files.length === 0) {
      console.log('⚠ 未找到迁移文件（db/migrations 为空）');
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) {
        console.log(`- 跳过已应用：${version}`);
        continue;
      }

      const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT IGNORE INTO schema_migrations (version, description) VALUES (?, ?)', [
        version,
        `db/migrations/${file}`,
      ]);
      appliedCount += 1;
      console.log(`✔ 已应用：${version}`);
    }

    console.log(`完成：本次应用 ${appliedCount} 个迁移，共 ${files.length} 个迁移文件`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`✖ 迁移失败：${error.message}`);
  process.exitCode = 1;
});
