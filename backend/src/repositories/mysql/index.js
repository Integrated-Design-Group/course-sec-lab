/**
 * MySQL 仓储聚合入口：所有实现都必须与 memory 驱动保持相同函数签名。
 */
import * as users from './user.repository.js';
import * as roles from './role.repository.js';
import * as businessItems from './business-item.repository.js';
import * as uploadedFiles from './uploaded-file.repository.js';
import * as auditLogs from './audit-log.repository.js';
import { pingDatabase } from '../../db/pool.js';

export const repositories = Object.freeze({
  users,
  roles,
  businessItems,
  uploadedFiles,
  auditLogs,
  health: { ping: pingDatabase },
});
