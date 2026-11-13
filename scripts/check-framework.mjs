#!/usr/bin/env node
/**
 * 框架自检（零业务依赖，仅需根目录 js-yaml）
 * ---------------------------------------------------------------------------
 * 检查内容：
 *  1. 预期目录与文件是否齐全
 *  2. JSON / YAML 语法
 *  3. Compose 拓扑约束（db 不暴露端口、internal 网络、服务齐全）
 *  4. .env.example 关键变量齐全且为占位值
 *  5. .gitignore 是否忽略敏感/产物路径
 *  6. 仓库文本中是否出现真实密钥特征
 *  7. SQL 结构：必需表、种子账号、重置脚本
 *  8. 文档完整性：头部三要素、验收表字段与行数、API 端点覆盖
 *  9. 后端源码红线：禁止 eval / new Function / child_process
 * 用法：npm run check
 * 退出码：0 = 全部通过；1 = 存在失败项
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];

function record(level, title, detail = '') {
  results.push({ level, title, detail });
  const icons = { PASS: '✔', WARN: '!', FAIL: '✖' };
  console.log(`${icons[level]} [${level}] ${title}${detail ? ` :: ${detail}` : ''}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

/* ------------------------------------------------------------------ */
/* 1. 目录与文件                                                       */
/* ------------------------------------------------------------------ */
const REQUIRED_FILES = [
  'README.md',
  '.gitignore',
  '.env.example',
  'Makefile',
  'package.json',
  'docs/00-overview.md',
  'docs/01-architecture.md',
  'docs/02-database.md',
  'docs/03-api.md',
  'docs/04-deploy.md',
  'docs/05-environment.md',
  'docs/06-conventions.md',
  'docs/07-security-isolation.md',
  'docs/08-vuln-design.md',
  'docs/09-verify-template.md',
  'docs/10-access.md',
  'docs/framework-acceptance.md',
  'backend/package.json',
  'backend/package-lock.json',
  'backend/Dockerfile',
  'backend/src/server.js',
  'backend/src/app.js',
  'backend/src/config/index.js',
  'backend/src/routes/index.js',
  'backend/src/controllers/health.controller.js',
  'backend/tests/health.test.mjs',
  'backend/scripts/migrate.mjs',
  'frontend/package.json',
  'frontend/package-lock.json',
  'frontend/vite.config.js',
  'frontend/Dockerfile',
  'frontend/index.html',
  'frontend/src/main.jsx',
  'frontend/src/api/client.js',
  'db/migrations/001_init_schema.sql',
  'db/seeds/001_seed_base.sql',
  'db/reset.sql',
  'deploy/docker-compose.yml',
  'deploy/nginx/default.conf',
  'deploy/scripts/deploy.sh',
  'deploy/scripts/rollback.sh',
  'deploy/scripts/wait-for-db.sh',
  'scripts/dev-up.sh',
  'scripts/seed.sh',
  'scripts/check-env.sh',
  'tests/smoke/smoke.test.mjs',
  'tests/api/contract.test.mjs',
];

const REQUIRED_DIRS = [
  'backend/src/config',
  'backend/src/routes',
  'backend/src/controllers',
  'backend/src/services',
  'backend/src/repositories',
  'backend/src/middlewares',
  'backend/src/models',
  'backend/src/utils',
  'frontend/src/api',
  'frontend/src/components',
  'frontend/src/layouts',
  'frontend/src/pages',
  'frontend/src/router',
  'frontend/src/store',
  'frontend/src/utils',
  'frontend/public',
];

const missingFiles = REQUIRED_FILES.filter((file) => !exists(file));
if (missingFiles.length === 0) {
  record('PASS', `目录与文件完整（${REQUIRED_FILES.length} 个文件）`);
} else {
  record('FAIL', '缺少必需文件', missingFiles.join(', '));
}

const missingDirs = REQUIRED_DIRS.filter((dir) => !fs.existsSync(path.join(ROOT, dir)));
if (missingDirs.length === 0) {
  record('PASS', `目录结构完整（${REQUIRED_DIRS.length} 个目录）`);
} else {
  record('FAIL', '缺少必需目录', missingDirs.join(', '));
}

/* ------------------------------------------------------------------ */
/* 2. JSON 语法                                                        */
/* ------------------------------------------------------------------ */
for (const file of ['package.json', 'backend/package.json', 'frontend/package.json']) {
  if (!exists(file)) continue;
  try {
    JSON.parse(readText(file));
    record('PASS', `JSON 合法：${file}`);
  } catch (error) {
    record('FAIL', `JSON 解析失败：${file}`, error.message);
  }
}

/* ------------------------------------------------------------------ */
/* 3. Compose 语法与拓扑                                                */
/* ------------------------------------------------------------------ */
let compose = null;
if (exists('deploy/docker-compose.yml')) {
  try {
    compose = yaml.load(readText('deploy/docker-compose.yml'));
    record('PASS', 'YAML 合法：deploy/docker-compose.yml');
  } catch (error) {
    record('FAIL', 'YAML 解析失败：deploy/docker-compose.yml', error.message);
  }
}

if (compose) {
  const services = compose.services ?? {};
  const missingServices = ['db', 'backend', 'web'].filter((name) => !services[name]);
  if (missingServices.length === 0) {
    record('PASS', 'Compose 服务齐全（db/backend/web）');
  } else {
    record('FAIL', 'Compose 缺少服务', missingServices.join(', '));
  }

  if (services.db && !services.db.ports) {
    record('PASS', '数据库未映射宿主机端口');
  } else {
    record('FAIL', '数据库不应暴露宿主机端口', JSON.stringify(services.db?.ports ?? null));
  }

  if (services.web?.ports?.length > 0) {
    record('PASS', 'Web 通过 ports 暴露公网入口');
  } else {
    record('WARN', 'web 未映射任何端口', '部署后无法从宿主机访问');
  }

  const internalNetwork = compose.networks?.internal;
  if (internalNetwork?.internal === true) {
    record('PASS', 'internal 网络设置了 internal: true（无外网出口）');
  } else {
    record('FAIL', 'internal 网络缺少 internal: true');
  }

  if (Array.isArray(services.db?.networks) && services.db.networks.includes('internal')) {
    record('PASS', 'db 接入 internal 网络');
  } else {
    record('FAIL', 'db 未接入 internal 网络');
  }

  if (Array.isArray(services.db?.networks) && services.db.networks.includes('app_net')) {
    record('FAIL', 'db 不应接入面向公网的 app_net');
  } else {
    record('PASS', 'db 未接入 app_net');
  }

  if (String(services.db?.image ?? '').startsWith('mysql:8.4')) {
    record('PASS', `数据库镜像已锁定（${services.db.image}）`);
  } else {
    record('WARN', '数据库镜像未锁定到 8.4.x', services.db?.image);
  }
}

/* ------------------------------------------------------------------ */
/* 4. .env.example                                                     */
/* ------------------------------------------------------------------ */
const REQUIRED_ENV_KEYS = [
  'NODE_ENV',
  'PORT',
  'API_PREFIX',
  'CORS_ORIGIN',
  'LOG_LEVEL',
  'DB_DRIVER',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_ROOT_PASSWORD',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'BCRYPT_ROUNDS',
  'UPLOAD_DIR',
  'UPLOAD_MAX_BYTES',
  'UPLOAD_ALLOWED_MIME',
];

if (exists('.env.example')) {
  const envText = readText('.env.example');
  const envMap = {};
  for (const line of envText.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) envMap[match[1]] = match[2].trim();
  }

  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !(key in envMap));
  if (missingKeys.length === 0) {
    record('PASS', `环境变量模板完整（${REQUIRED_ENV_KEYS.length} 个关键变量）`);
  } else {
    record('FAIL', '.env.example 缺少变量', missingKeys.join(', '));
  }

  for (const key of ['JWT_SECRET', 'DB_PASSWORD', 'DB_ROOT_PASSWORD']) {
    const value = envMap[key] ?? '';
    if (value && !/__CHANGE_ME|CHANGE_ME|__YOUR_/i.test(value)) {
      record('FAIL', `.env.example 中 ${key} 不是占位值`, '禁止提交真实密钥');
    }
  }
  record('PASS', '.env.example 敏感变量均为占位符');
}

/* ------------------------------------------------------------------ */
/* 5. .gitignore                                                       */
/* ------------------------------------------------------------------ */
if (exists('.gitignore')) {
  const ignoreText = readText('.gitignore');
  const requiredPatterns = ['.env', 'node_modules', 'uploads', 'logs', 'dist'];
  const missing = requiredPatterns.filter((pattern) => !ignoreText.includes(pattern));
  if (missing.length === 0) {
    record('PASS', '忽略规则覆盖 .env / node_modules / uploads / logs / dist');
  } else {
    record('FAIL', '.gitignore 缺少忽略项', missing.join(', '));
  }
}

/* ------------------------------------------------------------------ */
/* 6. 密钥特征扫描                                                      */
/* ------------------------------------------------------------------ */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.npm-cache',
  'dist',
  'logs',
  'uploads',
  'coverage',
  '.tmp-check',
]);

const TEXT_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sql',
  '.sh',
  '.ps1',
  '.conf',
  '.txt',
  '.html',
  '.css',
  '.example',
]);

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: '私钥块', regex: /-----BEGIN (RSA|OPENSSH|EC|DSA) PRIVATE KEY-----/ },
  { name: 'GitHub Token', regex: /ghp_[A-Za-z0-9]{36}/ },
  { name: 'OpenAI 风格密钥', regex: /sk-[A-Za-z0-9]{32,}/ },
  { name: '完整 JWT（疑似真实令牌）', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

function walkFiles(dir, output) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, output);
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      output.push(fullPath);
    }
  }
  return output;
}

const scannedFiles = walkFiles(ROOT, []);
const secretHits = [];

for (const file of scannedFiles) {
  const stat = fs.statSync(file);
  if (stat.size > 1024 * 1024) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
      secretHits.push(`${path.relative(ROOT, file)} → ${pattern.name}`);
    }
  }
}

if (secretHits.length === 0) {
  record('PASS', `密钥扫描通过（${scannedFiles.length} 个文本文件）`);
} else {
  record('FAIL', '发现疑似真实密钥', secretHits.join('; '));
}

/* ------------------------------------------------------------------ */
/* 7. SQL 结构                                                         */
/* ------------------------------------------------------------------ */
const REQUIRED_TABLES = ['roles', 'users', 'business_items', 'uploaded_files', 'audit_logs'];

if (exists('db/migrations/001_init_schema.sql')) {
  const sql = readText('db/migrations/001_init_schema.sql');
  const tables = [...sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/gi)].map((match) => match[1]);
  const missingTables = REQUIRED_TABLES.filter((table) => !tables.includes(table));
  if (missingTables.length === 0) {
    record('PASS', `迁移包含必需表（${REQUIRED_TABLES.length} 张）`);
  } else {
    record('FAIL', '迁移缺少表', missingTables.join(', '));
  }
}

if (exists('db/seeds/001_seed_base.sql')) {
  const seed = readText('db/seeds/001_seed_base.sql');
  const problems = [];
  if (!/INSERT INTO users/i.test(seed)) problems.push('缺少 users 种子');
  if (!seed.includes("'admin'") || !seed.includes("'student'")) problems.push('缺少演示账号');
  if (!/\$2[aby]\$\d{2}\$/.test(seed)) problems.push('密码不是 bcrypt 哈希');
  if (problems.length === 0) {
    record('PASS', '种子数据包含角色 / 演示账号（bcrypt）');
  } else {
    record('FAIL', '种子数据不完整', problems.join(', '));
  }
}

if (exists('db/reset.sql')) {
  const reset = readText('db/reset.sql');
  const missingDrops = REQUIRED_TABLES.filter(
    (table) => !new RegExp(`DROP TABLE IF EXISTS\\s+\`?${table}\`?`, 'i').test(reset),
  );
  if (missingDrops.length === 0) {
    record('PASS', '重置脚本覆盖全部业务表');
  } else {
    record('FAIL', '重置脚本缺少表', missingDrops.join(', '));
  }
}

/* ------------------------------------------------------------------ */
/* 8. 文档完整性                                                       */
/* ------------------------------------------------------------------ */
const DOC_FILES = [
  'docs/00-overview.md',
  'docs/01-architecture.md',
  'docs/02-database.md',
  'docs/03-api.md',
  'docs/04-deploy.md',
  'docs/05-environment.md',
  'docs/06-conventions.md',
  'docs/07-security-isolation.md',
  'docs/08-vuln-design.md',
  'docs/09-verify-template.md',
  'docs/10-access.md',
];

const headerProblems = [];
for (const file of DOC_FILES) {
  if (!exists(file)) continue;
  const text = readText(file);
  const missingParts = ['适用对象', '前置条件', '预计耗时'].filter((part) => !text.includes(part));
  if (missingParts.length > 0) {
    headerProblems.push(`${file}（缺：${missingParts.join('/')}）`);
  }
}
if (headerProblems.length === 0) {
  record('PASS', `文档头部三要素齐全（${DOC_FILES.length} 篇）`);
} else {
  record('FAIL', '文档缺少适用对象/前置条件/预计耗时', headerProblems.join('; '));
}

if (exists('docs/03-api.md')) {
  const api = readText('docs/03-api.md');
  const endpoints = [
    '/api/v1/health',
    '/auth/login',
    '/auth/logout',
    '/auth/me',
    '/business-items',
    '/uploads',
  ];
  const errorCodes = ['VALIDATION_ERROR', 'AUTH_INVALID_CREDENTIALS', 'NOT_IMPLEMENTED'];
  const missing = [
    ...endpoints.filter((endpoint) => !api.includes(endpoint)),
    ...errorCodes.filter((code) => !api.includes(code)),
  ];
  if (missing.length === 0) {
    record('PASS', 'API 文档覆盖全部必需端点与错误码');
  } else {
    record('FAIL', 'API 文档缺少内容', missing.join(', '));
  }
}

if (exists('docs/08-vuln-design.md')) {
  const vuln = readText('docs/08-vuln-design.md');
  const ids = ['VULN-01', 'VULN-02', 'VULN-03', 'VULN-04', 'VULN-05'];
  if (ids.every((id) => vuln.includes(id)) && vuln.includes('未实现')) {
    record('PASS', '漏洞设计预留 VULN-01～05 且标注未实现');
  } else {
    record('FAIL', '漏洞设计文档不完整或未标注未实现');
  }
}

if (exists('docs/framework-acceptance.md')) {
  const acceptance = readText('docs/framework-acceptance.md');
  const headers = ['编号', '检查项', '操作步骤', '预期结果', '实际结果', '验收人', '备注'];
  const missingHeaders = headers.filter((header) => !acceptance.includes(header));
  const rows = acceptance.split(/\r?\n/).filter((line) => /^\|\s*F-\d+/.test(line));
  if (missingHeaders.length === 0 && rows.length >= 15) {
    record('PASS', `验收表格完整（${rows.length} 项检查，字段齐全）`);
  } else {
    record(
      'FAIL',
      '验收清单不完整',
      `缺字段：${missingHeaders.join(', ') || '无'}；行数：${rows.length}`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 9. 后端源码红线                                                      */
/* ------------------------------------------------------------------ */
const VIOLATIONS = [
  { name: 'eval 动态执行', regex: /\beval\s*\(/ },
  { name: 'new Function 动态执行', regex: /new\s+Function\s*\(/ },
  { name: 'child_process 调用', regex: /require\(['"]child_process['"]\)|from\s+['"]node:child_process['"]/ },
];

const backendSourceFiles = walkFiles(path.join(ROOT, 'backend', 'src'), []);
const violations = [];
for (const file of backendSourceFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const rule of VIOLATIONS) {
    if (rule.regex.test(content)) {
      violations.push(`${path.relative(ROOT, file)} → ${rule.name}`);
    }
  }
}
if (violations.length === 0) {
  record('PASS', `后端源码无动态执行/子进程（扫描 ${backendSourceFiles.length} 个文件）`);
} else {
  record('FAIL', '后端源码存在高风险调用', violations.join('; '));
}

if (exists('deploy/nginx/default.conf')) {
  const nginx = readText('deploy/nginx/default.conf');
  if (nginx.includes('proxy_pass') && nginx.includes('try_files')) {
    record('PASS', 'Nginx 配置包含 API 反代与 SPA 回退');
  } else {
    record('FAIL', 'Nginx 配置缺少 proxy_pass 或 try_files');
  }
}

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */
const failed = results.filter((item) => item.level === 'FAIL').length;
const warned = results.filter((item) => item.level === 'WARN').length;
const passed = results.filter((item) => item.level === 'PASS').length;

console.log('');
console.log('='.repeat(72));
console.log(`框架自检完成：通过 ${passed} · 警告 ${warned} · 失败 ${failed}`);
if (failed > 0) {
  console.log('结论：存在失败项，请修复后重试。');
  process.exitCode = 1;
} else {
  console.log('结论：框架静态检查通过。');
}
