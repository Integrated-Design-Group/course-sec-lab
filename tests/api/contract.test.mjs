/**
 * API 契约测试（跨栈，M1）
 * ---------------------------------------------------------------------------
 * 目的：把 docs/03-api.md 里的“统一响应 / 错误码 / 分页 / 权限 / 写接口”变成可执行断言。
 * 前提：后端已启动且已种子化，运行：npm run contract
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { api, assertReachable } from '../helpers/client.mjs';

const REQUIRED_ENVELOPE_FIELDS = ['success', 'code', 'message', 'requestId', 'timestamp'];
const DEMO = { username: 'student', password: 'Demo@123456' };

let studentToken = '';
let adminToken = '';

before(async () => {
  await assertReachable();
  const student = await api('/auth/login', { method: 'POST', body: DEMO });
  studentToken = student.payload.data.token;

  const admin = await api('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Demo@123456' },
  });
  adminToken = admin.payload.data.token;
});

test('成功响应包含统一信封字段', async () => {
  const { status, payload, response } = await api('/health');
  assert.equal(status, 200);
  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    assert.ok(field in payload, `缺少字段：${field}`);
  }
  assert.equal(payload.success, true);
  assert.equal(payload.code, 'OK');
  assert.equal(response.headers.get('content-type')?.includes('application/json'), true);
  assert.equal(response.headers.get('x-request-id'), payload.requestId);
});

test('失败响应包含统一信封字段', async () => {
  const { status, payload } = await api('/business-items/999999');
  assert.equal(status, 404);
  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    assert.ok(field in payload, `缺少字段：${field}`);
  }
  assert.equal(payload.success, false);
  assert.equal(payload.code, 'NOT_FOUND');
});

test('参数校验失败返回 details 数组', async () => {
  const { status, payload } = await api('/business-items?page=0');
  assert.equal(status, 400);
  assert.equal(payload.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(payload.details));
  assert.equal(payload.details[0].field, 'page');
});

test('登录失败不区分“用户不存在/密码错误”', async () => {
  const wrongPassword = await api('/auth/login', {
    method: 'POST',
    body: { username: 'student', password: 'WrongPassword123' },
  });
  const unknownUser = await api('/auth/login', {
    method: 'POST',
    body: { username: 'no-such-user', password: 'WrongPassword123' },
  });

  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.payload.code, unknownUser.payload.code);
  assert.equal(wrongPassword.payload.message, unknownUser.payload.message);
});

test('分页元数据字段齐全', async () => {
  const { payload } = await api('/business-items?page=1&pageSize=1');
  const pagination = payload.meta.pagination;
  for (const field of ['page', 'pageSize', 'total', 'totalPages', 'hasNext', 'hasPrev']) {
    assert.ok(field in pagination, `分页缺少字段：${field}`);
  }
});

test('响应不泄露密码哈希等敏感字段', async () => {
  const { payload } = await api('/auth/login', {
    method: 'POST',
    body: DEMO,
  });
  const text = JSON.stringify(payload);
  assert.equal(text.includes('$2a$'), false);
  assert.equal(text.includes('password_hash'), false);
});

test('写接口未登录返回 401', async () => {
  const { status, payload } = await api('/business-items', {
    method: 'POST',
    body: { title: 'unauthorized', author: 'x', price: 1 },
  });
  assert.equal(status, 401);
  assert.equal(payload.code, 'UNAUTHORIZED');
});

test('写接口契约：创建 201、非法流转 409、删除 200', async () => {
  const created = await api('/business-items', {
    method: 'POST',
    token: studentToken,
    body: {
      title: '契约测试条目',
      author: 'contract',
      category: 'notes',
      conditionLevel: 'good',
      price: 9.9,
    },
  });
  assert.equal(created.status, 201);
  for (const field of REQUIRED_ENVELOPE_FIELDS) {
    assert.ok(field in created.payload, `缺少字段：${field}`);
  }
  assert.equal(created.payload.data.item.status, 'draft');
  assert.equal(created.payload.data.item.owner.id, 2);

  const id = created.payload.data.item.id;

  const illegal = await api(`/business-items/${id}`, {
    method: 'PATCH',
    token: studentToken,
    body: { status: 'sold' },
  });
  assert.equal(illegal.status, 409);
  assert.equal(illegal.payload.code, 'CONFLICT');

  const removed = await api(`/business-items/${id}`, { method: 'DELETE', token: studentToken });
  assert.equal(removed.status, 200);
});

test('越权访问：学生不能修改他人条目，管理员可以', async () => {
  const forbidden = await api('/business-items/5', {
    method: 'PATCH',
    token: studentToken,
    body: { title: '越权' },
  });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.payload.code, 'FORBIDDEN');

  const allowed = await api('/business-items/5', {
    method: 'PATCH',
    token: adminToken,
    body: { price: 66.6 },
  });
  assert.equal(allowed.status, 200);
});

test('管理端接口：学生 403，管理员 200', async () => {
  const denied = await api('/admin/users', { token: studentToken });
  assert.equal(denied.status, 403);

  const allowed = await api('/admin/users', { token: adminToken });
  assert.equal(allowed.status, 200);
  assert.ok(Array.isArray(allowed.payload.data.users));
  assert.equal(JSON.stringify(allowed.payload).includes('$2a$'), false);
});

test('受控文件读取：未登录 401，不存在 404', async () => {
  const anonymous = await api('/uploads/1');
  assert.equal(anonymous.status, 401);

  const missing = await api('/uploads/99999', { token: studentToken });
  assert.equal(missing.status, 404);
  assert.equal(missing.payload.code, 'NOT_FOUND');
});
