import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';
import { DEMO_PASSWORD_HASH } from '../src/config/demo-accounts.js';

// 1x1 透明 PNG
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const uploadDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  process.env.UPLOAD_DIR,
);

let server;
let token;
let otherToken;

before(async () => {
  server = await startTestServer();

  // 测试夹具：额外插入一个学生账号（仅内存驱动），用于验证“非本人”读取/操作
  const { users } = await import('../src/repositories/memory/store.js');
  users.push({
    id: 3,
    username: 'student-b',
    email: 'student-b@example.edu',
    password_hash: DEMO_PASSWORD_HASH,
    display_name: '测试学生 B',
    role_id: 2,
    status: 'active',
    last_login_at: null,
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    deleted_at: null,
  });

  const first = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_ACCOUNTS.student),
  });
  token = (await first.json()).data.token;

  const second = await fetch(`${server.baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'student-b', password: 'Demo@123456' }),
  });
  otherToken = (await second.json()).data.token;
});

after(async () => {
  await server.close();
  await rm(uploadDir, { recursive: true, force: true });
});

function buildForm({ buffer, filename, type }) {
  const form = new FormData();
  form.append('file', new Blob([buffer], { type }), filename);
  return form;
}

async function upload(form, authorization) {
  const headers = authorization ? { Authorization: `Bearer ${authorization}` } : {};
  return fetch(`${server.baseUrl}/api/v1/uploads`, { method: 'POST', headers, body: form });
}

async function uploadPng(authorization) {
  const response = await upload(
    buildForm({ buffer: Buffer.from(PNG_BASE64, 'base64'), filename: 'cover.png', type: 'image/png' }),
    authorization,
  );
  assert.equal(response.status, 201);
  return (await response.json()).data.file;
}

test('未登录上传返回 401', async () => {
  const response = await upload(buildForm({ buffer: Buffer.from('x'), filename: 'a.png', type: 'image/png' }));
  assert.equal(response.status, 401);
});

test('非白名单类型被拒绝（415）', async () => {
  const response = await upload(
    buildForm({ buffer: Buffer.from('hello'), filename: 'note.txt', type: 'text/plain' }),
    token,
  );
  assert.equal(response.status, 415);
  const body = await response.json();
  assert.equal(body.code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('伪造扩展名的非图片内容被拒绝（415）', async () => {
  const response = await upload(
    buildForm({ buffer: Buffer.from('not-a-real-png'), filename: 'fake.png', type: 'image/png' }),
    token,
  );
  assert.equal(response.status, 415);
  assert.equal((await response.json()).code, 'UNSUPPORTED_MEDIA_TYPE');
});

test('合法 PNG 上传成功并记录 sha256', async () => {
  const file = await uploadPng(token);
  assert.equal(file.mimeType, 'image/png');
  assert.equal(file.sha256.length, 64);
  assert.equal(file.originalName, 'cover.png');
});

test('缺少 file 字段返回 400', async () => {
  const form = new FormData();
  form.append('note', 'no-file');
  const response = await upload(form, token);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'VALIDATION_ERROR');
});

test('受控读取：未登录 401，本人 200，不存在 404', async () => {
  const file = await uploadPng(token);

  const anonymous = await fetch(`${server.baseUrl}/api/v1/uploads/${file.id}`);
  assert.equal(anonymous.status, 401);

  const owner = await fetch(`${server.baseUrl}/api/v1/uploads/${file.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(owner.status, 200);
  assert.equal(owner.headers.get('content-type'), 'image/png');
  assert.equal(owner.headers.get('x-content-type-options'), 'nosniff');
  const bytes = Buffer.from(await owner.arrayBuffer());
  assert.ok(bytes.length > 0);

  const missing = await fetch(`${server.baseUrl}/api/v1/uploads/99999`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(missing.status, 404);
});

test('受控读取：未关联条目时非本人 403，作为封面后可见', async () => {
  const file = await uploadPng(token);

  const denied = await fetch(`${server.baseUrl}/api/v1/uploads/${file.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, 'FORBIDDEN');

  const created = await fetch(`${server.baseUrl}/api/v1/business-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: '带封面的条目',
      author: '测试',
      price: 1,
      coverFileId: file.id,
    }),
  });
  assert.equal(created.status, 201);
  const item = (await created.json()).data.item;
  assert.equal(item.coverFileId, file.id);

  const allowed = await fetch(`${server.baseUrl}/api/v1/uploads/${file.id}`, {
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert.equal(allowed.status, 200);

  // 清理：删除条目后封面被归档，文件本体被删除
  const removed = await fetch(`${server.baseUrl}/api/v1/business-items/${item.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(removed.status, 200);
});
