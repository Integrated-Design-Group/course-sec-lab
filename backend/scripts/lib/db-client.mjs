/**
 * 数据库运维脚本共用工具（迁移 / 种子 / 重置）
 * ---------------------------------------------------------------------------
 * 这些脚本只读取数据库相关变量，不校验 JWT_SECRET 等运行时配置，
 * 避免“只想迁移数据库却被要求配置登录密钥”的困扰。
 */
import mysql from 'mysql2/promise';
import path from 'node:path';
import { BACKEND_ROOT, REPO_ROOT, loadEnvFiles } from '../../src/config/load-env.js';

export { BACKEND_ROOT, REPO_ROOT };

const PLACEHOLDER_PATTERN = /__CHANGE_ME|CHANGE_ME|replace[_-]?me/i;

/**
 * @returns {{ host: string, port: number, user: string, password: string, name: string }}
 */
export function resolveDbConfig() {
  loadEnvFiles();

  const config = {
    host: process.env.DB_HOST?.trim() || '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER?.trim() || 'lab_user',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME?.trim() || 'course_sec_lab',
  };

  if (PLACEHOLDER_PATTERN.test(config.password)) {
    throw new Error('DB_PASSWORD 仍是模板占位值，请先在 .env 中填写数据库密码（脚本不会打印密码原文）');
  }
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    throw new Error(`DB_PORT 不合法：${process.env.DB_PORT}`);
  }
  if (!/^[A-Za-z0-9_]+$/.test(config.name)) {
    throw new Error(`DB_NAME 只允许字母、数字与下划线：${config.name}`);
  }

  return config;
}

export function resolveUploadDir() {
  loadEnvFiles();
  const target = process.env.UPLOAD_DIR?.trim() || './uploads';
  return path.isAbsolute(target) ? path.normalize(target) : path.resolve(BACKEND_ROOT, target);
}

export function createServerConnection(db) {
  return mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    connectTimeout: 10_000,
    multipleStatements: false,
  });
}

export function createDatabaseConnection(db) {
  return mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.name,
    connectTimeout: 10_000,
    multipleStatements: true,
    timezone: 'Z',
  });
}

export function maskDbTarget(db) {
  return `${db.user}@${db.host}:${db.port}/${db.name}`;
}
