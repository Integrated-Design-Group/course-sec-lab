/**
 * 健康检查服务
 * ---------------------------------------------------------------------------
 * 返回结构同时服务两类读者：
 *  - 容器/K8s 探针：HTTP 200/503 + status
 *  - 课程验收：数据库驱动、版本、运行时信息，便于截图取证
 */
import { config } from '../config/index.js';
import { repositories } from '../repositories/index.js';

export async function getHealthSnapshot() {
  const database = await repositories.health.ping();
  const healthy = database.status === 'up';

  return {
    status: healthy ? 'ok' : 'degraded',
    service: config.app.name,
    version: config.app.version,
    env: config.app.env,
    apiPrefix: config.app.apiPrefix,
    vulnMode: config.vuln.mode,
    uptimeSeconds: Math.round(process.uptime()),
    checks: { database },
  };
}
