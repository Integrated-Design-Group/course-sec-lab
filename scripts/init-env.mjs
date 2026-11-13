#!/usr/bin/env node
/**
 * 初始化本地环境变量文件
 * ---------------------------------------------------------------------------
 * 作用：把 .env.example 复制为 .env，并把 JWT_SECRET 替换为本机随机值，
 *      默认使用内存驱动，保证“无 MySQL 也能跑通最小登录闭环”。
 * 安全：只生成随机密钥，不写入任何真实账号密码或云凭证；.env 已被 .gitignore 忽略。
 * 用法：node scripts/init-env.mjs [--force]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(repoRoot, '.env');
const examplePath = path.join(repoRoot, '.env.example');
const frontendEnvPath = path.join(repoRoot, 'frontend', '.env');
const frontendExamplePath = path.join(repoRoot, 'frontend', '.env.example');

const force = process.argv.includes('--force');

function writeIfAbsent(target, source, transform) {
  if (fs.existsSync(target) && !force) {
    console.log(`- 已存在，跳过：${path.relative(repoRoot, target)}`);
    return false;
  }
  if (!fs.existsSync(source)) {
    console.error(`✖ 缺少模板文件：${path.relative(repoRoot, source)}`);
    process.exitCode = 1;
    return false;
  }
  const content = transform(fs.readFileSync(source, 'utf8'));
  fs.writeFileSync(target, content, 'utf8');
  console.log(`✔ 已生成：${path.relative(repoRoot, target)}`);
  return true;
}

const created = writeIfAbsent(envPath, examplePath, (template) => {
  const secret = crypto.randomBytes(32).toString('hex');
  return template
    .replace('__CHANGE_ME_JWT_SECRET_AT_LEAST_32_CHARS__', secret)
    .replace(/^DB_DRIVER=.*$/m, 'DB_DRIVER=memory');
});

writeIfAbsent(frontendEnvPath, frontendExamplePath, (template) => template);

if (created) {
  console.log('');
  console.log('说明：');
  console.log('  * 当前 DB_DRIVER=memory，可立即启动并验证健康检查/登录闭环（数据不持久化）');
  console.log('  * 切换到 MySQL：把 DB_DRIVER 改为 mysql，填写 DB_PASSWORD，再执行 npm run db:reset');
  console.log('  * 已生成的 JWT_SECRET 只保存在本地 .env，不会进入版本库');
}
