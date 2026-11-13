import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

async function login(payload) {
  return fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

test('演示账号可登录，返回 Bearer Token 与用户信息', async () => {
  const response = await login(TEST_ACCOUNTS.admin);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.tokenType, 'Bearer');
  assert.ok(body.data.token.split('.').length === 3, '应为 JWT');
  assert.equal(body.data.user.username, 'admin');
  assert.equal(body.data.user.role, 'admin');
  assert.equal(body.data.user.passwordHash, undefined, '响应不得包含密码哈希');
});

test('密码错误返回 401 AUTH_INVALID_CREDENTIALS', async () => {
  const response = await login({ username: 'admin', password: 'WrongPassword123' });
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.code, 'AUTH_INVALID_CREDENTIALS');
  assert.equal(body.message, '用户名或密码错误');
});

test('参数缺失返回 400 VALIDATION_ERROR', async () => {
  const response = await login({ username: 'admin' });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(body.details));
  assert.equal(body.details[0].field, 'password');
});

test('未携带令牌访问 /auth/me 返回 401', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/auth/me`);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'UNAUTHORIZED');
});

test('登录 → 读取当前用户 → 退出 → 令牌立即失效', async () => {
  const loginResponse = await login(TEST_ACCOUNTS.student);
  const { token } = (await loginResponse.json()).data;

  const meResponse = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(meResponse.status, 200);
  const meBody = await meResponse.json();
  assert.equal(meBody.data.username, 'student');
  assert.equal(meBody.data.role, 'student');

  const logoutResponse = await fetch(`${server.baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(logoutResponse.status, 200);

  const afterLogout = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(afterLogout.status, 401);
  const afterLogoutBody = await afterLogout.json();
  assert.equal(afterLogoutBody.code, 'AUTH_TOKEN_INVALID');
});

test('伪造令牌返回 401 AUTH_TOKEN_INVALID', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/auth/me`, {
    headers: { Authorization: 'Bearer not.a.real.token' },
  });
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.code, 'AUTH_TOKEN_INVALID');
});
