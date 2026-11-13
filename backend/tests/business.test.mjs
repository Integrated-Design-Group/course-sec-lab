import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';

let server;
let token;

before(async () => {
  server = await startTestServer();
  const response = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_ACCOUNTS.student),
  });
  token = (await response.json()).data.token;
});

after(async () => {
  await server.close();
});

test('列表接口返回分页结构', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.items.length, 3);
  assert.equal(body.meta.pagination.total, 3);
  assert.equal(body.meta.pagination.page, 1);
  assert.equal(body.meta.pagination.pageSize, 10);
  assert.equal(body.meta.pagination.hasNext, false);
  assert.equal(body.data.items[0].owner.id, 2);
});

test('pageSize=2 时分页元数据正确', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?page=1&pageSize=2`);
  const body = await response.json();
  assert.equal(body.data.items.length, 2);
  assert.equal(body.meta.pagination.totalPages, 2);
  assert.equal(body.meta.pagination.hasNext, true);
});

test('status 过滤只返回草稿', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?status=draft`);
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 1);
  assert.equal(body.data.items[0].status, 'draft');
});

test('keyword 过滤命中标题', async () => {
  const response = await fetch(
    `${server.baseUrl}/api/v1/business-items?keyword=${encodeURIComponent('计算机网络')}`,
  );
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 1);
  assert.ok(body.data.items[0].title.includes('计算机网络'));
});

test('非法 status 枚举返回 400', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?status=hacked`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR');
});

test('详情返回条目，不存在返回 404', async () => {
  const okResponse = await fetch(`${server.baseUrl}/api/v1/business-items/1`);
  assert.equal(okResponse.status, 200);
  const okBody = await okResponse.json();
  assert.equal(okBody.data.item.id, 1);
  assert.equal(typeof okBody.data.item.price, 'number');

  const missingResponse = await fetch(`${server.baseUrl}/api/v1/business-items/9999`);
  assert.equal(missingResponse.status, 404);
  assert.equal((await missingResponse.json()).code, 'NOT_FOUND');
});

test('非法 id 返回 400', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items/abc`);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'VALIDATION_ERROR');
});

test('写操作在框架阶段返回 501，且需要登录', async () => {
  const anonymous = await fetch(`${server.baseUrl}/api/v1/business-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(anonymous.status, 401);

  const authed = await fetch(`${server.baseUrl}/api/v1/business-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(authed.status, 501);
  const body = await authed.json();
  assert.equal(body.code, 'NOT_IMPLEMENTED');
});
