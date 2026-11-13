/**
 * 极简结构化日志（JSON Lines）
 * ---------------------------------------------------------------------------
 * 不引入第三方日志库，保证框架阶段依赖最小：
 *  - 每条日志一行 JSON，便于 `docker logs` / 文件采集
 *  - 默认只输出到 stdout；LOG_TO_FILE=true 时同时写入 LOG_DIR/app.log
 *  - 严禁把密码、token、密钥写入日志（调用方负责脱敏）
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/index.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = LEVELS[config.log.level] ?? LEVELS.info;

let fileStream = null;

function getFileStream() {
  if (!config.log.toFile) return null;
  if (fileStream) return fileStream;
  fs.mkdirSync(config.log.dir, { recursive: true });
  fileStream = fs.createWriteStream(path.join(config.log.dir, config.log.file), { flags: 'a' });
  return fileStream;
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  if (meta instanceof Error) {
    return { errorName: meta.name, errorMessage: meta.message, stack: meta.stack };
  }
  return meta;
}

function write(level, message, meta) {
  if (LEVELS[level] > threshold) return;
  const record = {
    timestamp: new Date().toISOString(),
    level,
    service: config.app.name,
    env: config.app.env,
    message: String(message),
    ...normalizeMeta(meta),
  };
  const line = `${JSON.stringify(record)}\n`;
  process.stdout.write(line);
  const stream = getFileStream();
  if (stream) stream.write(line);
}

export const logger = {
  error: (message, meta) => write('error', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  info: (message, meta) => write('info', message, meta),
  debug: (message, meta) => write('debug', message, meta),
};

/** 进程退出前调用，确保日志落盘。 */
export function closeLogger() {
  return new Promise((resolve) => {
    if (!fileStream) return resolve();
    fileStream.end(resolve);
    fileStream = null;
  });
}
