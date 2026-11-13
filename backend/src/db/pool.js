/**
 * MySQL 连接池
 * ---------------------------------------------------------------------------
 * - DB_DRIVER=mysql 时才创建连接池；memory 驱动下返回 null
 * - 统一 charset utf8mb4、连接时区 UTC（数据库容器也应为 UTC）
 * - 不开启 multipleStatements，避免把 SQL 拼接风险放大
 */
import mysql from 'mysql2/promise';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let pool = null;

export function isDatabaseEnabled() {
  return config.db.driver === 'mysql';
}

export function getPool() {
  if (!isDatabaseEnabled()) return null;
  if (pool) return pool;

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.name,
    charset: 'utf8mb4',
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: config.db.poolMax,
    maxIdle: config.db.poolMax,
    queueLimit: 0,
    connectTimeout: config.db.connectTimeoutMs,
    enableKeepAlive: true,
    multipleStatements: false,
  });

  logger.info('mysql 连接池已创建', {
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    connectionLimit: config.db.poolMax,
  });

  return pool;
}

/**
 * 健康检查用探活。
 * @returns {Promise<{driver: string, status: 'up'|'down', latencyMs: number, errorCode?: string, note?: string}>}
 */
export async function pingDatabase() {
  if (!isDatabaseEnabled()) {
    return {
      driver: 'memory',
      status: 'up',
      latencyMs: 0,
      note: '框架阶段内存驱动：数据不持久化，仅用于本地演示与冒烟测试',
    };
  }

  const startedAt = process.hrtime.bigint();
  try {
    const connection = await getPool().getConnection();
    try {
      await connection.query('SELECT 1');
    } finally {
      connection.release();
    }
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    return { driver: 'mysql', status: 'up', latencyMs: Number(latencyMs.toFixed(1)) };
  } catch (error) {
    const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.error('数据库探活失败', { errorCode: error.code, errorMessage: error.message });
    return {
      driver: 'mysql',
      status: 'down',
      latencyMs: Number(latencyMs.toFixed(1)),
      errorCode: error.code || 'UNKNOWN',
    };
  }
}

export async function closePool() {
  if (!pool) return;
  const current = pool;
  pool = null;
  await current.end();
  logger.info('mysql 连接池已关闭');
}
