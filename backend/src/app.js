/**
 * Express 应用装配
 * ---------------------------------------------------------------------------
 * 中间件顺序（不可随意调整）：
 *   requestId → 安全头 → CORS → body 解析 → 访问日志 → 业务路由 → 404 → 统一错误处理
 * 该文件只做装配，不包含业务逻辑，便于测试中直接 createApp() 起临时服务。
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestId } from './middlewares/request-id.js';
import { httpLogger } from './middlewares/http-logger.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { apiRouter } from './routes/index.js';
import { AppError } from './utils/errors.js';
import { sendSuccess } from './utils/response.js';

function corsBaseOptions() {
  return {
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 600,
  };
}

function buildCorsDelegate() {
  // 用 delegate 形式拿到 req，才能判断“同源请求”：
  // 浏览器对同源的非简单请求（如 JSON POST）同样会带 Origin 头，
  // 若只按白名单判断，会把同源登录请求误判为跨域并 403。
  return (req, callback) => {
    const origin = req.get('Origin');
    if (!origin) return callback(null, corsBaseOptions());

    let sameOrigin = false;
    const host = req.get('Host');
    try {
      sameOrigin = Boolean(host) && new URL(origin).host === host;
    } catch {
      sameOrigin = false;
    }

    if (sameOrigin || config.app.corsOrigins.includes(origin)) {
      return callback(null, { ...corsBaseOptions(), origin: true });
    }
    return callback(new AppError('FORBIDDEN', `来源 ${origin} 不在 CORS 白名单内`));
  };
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.app.trustProxy);

  app.use(requestId);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(buildCorsDelegate()));
  app.use(express.json({ limit: config.app.jsonBodyLimit, strict: true }));
  app.use(express.urlencoded({ extended: false, limit: config.app.jsonBodyLimit }));
  app.use(httpLogger);

  app.get('/', (req, res) =>
    sendSuccess(res, {
      message: 'course-sec-lab 后端已启动',
      data: {
        service: config.app.name,
        version: config.app.version,
        health: `${config.app.apiPrefix}/health`,
        apiBase: config.app.apiPrefix,
        docs: 'docs/03-api.md',
      },
    }),
  );

  app.use(config.app.apiPrefix, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
