/**
 * 课程测试账号创建 / 启用脚本（B-07）
 * ---------------------------------------------------------------------------
 * 目的：按“一人一号”创建课程测试账号；密码只从环境变量读取，不写入仓库、
 *       不打印、不写日志。账号默认创建为 active；--disable 可停用。
 *
 * 用法（MySQL 模式）：
 *   TEST_ACCOUNT_USERNAME=stuB \
 *   TEST_ACCOUNT_PASSWORD='<课程平台发放的强密码>' \
 *   node scripts/create-test-account.mjs
 *
 *   TEST_ACCOUNT_USERNAME=stuB node scripts/create-test-account.mjs --disable
 *
 * 可选：
 *   --role admin|student     默认 student
 *   --display-name <文本>    默认 "<username>（课程测试）"
 *   --email <邮箱>           默认 "<username>@example.edu"
 *   --force                  允许在 NODE_ENV=production 下执行
 *
 * 安全约束：
 *   - 密码 >= 12 位，且不能是演示密码 Demo@123456
 *   - 脚本不输出密码/哈希；只输出 username/role/status
 *   - 生产环境下默认拒绝执行，需显式 --force
 */
import bcrypt from 'bcryptjs';
import { createDatabaseConnection, maskDbTarget, resolveDbConfig } from './lib/db-client.mjs';

const args = process.argv.slice(2);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const disable = flags.has('--disable');
const force = flags.has('--force');
const role = (process.env.TEST_ACCOUNT_ROLE || 'student').trim();
const username = (process.env.TEST_ACCOUNT_USERNAME || '').trim();
const password = process.env.TEST_ACCOUNT_PASSWORD || '';
const displayName = (process.env.TEST_ACCOUNT_DISPLAY_NAME || `${username}（课程测试）`).trim();
const email = (process.env.TEST_ACCOUNT_EMAIL || `${username}@example.edu`).trim().toLowerCase();

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

function assertInput() {
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(username)) {
    throw new Error('TEST_ACCOUNT_USERNAME 必须是 3～64 位字母/数字/._-');
  }
  if (!['admin', 'student'].includes(role)) {
    throw new Error('TEST_ACCOUNT_ROLE 只能是 admin 或 student');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('TEST_ACCOUNT_EMAIL 不是合法邮箱');
  }
  if (!disable) {
    if (password.length < 12) {
      throw new Error('TEST_ACCOUNT_PASSWORD 至少 12 位（且不要使用演示密码）');
    }
    if (password === 'Demo@123456') {
      throw new Error('不能使用演示密码 Demo@123456 作为测试账号密码');
    }
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
    if (classes < 3 || new Set(password).size < 8) {
      throw new Error('TEST_ACCOUNT_PASSWORD 需至少包含 3 类字符（大小写/数字/符号）且字符种类 >= 8');
    }
  }
}

async function main() {
  assertInput();

  if ((process.env.NODE_ENV || '').trim() === 'production' && !force) {
    throw new Error('检测到 NODE_ENV=production，已拒绝创建测试账号；确需执行请加 --force');
  }

  const db = resolveDbConfig();
  console.log(`→ 目标数据库：${maskDbTarget(db)}`);

  const connection = await createDatabaseConnection(db);
  try {
    const [roleRows] = await connection.query('SELECT id, code FROM roles WHERE code = ? LIMIT 1', [role]);
    if (roleRows.length === 0) {
      throw new Error(`角色不存在：${role}，请先执行 db:seed`);
    }

    const [existing] = await connection.query(
      'SELECT id, status FROM users WHERE username = ? LIMIT 1',
      [username],
    );

    if (disable) {
      if (existing.length === 0) {
        throw new Error(`账号不存在：${username}`);
      }
      await connection.query(
        'UPDATE users SET status = ?, updated_at = ? WHERE id = ?',
        ['disabled', new Date(), existing[0].id],
      );
      console.log(`✔ 已停用：${username}（角色 ${role}）`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();

    if (existing.length > 0) {
      await connection.query(
        `UPDATE users
            SET email = ?, password_hash = ?, display_name = ?, role_id = ?, status = 'active',
                deleted_at = NULL, updated_at = ?
          WHERE id = ?`,
        [email, passwordHash, displayName, roleRows[0].id, now, existing[0].id],
      );
      console.log(`✔ 已更新并启用：${username}（角色 ${role}，id=${existing[0].id}）`);
    } else {
      const [result] = await connection.query(
        `INSERT INTO users
           (username, email, password_hash, display_name, role_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
        [username, email, passwordHash, displayName, roleRows[0].id, now, now],
      );
      console.log(`✔ 已创建并启用：${username}（角色 ${role}，id=${result.insertId}）`);
    }

    console.log('  密码未写入仓库/日志；请通过课程平台或加密渠道发放。');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  fail(error.message);
});
