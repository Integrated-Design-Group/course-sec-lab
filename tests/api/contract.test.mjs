/**
 * API 契约测试（跨栈）
 * ---------------------------------------------------------------------------
 * 目的：把 docs/03-api.md 里的“统一响应 / 错误码 / 分页 / 参数校验”变成可执行断言。
 * 前提：后端已启动且已种子化，运行：npm run contract
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { api, assertReachable } from '../helpers/client.mjs';

const REQUIRED_ENVELOPE_FIELDS = ['success', 'code', 'message', 'requestId', 'timestamp'];

before(async () => {
  await assertReachable();
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
    body: { username: 'student', password: 'Demo@123456' },
  });
  const text = JSON.stringify(payload);
  assert.equal(text.includes('$2a$'), false);
  assert.equal(text.includes('password_hash'), false);
});
