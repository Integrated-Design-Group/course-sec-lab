/**
 * 配置加载与校验（框架阶段）
 * ---------------------------------------------------------------------------
 * 职责：
 *  1. 按优先级加载环境变量：进程环境 > backend/.env > 仓库根 .env
 *  2. 对关键配置做类型、范围与“占位符”校验，缺失/不安全时快速失败
 *  3. 输出唯一的冻结配置对象，业务代码不允许直接读 process.env
 *
 * 约定：测试环境（NODE_ENV=test）不加载任何 .env 文件，避免本机配置污染测试。
 */
import fs from 'node:fs';
import path from 'node:path';
import { BACKEND_ROOT, REPO_ROOT, loadEnvFiles } from './load-env.js';

export { BACKEND_ROOT, REPO_ROOT };

loadEnvFiles();

export class ConfigError extends Error {
  constructor(message) {
    super(`[config] ${message}`);
    this.name = 'ConfigError';
  }
}

/** 模板占位符：出现即视为“未配置”，避免把示例值带进真实环境。 */
export const PLACEHOLDER_PATTERN = /__CHANGE_ME|__PUBLIC_IP|__YOUR_|change[_-]?me|replace[_-]?me|your[_-].*[_-]here/i;

function readRaw(key) {
  const value = process.env[key];
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? undefined : trimmed;
}

function readString(key, fallback) {
  const value = readRaw(key);
  return value === undefined ? fallback : value;
}

function readInt(key, fallback, { min, max } = {}) {
  const value = readRaw(key);
  if (value === undefined) return fallback;
  if (!/^-?\d+$/.test(value)) {
    throw new ConfigError(`${key} 必须是整数，当前值：${value}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (min !== undefined && parsed < min) throw new ConfigError(`${key} 不能小于 ${min}，当前值：${parsed}`);
  if (max !== undefined && parsed > max) throw new ConfigError(`${key} 不能大于 ${max}，当前值：${parsed}`);
  return parsed;
}

function readBool(key, fallback) {
  const value = readRaw(key);
  if (value === undefined) return fallback;
  const normalized = value.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new ConfigError(`${key} 必须是布尔值（true/false），当前值：${value}`);
}

function readEnum(key, allowed, fallback) {
  const value = readRaw(key);
  if (value === undefined) return fallback;
  if (!allowed.includes(value)) {
    throw new ConfigError(`${key} 只能取 ${allowed.join(' | ')}，当前值：${value}`);
  }
  return value;
}

function readList(key, fallback) {
  const value = readRaw(key);
  if (value === undefined) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveInside(baseDir, target) {
  return path.isAbsolute(target) ? path.normalize(target) : path.resolve(baseDir, target);
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND_ROOT, 'package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function assertJwtSecret(secret) {
  if (secret.length < 32) {
    throw new ConfigError('JWT_SECRET 长度必须 >= 32 个字符，请用 `openssl rand -hex 32` 生成');
  }
  if (PLACEHOLDER_PATTERN.test(secret)) {
    throw new ConfigError('JWT_SECRET 仍是模板占位值，请替换为随机生成的密钥');
  }
  if (new Set(secret).size < 8) {
    throw new ConfigError('JWT_SECRET 复杂度不足（字符种类过少），请使用随机值');
  }
}

const nodeEnv = readEnum('NODE_ENV', ['development', 'test', 'production'], 'development');
const isProduction = nodeEnv === 'production';

const apiPrefixRaw = readString('API_PREFIX', '/api/v1');
const apiPrefix = `/${apiPrefixRaw.replace(/^\/+|\/+$/g, '')}`;
if (apiPrefix !== '/api/v1') {
  throw new ConfigError(`框架阶段 API_PREFIX 固定为 /api/v1，当前值：${apiPrefix}`);
}

const corsOriginRaw = readList('CORS_ORIGIN', ['http://localhost:5173']);
if (isProduction && corsOriginRaw.includes('*')) {
  throw new ConfigError('生产环境 CORS_ORIGIN 不允许使用 *，请显式列出前端域名');
}

const dbDriver = readEnum('DB_DRIVER', ['mysql', 'memory'], 'mysql');
if (isProduction && dbDriver === 'memory') {
  throw new ConfigError('生产环境禁止使用内存数据库驱动（DB_DRIVER=memory），请使用 mysql');
}

const dbPassword = readString('DB_PASSWORD', '');
const jwtSecret = readString('JWT_SECRET', '');
assertJwtSecret(jwtSecret);

if (isProduction) {
  if (PLACEHOLDER_PATTERN.test(dbPassword) || dbPassword.length < 8) {
    throw new ConfigError('生产环境 DB_PASSWORD 必须替换为强密码（>= 8 位）');
  }
}

const uploadAllowedMime = readList('UPLOAD_ALLOWED_MIME', ['image/png', 'image/jpeg', 'image/webp']);
const allowedMimeWhitelist = ['image/png', 'image/jpeg', 'image/webp'];
for (const mime of uploadAllowedMime) {
  if (!allowedMimeWhitelist.includes(mime)) {
    throw new ConfigError(`UPLOAD_ALLOWED_MIME 仅允许 ${allowedMimeWhitelist.join(', ')}，当前含：${mime}`);
  }
}

const appConfig = Object.freeze({
  env: nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  name: readString('APP_NAME', 'course-sec-lab'),
  version: readString('APP_VERSION', readPackageVersion()),
  apiPrefix,
  port: readInt('PORT', 3000, { min: 1, max: 65535 }),
  corsOrigins: Object.freeze(corsOriginRaw),
  trustProxy: readInt('TRUST_PROXY', 0, { min: 0, max: 10 }),
  jsonBodyLimit: '1mb',
});

const logConfig = Object.freeze({
  level: readEnum('LOG_LEVEL', ['debug', 'info', 'warn', 'error'], 'info'),
  dir: resolveInside(BACKEND_ROOT, readString('LOG_DIR', './logs')),
  toFile: readBool('LOG_TO_FILE', false),
  file: 'app.log',
});

const dbConfig = Object.freeze({
  driver: dbDriver,
  host: readString('DB_HOST', '127.0.0.1'),
  port: readInt('DB_PORT', 3306, { min: 1, max: 65535 }),
  name: readString('DB_NAME', 'course_sec_lab'),
  user: readString('DB_USER', 'lab_user'),
  password: dbPassword,
  poolMin: readInt('DB_POOL_MIN', 2, { min: 0, max: 50 }),
  poolMax: readInt('DB_POOL_MAX', 10, { min: 1, max: 100 }),
  connectTimeoutMs: readInt('DB_CONNECT_TIMEOUT_MS', 10000, { min: 1000, max: 60000 }),
});

const authConfig = Object.freeze({
  jwtSecret,
  jwtExpiresIn: readString('JWT_EXPIRES_IN', '2h'),
  bcryptRounds: readInt('BCRYPT_ROUNDS', 10, { min: 10, max: 14 }),
  loginRateLimit: Object.freeze({
    windowMs: readInt('LOGIN_RATE_LIMIT_WINDOW_MS', 600000, { min: 60000, max: 3600000 }),
    maxAttempts: readInt('LOGIN_RATE_LIMIT_MAX_ATTEMPTS', 10, { min: 3, max: 100 }),
  }),
});

const uploadConfig = Object.freeze({
  dir: resolveInside(BACKEND_ROOT, readString('UPLOAD_DIR', './uploads')),
  maxBytes: readInt('UPLOAD_MAX_BYTES', 2 * 1024 * 1024, { min: 1024, max: 10 * 1024 * 1024 }),
  allowedMime: Object.freeze(uploadAllowedMime),
});

function deepFreeze(object) {
  for (const value of Object.values(object)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) deepFreeze(value);
  }
  return Object.freeze(object);
}

export const config = deepFreeze({
  app: appConfig,
  log: logConfig,
  db: dbConfig,
  auth: authConfig,
  upload: uploadConfig,
});

/** 日志中可安全输出的配置摘要（不含任何密钥）。 */
export function describeConfigForLog() {
  return {
    env: config.app.env,
    version: config.app.version,
    port: config.app.port,
    apiPrefix: config.app.apiPrefix,
    db: { driver: config.db.driver, host: config.db.host, port: config.db.port, name: config.db.name },
    uploadDir: config.upload.dir,
    logDir: config.log.dir,
  };
}
