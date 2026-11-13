/**
 * 校验中间件：把校验结果放到 req.validated[body|query]
 * 控制器只读取 req.validated，避免直接信任原始入参。
 */
import { validateObject } from '../utils/validation.js';

function createValidator(source) {
  return function validate(schemaOrFactory) {
    return function validateMiddleware(req, res, next) {
      try {
        const schema = typeof schemaOrFactory === 'function' ? schemaOrFactory(req) : schemaOrFactory;
        const value = validateObject(req[source], schema);
        if (!req.validated) req.validated = {};
        req.validated[source] = value;
        next();
      } catch (error) {
        next(error);
      }
    };
  };
}

export const validateBody = createValidator('body');
export const validateQuery = createValidator('query');
