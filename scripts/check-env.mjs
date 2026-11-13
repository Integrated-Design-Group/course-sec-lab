#!/usr/bin/env node
/**
 * 环境自检（零依赖，跨平台）
 * ---------------------------------------------------------------------------
 * 检查项：
 *  1. Node.js 版本 >= 22
 *  2. .env 是否存在，关键变量是否已填写（不打印密钥明文）
 *  3. 前后端依赖是否已安装
 *  4. 上传目录 / 日志目录是否可写
 *  5. --db：是否可连通 MySQL
 * 用法：node scripts/check-env.mjs [--db]
 * 退出码：0 = 全部通过（允许 warning）；1 = 存在失败项
 */
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const withDb = process.argv.includes('--db');

const results = [];

function record(level, title, detail = '') {
  results.push({ level, title, detail });
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const map = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function canWriteDirectory(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, `.write-probe-${process.pid}`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function checkTcp(host, port, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok, error) => {
      socket.destroy();
      resolve({ ok, error });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false, 'timeout'));
    socket.once('error', (error) => done(false, error.code || error.message));
  });
}

async function main() {
  // 1. Node 版本
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 22) {
    record('PASS', `Node.js v${process.versions.node}`, '满足 >= 22 要求');
  } else {
    record('FAIL', `Node.js v${process.versions.node}`, '需要 >= 22，请升级 Node.js');
  }

  // 2. .env
  const envPath = path.join(repoRoot, '.env');
  let env = null;
  if (!fs.existsSync(envPath)) {
    record('FAIL', '.env 不存在', '执行 `node scripts/init-env.mjs` 生成');
  } else {
    env = parseEnvFile(envPath);
    record('PASS', '.env 存在', '已加载本地配置（内容不会打印）');

    const secret = env.JWT_SECRET ?? '';
    if (secret.length < 32 || /__CHANGE_ME|change[_-]?me/i.test(secret)) {
      record('FAIL', 'JWT_SECRET 未替换', '执行 `node scripts/init-env.mjs --force` 或手动生成随机值');
    } else {
      record('PASS', 'JWT_SECRET 已配置', `长度 ${secret.length}（不显示内容）`);
    }

    const driver = (env.DB_DRIVER ?? 'mysql').trim();
    if (!['mysql', 'memory'].includes(driver)) {
      record('FAIL', `DB_DRIVER=${driver} 不合法`, '只能是 mysql 或 memory');
    } else if (driver === 'memory') {
      record('WARN', 'DB_DRIVER=memory', '内存驱动仅用于框架演示，数据不持久化；部署必须改为 mysql');
    } else {
      record('PASS', 'DB_DRIVER=mysql', '数据库模式');
      if (!env.DB_PASSWORD || /__CHANGE_ME|change[_-]?me/i.test(env.DB_PASSWORD)) {
        record('FAIL', 'DB_PASSWORD 未填写', 'MySQL 模式下必须填写真实密码（不要提交到仓库）');
      } else {
        record('PASS', 'DB_PASSWORD 已配置', '长度 ' + env.DB_PASSWORD.length + '（不显示内容）');
      }
    }

    if (!env.CORS_ORIGIN) {
      record('WARN', 'CORS_ORIGIN 未设置', '默认仅允许 http://localhost:5173');
    }
  }

  // 3. 依赖
  for (const [label, dir] of [
    ['backend', path.join(repoRoot, 'backend', 'node_modules')],
    ['frontend', path.join(repoRoot, 'frontend', 'node_modules')],
  ]) {
    if (fs.existsSync(dir)) {
      record('PASS', `${label} 依赖已安装`, 'node_modules 存在');
    } else {
      record('FAIL', `${label} 依赖缺失`, `执行 npm --prefix ${label} install`);
    }
  }

  // 4. 目录可写
  const uploadDir = path.resolve(repoRoot, 'backend', env?.UPLOAD_DIR || './uploads');
  const logDir = path.resolve(repoRoot, 'backend', env?.LOG_DIR || './logs');
  if (canWriteDirectory(uploadDir)) {
    record('PASS', '上传目录可写', uploadDir);
  } else {
    record('FAIL', '上传目录不可写', uploadDir);
  }
  if (canWriteDirectory(logDir)) {
    record('PASS', '日志目录可写', logDir);
  } else {
    record('FAIL', '日志目录不可写', logDir);
  }

  // 5. 数据库连通性（可选）
  if (withDb) {
    if (!env) {
      record('WARN', '跳过数据库连通性检查', '缺少 .env');
    } else if ((env.DB_DRIVER ?? '').trim() === 'memory') {
      record('WARN', '跳过数据库连通性检查', 'DB_DRIVER=memory');
    } else {
      const host = env.DB_HOST || '127.0.0.1';
      const port = Number(env.DB_PORT || 3306);
      const { ok, error } = await checkTcp(host, port);
      if (ok) {
        record('PASS', `MySQL 端口可达 ${host}:${port}`, '仅验证 TCP，未验证账号权限');
      } else {
        record('FAIL', `MySQL 端口不可达 ${host}:${port}`, String(error));
      }
    }
  }

  const icons = { PASS: '✔', WARN: '!', FAIL: '✖' };
  console.log('环境自检结果');
  console.log('='.repeat(64));
  for (const item of results) {
    const level = item.level.padEnd(4, ' ');
    console.log(`${icons[item.level]} [${level}] ${item.title}${item.detail ? ` :: ${item.detail}` : ''}`);
  }
  console.log('='.repeat(64));

  const failed = results.filter((item) => item.level === 'FAIL').length;
  const warned = results.filter((item) => item.level === 'WARN').length;
  console.log(`通过 ${results.length - failed - warned} · 警告 ${warned} · 失败 ${failed}`);

  if (failed > 0) {
    console.log('结论：存在失败项，请按提示修复后重试。');
    process.exitCode = 1;
  } else {
    console.log('结论：环境可用。');
  }
}

main().catch((error) => {
  console.error(`自检脚本异常：${error.message}`);
  process.exitCode = 1;
});
