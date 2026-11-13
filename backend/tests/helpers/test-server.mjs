/**
 * 测试启动助手
 * ---------------------------------------------------------------------------
 * 关键点：必须在导入 src 之前设置环境变量（config 在模块加载时就完成校验），
 * 因此这里用动态 import，而不是静态 import。
 */
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = 'memory';
process.env.JWT_SECRET = 'test-only-secret-4f8a1c2e9b7d6a5f3e0c1d2b4a6f8e0c';
process.env.LOG_LEVEL = 'error';
process.env.LOG_TO_FILE = 'false';
process.env.BCRYPT_ROUNDS = '10';
process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '100';
process.env.UPLOAD_DIR = `./.tmp-test-uploads-${process.pid}`;
process.env.CORS_ORIGIN = 'http://localhost:5173';

const { createApp } = await import('../../src/app.js');

/**
 * 启动一个监听随机端口的测试服务。
 * @returns {Promise<{ baseUrl: string, close: () => Promise<void> }>}
 */
export async function startTestServer() {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

export const TEST_ACCOUNTS = Object.freeze({
  admin: { username: 'admin', password: 'Demo@123456' },
  student: { username: 'student', password: 'Demo@123456' },
});
