/**
 * 冒烟测试（跨栈，M1）
 * ---------------------------------------------------------------------------
 * 前提：后端已启动（默认 http://127.0.0.1:3000），数据库已迁移 + 种子。
 * 运行：npm run smoke
 * 覆盖：健康检查 → 登录 → 列表 → 创建 → 更新 → 删除 → 退出 → 令牌失效
 */
import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { api, assertReachable } from '../helpers/client.mjs';

const DEMO = { username: 'student', password: 'Demo@123456' };
let token = '';
let createdId = null;

before(async () => {
  await assertReachable();
  const result = await api('/auth/login', { method: 'POST', body: DEMO });
  assert.equal(result.status, 200, '演示账号应可登录，请确认已执行种子脚本');
  token = result.payload.data.token;
});

test('健康检查可用且返回统一结构', async () => {
  const { status, payload } = await api('/health');
  assert.equal(status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.data.status, 'ok');
});

test('业务列表支持分页且返回 meta.pagination', async () => {
  const { status, payload } = await api('/business-items?page=1&pageSize=2');
  assert.equal(status, 200);
  assert.ok(Array.isArray(payload.data.items));
  assert.equal(payload.meta.pagination.pageSize, 2);
  assert.ok(payload.meta.pagination.total >= 1);
});

test('未登录访问受限接口返回 401', async () => {
  const { status, payload } = await api('/auth/me');
  assert.equal(status, 401);
  assert.equal(payload.code, 'UNAUTHORIZED');
});

test('创建条目 → 更新 → 删除闭环', async () => {
  const created = await api('/business-items', {
    method: 'POST',
    token,
    body: { title: 'smoke 测试条目', author: 'smoke', price: 1.5 },
  });
  assert.equal(created.status, 201);
  assert.equal(created.payload.data.item.status, 'draft');
  createdId = created.payload.data.item.id;

  const updated = await api(`/business-items/${createdId}`, {
    method: 'PATCH',
    token,
    body: { title: 'smoke 测试条目（已更新）' },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.payload.data.item.title, 'smoke 测试条目（已更新）');

  const removed = await api(`/business-items/${createdId}`, { method: 'DELETE', token });
  assert.equal(removed.status, 200);

  const detail = await api(`/business-items/${createdId}`);
  assert.equal(detail.status, 404);
});

test('未登录创建条目返回 401', async () => {
  const { status, payload } = await api('/business-items', {
    method: 'POST',
    body: { title: '未登录', author: 'x', price: 1 },
  });
  assert.equal(status, 401);
  assert.equal(payload.code, 'UNAUTHORIZED');
});

test('退出登录后同一令牌立即失效', async () => {
  const logout = await api('/auth/logout', { method: 'POST', token });
  assert.equal(logout.status, 200);

  const me = await api('/auth/me', { token });
  assert.equal(me.status, 401);
  assert.equal(me.payload.code, 'AUTH_TOKEN_INVALID');
});
