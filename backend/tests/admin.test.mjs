import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';

let server;
let adminToken;
let studentToken;

async function login(account) {
  const response = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  return { status: response.status, body: await response.json() };
}

function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${server.baseUrl}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

before(async () => {
  server = await startTestServer();
  adminToken = (await login(TEST_ACCOUNTS.admin)).body.data.token;
  studentToken = (await login(TEST_ACCOUNTS.student)).body.data.token;
});

after(async () => {
  await server.close();
});

test('学生访问管理端接口返回 403', async () => {
  const users = await request('/admin/users', { token: studentToken });
  assert.equal(users.status, 403);
  assert.equal((await users.json()).code, 'FORBIDDEN');

  const audit = await request('/admin/audit-logs', { token: studentToken });
  assert.equal(audit.status, 403);
});

test('未登录访问管理端接口返回 401', async () => {
  const response = await request('/admin/users');
  assert.equal(response.status, 401);
});

test('管理员可查看用户列表且不返回密码哈希', async () => {
  const response = await request('/admin/users', { token: adminToken });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 2);
  assert.ok(Array.isArray(body.data.users));
  assert.equal(JSON.stringify(body).includes('$2a$'), false);
});

test('非法的目标状态返回 400', async () => {
  const response = await request('/admin/users/2/status', {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'hacked' },
  });
  assert.equal(response.status, 400);
});

test('管理员不能停用自己', async () => {
  const response = await request('/admin/users/1/status', {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'disabled' },
  });
  assert.equal(response.status, 403);
});

test('停用学生账号后无法登录，重新启用后恢复', async () => {
  const disabled = await request('/admin/users/2/status', {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'disabled' },
  });
  assert.equal(disabled.status, 200);
  assert.equal((await disabled.json()).data.user.status, 'disabled');

  const blocked = await login(TEST_ACCOUNTS.student);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'FORBIDDEN');

  const enabled = await request('/admin/users/2/status', {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'active' },
  });
  assert.equal(enabled.status, 200);

  const restored = await login(TEST_ACCOUNTS.student);
  assert.equal(restored.status, 200);
});

test('管理员可检索审计日志并支持过滤', async () => {
  const response = await request('/admin/audit-logs?action=admin.user.status&pageSize=50', {
    token: adminToken,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.data.logs.length >= 2);
  assert.ok(body.data.logs.every((log) => log.action === 'admin.user.status'));
  assert.ok(body.data.logs.every((log) => !('password' in (log.detail ?? {}))));
});

test('审计日志 actorId 过滤生效', async () => {
  const response = await request('/admin/audit-logs?actorId=1&pageSize=50', { token: adminToken });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.data.logs.every((log) => log.actorId === 1));
});
