import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';

let server;
let studentToken;
let adminToken;

async function login(account) {
  const response = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  return (await response.json()).data.token;
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
  studentToken = await login(TEST_ACCOUNTS.student);
  adminToken = await login(TEST_ACCOUNTS.admin);
});

after(async () => {
  await server.close();
});

test('未登录创建条目返回 401', async () => {
  const response = await request('/business-items', {
    method: 'POST',
    body: { title: '未登录', author: 'x', price: 1 },
  });
  assert.equal(response.status, 401);
});

test('创建条目入参校验失败返回 400 + details', async () => {
  const response = await request('/business-items', {
    method: 'POST',
    token: studentToken,
    body: { title: '', author: 'x', price: -1 },
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR');
  const fields = body.details.map((item) => item.field);
  assert.ok(fields.includes('title'));
  assert.ok(fields.includes('price'));
});

test('学生创建条目成功：初始 draft、归属本人、写审计', async () => {
  const response = await request('/business-items', {
    method: 'POST',
    token: studentToken,
    body: {
      title: 'M1 新建条目',
      author: '测试同学',
      category: 'notes',
      conditionLevel: 'good',
      price: 12.5,
      description: '创建接口测试',
    },
  });

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.data.item.status, 'draft');
  assert.equal(body.data.item.owner.id, 2);
  assert.equal(body.data.item.price, 12.5);

  const auditResponse = await request('/admin/audit-logs?action=business_item.create&pageSize=50', {
    token: adminToken,
  });
  const auditBody = await auditResponse.json();
  assert.ok(auditBody.data.logs.some((log) => log.resourceId === String(body.data.item.id)));
});

test('封面文件不存在时返回 400', async () => {
  const response = await request('/business-items', {
    method: 'POST',
    token: studentToken,
    body: { title: '带封面', author: 'x', price: 1, coverFileId: 99999 },
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'VALIDATION_ERROR');
});

test('学生不能修改他人的条目（403）', async () => {
  // 种子 id=5 属于 admin
  const response = await request('/business-items/5', {
    method: 'PATCH',
    token: studentToken,
    body: { title: '越权修改' },
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'FORBIDDEN');
});

test('管理员可以修改他人条目', async () => {
  const response = await request('/business-items/5', {
    method: 'PATCH',
    token: adminToken,
    body: { price: 66.6 },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.item.price, 66.6);
});

test('乐观并发：expectedUpdatedAt 不匹配返回 409', async () => {
  const detail = await request('/business-items/1');
  const item = (await detail.json()).data.item;

  const conflict = await request('/business-items/1', {
    method: 'PATCH',
    token: studentToken,
    body: { title: '并发修改', expectedUpdatedAt: '2000-01-01T00:00:00.000Z' },
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).code, 'CONFLICT');

  const ok = await request('/business-items/1', {
    method: 'PATCH',
    token: studentToken,
    body: { title: '并发修改', expectedUpdatedAt: item.updatedAt },
  });
  assert.equal(ok.status, 200);
});

test('非法状态流转返回 409，合法流转成功', async () => {
  const created = await request('/business-items', {
    method: 'POST',
    token: studentToken,
    body: { title: '状态机测试', author: 'x', price: 1 },
  });
  const id = (await created.json()).data.item.id;

  const illegal = await request(`/business-items/${id}`, {
    method: 'PATCH',
    token: studentToken,
    body: { status: 'sold' },
  });
  assert.equal(illegal.status, 409);
  assert.equal((await illegal.json()).code, 'CONFLICT');

  const legal = await request(`/business-items/${id}`, {
    method: 'PATCH',
    token: studentToken,
    body: { status: 'published' },
  });
  assert.equal(legal.status, 200);
  assert.equal((await legal.json()).data.item.status, 'published');

  await request(`/business-items/${id}`, { method: 'DELETE', token: studentToken });
});

test('学生不能删除他人条目；删除自己的条目后详情 404', async () => {
  const forbidden = await request('/business-items/5', { method: 'DELETE', token: studentToken });
  assert.equal(forbidden.status, 403);

  const created = await request('/business-items', {
    method: 'POST',
    token: studentToken,
    body: { title: '待删除', author: 'x', price: 1 },
  });
  const id = (await created.json()).data.item.id;

  const deleted = await request(`/business-items/${id}`, { method: 'DELETE', token: studentToken });
  assert.equal(deleted.status, 200);

  const detail = await request(`/business-items/${id}`);
  assert.equal(detail.status, 404);
});
