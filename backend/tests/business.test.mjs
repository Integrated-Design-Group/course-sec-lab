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

test('列表接口返回分页结构（内存种子 11 条）', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items`);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.items.length, 10);
  assert.equal(body.meta.pagination.total, 11);
  assert.equal(body.meta.pagination.page, 1);
  assert.equal(body.meta.pagination.pageSize, 10);
  assert.equal(body.meta.pagination.hasNext, true);
  // 排序固定为 created_at DESC, id DESC，最新的是 id=11
  assert.equal(body.data.items[0].id, 11);
});

test('pageSize=2 时分页元数据正确', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?page=1&pageSize=2`);
  const body = await response.json();
  assert.equal(body.data.items.length, 2);
  assert.equal(body.meta.pagination.totalPages, 6);
  assert.equal(body.meta.pagination.hasNext, true);
});

test('status 过滤只返回草稿', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?status=draft`);
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 2);
  assert.ok(body.data.items.every((item) => item.status === 'draft'));
});

test('keyword 过滤命中标题（计算机网络匹配 2 条）', async () => {
  const response = await fetch(
    `${server.baseUrl}/api/v1/business-items?keyword=${encodeURIComponent('计算机网络')}`,
  );
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 2);
  assert.ok(body.data.items.every((item) => item.title.includes('计算机网络')));
});

test('非法 status 枚举返回 400', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?status=hacked`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.code, 'VALIDATION_ERROR');
});

test('“我的条目”只返回当前登录用户的数据', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?mine=true&pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.meta.pagination.total, 7);
  assert.ok(body.data.items.every((item) => item.owner.id === 2));
});

test('未登录请求“我的条目”返回 401', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?mine=true`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, 'UNAUTHORIZED');
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

test('列表支持 mine=false 且不要求登录', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/business-items?mine=false`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).meta.pagination.total, 11);
});
