/**
 * 健康检查控制器
 * GET /api/v1/health
 * 数据库不可用时返回 503 + DB_UNAVAILABLE，便于容器探针与人工验收区分状态。
 */
import { asyncHandler } from '../utils/async-handler.js';
import { sendFailure, sendSuccess } from '../utils/response.js';
import { getHealthSnapshot } from '../services/health.service.js';

export const getHealth = asyncHandler(async (req, res) => {
  const snapshot = await getHealthSnapshot();

  if (snapshot.checks.database.status !== 'up') {
    return sendFailure(res, {
      code: 'DB_UNAVAILABLE',
      message: '数据库探活失败',
      status: 503,
      details: { checks: snapshot.checks },
    });
  }

  return sendSuccess(res, {
    message: '服务正常',
    data: snapshot,
  });
});
