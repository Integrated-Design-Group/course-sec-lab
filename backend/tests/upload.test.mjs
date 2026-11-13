import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { startTestServer, TEST_ACCOUNTS } from './helpers/test-server.mjs';

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
  const response = await upload(
    buildForm({ buffer: Buffer.from(PNG_BASE64, 'base64'), filename: 'cover.png', type: 'image/png' }),
    token,
  );
  assert.equal(response.status, 201);

  const body = await response.json();
  assert.equal(body.data.file.mimeType, 'image/png');
  assert.equal(body.data.file.sha256.length, 64);
  assert.equal(body.data.file.originalName, 'cover.png');
});

test('缺少 file 字段返回 400', async () => {
  const form = new FormData();
  form.append('note', 'no-file');
  const response = await upload(form, token);
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, 'VALIDATION_ERROR');
});
