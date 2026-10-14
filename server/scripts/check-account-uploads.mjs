// Run from server/: node --env-file=.env --import tsx scripts/check-account-uploads.mjs
// Uses temporary accounts/photos and a private test server; removes its test data.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
const dir = await mkdtemp(path.join(tmpdir(), 'divara-photo-check-'));
process.env.UPLOAD_DIR = dir;
const { createApp } = await import('../src/app.ts');
const prisma = new PrismaClient();
let server;
let base;
let cookie;
let userId;
const email = `photo-check-${crypto.randomUUID()}@example.test`;
const password = 'Local-test-account-76354';
const json = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const call = (endpoint, options = {}) => fetch(base + endpoint, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers } });
async function start() {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { if (server) await new Promise((resolve) => server.close(resolve)); server = null; }
try {
  await start();
  let response = await call('/api/auth/register', json({ name: 'Photo check', email: ` ${email.toUpperCase()} `, password }));
  assert.equal(response.status, 201);
  const registered = (await response.json()).user;
  userId = registered.id;
  assert.equal(registered.email, email);
  const session = response.headers.get('set-cookie');
  assert(session.includes('HttpOnly'));
  assert(session.includes('Max-Age=604800'));
  cookie = session.split(';')[0];
  const stored = await prisma.user.findUnique({ where: { id: userId } });
  assert(stored && stored.passwordHash !== password && stored.passwordHash.length > 40);
  assert.equal((await call('/api/auth/me')).status, 200);
  const photo = await readFile('../public/images/outfit-before.png');
  const data = new FormData();
  data.append('image', new File([photo], 'outfit.png', { type: 'image/png' }));
  response = await call('/api/uploads', { method: 'POST', body: data });
  assert.equal(response.status, 201);
  const uploaded = (await response.json()).upload;
  // Restart the API; accounts, session secret and upload paths must stay stable.
  await stop();
  await start();
  response = await call('/api/auth/me');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, userId);
  assert.equal((await call('/api/auth/logout', json({}))).status, 204);
  cookie = undefined;
  assert.equal((await call('/api/auth/me')).status, 401);
  assert.equal((await call('/api/auth/login', json({ email, password: 'wrong-password' }))).status, 401);
  response = await call('/api/auth/login', json({ email: ` ${email.toUpperCase()} `, password }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.id, userId);
  cookie = response.headers.get('set-cookie').split(';')[0];
  response = await call('/api/uploads');
  assert((await response.json()).uploads.some((entry) => entry.id === uploaded.id));
  response = await call(uploaded.url);
  assert.equal(response.status, 200);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
  assert.equal((await call('/api/auth/register', json({ name: 'Duplicate', email, password }))).status, 409);
  console.log('PASS: signup persisted with hashed password; returning login; wrong-password rejection; session and uploaded image survive API restart; saved image loads exactly.');
} finally {
  await stop();
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
  await rm(dir, { recursive: true, force: true });
}
