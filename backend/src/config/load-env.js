/**
 * 环境变量文件加载（被 config 与数据库运维脚本共用）
 * ---------------------------------------------------------------------------
 * 优先级：进程环境变量 > backend/.env > 仓库根 .env
 * 测试环境（NODE_ENV=test）不加载文件，避免本机配置污染自动化测试。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const BACKEND_ROOT = path.resolve(currentDir, '..', '..');
export const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');

let loaded = false;

export function loadEnvFiles({ force = false } = {}) {
  if (loaded) return;
  if (!force && (process.env.NODE_ENV || '').trim() === 'test') return;

  const candidates = [
    { file: path.join(REPO_ROOT, '.env'), override: false },
    { file: path.join(BACKEND_ROOT, '.env'), override: true },
  ];

  for (const { file, override } of candidates) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file, override });
    }
  }

  loaded = true;
}
