/**
 * /api/v1 路由聚合
 * ---------------------------------------------------------------------------
 * 约定：所有业务路由都挂在 /api/v1 下；路由文件只负责“装配”，
 * 业务逻辑在 controllers → services → repositories 三层中。
 */
import { Router } from 'express';
import { config } from '../config/index.js';
import { sendSuccess } from '../utils/response.js';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { businessRouter } from './business.routes.js';
import { uploadRouter } from './upload.routes.js';

export const apiRouter = Router();

apiRouter.get('/', (req, res) =>
  sendSuccess(res, {
    message: 'course-sec-lab API',
    data: {
      name: config.app.name,
      version: config.app.version,
      apiPrefix: config.app.apiPrefix,
      endpoints: {
        health: `GET ${config.app.apiPrefix}/health`,
        login: `POST ${config.app.apiPrefix}/auth/login`,
        logout: `POST ${config.app.apiPrefix}/auth/logout`,
        me: `GET ${config.app.apiPrefix}/auth/me`,
        businessItems: `GET ${config.app.apiPrefix}/business-items`,
        businessItemDetail: `GET ${config.app.apiPrefix}/business-items/:id`,
        upload: `POST ${config.app.apiPrefix}/uploads`,
      },
      docs: 'docs/03-api.md',
    },
  }),
);

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(businessRouter);
apiRouter.use(uploadRouter);
