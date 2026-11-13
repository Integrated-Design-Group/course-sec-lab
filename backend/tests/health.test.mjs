import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer } from './helpers/test-server.mjs';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server.close();
});

test('GET /api/v1/health 返回 200 与统一响应结构', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.code, 'OK');
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.service, 'course-sec-lab');
  assert.equal(body.data.checks.database.driver, 'memory');
  assert.ok(typeof body.data.uptimeSeconds === 'number');
  assert.ok(body.requestId, '响应必须带 requestId');
  assert.ok(body.timestamp, '响应必须带 timestamp');
  assert.equal(response.headers.get('x-request-id'), body.requestId);
});

test('请求头 X-Request-Id 会被透传到响应', async () => {
  const customId = 'req-smoke-0001';
  const response = await fetch(`${server.baseUrl}/api/v1/health`, {
    headers: { 'X-Request-Id': customId },
  });
  const body = await response.json();
  assert.equal(body.requestId, customId);
  assert.equal(response.headers.get('x-request-id'), customId);
});

test('未知接口返回 404 + NOT_FOUND + 统一错误结构', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/not-exist`);
  assert.equal(response.status, 404);

  const body = await response.json();
  assert.equal(body.success, false);
  assert.equal(body.code, 'NOT_FOUND');
  assert.ok(body.message.includes('接口不存在'));
});

test('GET /api/v1 返回 API 索引', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.data.apiPrefix, '/api/v1');
  assert.ok(body.data.endpoints.health.includes('/health'));
});
