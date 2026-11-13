/**
 * 仓储聚合入口：按 DB_DRIVER 选择实现
 * ---------------------------------------------------------------------------
 * 上层 service 只依赖 repositories 的接口形状，不感知底层是 MySQL 还是内存。
 * 新增存储实现时，必须同时满足 mysql/memory 两套签名（由测试兜底）。
 */
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let implementation;

if (config.db.driver === 'memory') {
  logger.warn('当前使用内存数据库驱动（DB_DRIVER=memory），数据不会持久化，仅限框架阶段演示');
  implementation = await import('./memory/index.js');
} else {
  implementation = await import('./mysql/index.js');
}

export const repositories = implementation.repositories;
export const driver = config.db.driver;
