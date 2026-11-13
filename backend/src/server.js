/**
 * HTTP 服务入口
 * ---------------------------------------------------------------------------
 * - 启动后打印可安全外发的配置摘要
 * - 启动时做一次数据库探活（失败只告警，不影响 /health 返回 503）
 * - 支持 SIGINT/SIGTERM 优雅退出：停止接收新连接 → 关闭连接池 → 刷日志
 */
import { createApp } from './app.js';
import { config, describeConfigForLog } from './config/index.js';
import { logger, closeLogger } from './utils/logger.js';
import { closePool, pingDatabase } from './db/pool.js';

const app = createApp();

const server = app.listen(config.app.port, () => {
  logger.info('HTTP 服务已启动', {
    url: `http://127.0.0.1:${config.app.port}${config.app.apiPrefix}`,
    ...describeConfigForLog(),
  });

  void pingDatabase().then((result) => {
    if (result.status === 'up') {
      logger.info('数据库连接正常', { driver: result.driver, latencyMs: result.latencyMs });
    } else {
      logger.warn('数据库暂不可用，/health 将返回 503', { driver: result.driver, errorCode: result.errorCode });
    }
  });
});

server.on('error', (error) => {
  logger.error('HTTP 服务启动失败', { errorMessage: error.message, errorCode: error.code });
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info('收到退出信号，开始优雅关闭', { signal });

  const forceTimer = setTimeout(() => {
    logger.error('优雅关闭超时，强制退出');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close(async (error) => {
    if (error) logger.error('关闭 HTTP 服务失败', { errorMessage: error.message });
    try {
      await closePool();
    } catch (closeError) {
      logger.error('关闭数据库连接池失败', { errorMessage: closeError.message });
    }
    await closeLogger();
    process.exit(error ? 1 : 0);
  });

  server.closeIdleConnections?.();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('未处理的 Promise rejection', {
    errorMessage: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('未捕获异常', { errorMessage: error.message, stack: error.stack });
  void shutdown('uncaughtException');
});
