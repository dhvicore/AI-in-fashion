// Real local-model integration check. No downloads. Run from server/:
// node --env-file=.env --import tsx scripts/check-analysis-history.mjs
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
const dir = await mkdtemp(path.join(tmpdir(), 'divara-history-check-'));
process.env.UPLOAD_DIR = dir;
const { createApp } = await import('../src/app.ts');
const { matchGarment } = await import('../src/scoring/knowledge.ts');
const { canonicalColor } = await import('../src/scoring/score.ts');
const prisma = new PrismaClient();
const users = [];
let server, base, cookie;
const email = `history-${crypto.randomUUID()}@example.test`;
const password = 'Local-history-test-67348';
const json = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const call = (endpoint, options = {}) => fetch(base + endpoint, { ...options, headers: { ...(cookie ? { Cookie: cookie } : {}), ...options.headers }, signal: AbortSignal.timeout(370000) });
async function start() {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { if (server) await new Promise(resolve => server.close(resolve)); server = null; }
try {
  await start();
  let response = await call('/api/auth/register', json({ name: 'History check', email, password }));
  assert.equal(response.status, 201); users.push((await response.json()).user.id);
  cookie = response.headers.get('set-cookie').split(';')[0];
  const entries = [];
  let responseProfile=await call('/api/profile',{...json({name:'History check',styles:['Casual'],colors:[],fits:[],occasions:['Casual'],climate:'',goals:[]}),method:'PUT'});assert.equal(responseProfile.status,200);
  const knowledge=await(await call('/api/scoring/knowledge')).json();
  for (const [source, file] of [['photo', '../public/images/outfit-before.png'], ['camera', '../public/images/outfit-after.png']]) {
    const bytes = await readFile(file);
    const form = new FormData(); form.append('source', source); form.append('image', new File([bytes], `${source}.png`, { type: 'image/png' }));
    response = await call('/api/uploads', { method: 'POST', body: form });
    assert.equal(response.status, 201); const upload = (await response.json()).upload;
    const before = await (await call('/api/items')).json();
    assert(before.photos.some(photo => photo.url === upload.url && photo.status === 'needs-analysis'));
    assert(before.items.every(item => item.owned));
    response = await call('/api/analyses', json({ url: upload.url, source }));
    const output = await response.json(); assert.equal(response.status, 200, JSON.stringify(output));
    const entry = output.entry;
    const closet = await (await call('/api/items')).json();
    const imported = closet.items.filter(item => item.image_url === upload.url);
    assert.equal(imported.length, entry.analysis.garments.length);
    assert(imported.every(item => item.photo_id && item.owned));
    const itemIds = closet.items.map(item => item.item_id).sort();
    assert.equal(entry.source, source); assert(entry.analysis.garments.length > 0);
    assert.equal(entry.analysis.score,null,'Vision identifies clothes; it must not assign a score');
    assert.deepEqual(entry.analysis.corrections,[]);entries.push(entry);
    const confirmed=entry.analysis.garments.map((g,originalIndex)=>({garmentKey:matchGarment(g.name,knowledge.garments)?.key,color:canonicalColor(g.color),style:'Casual',originalIndex}));
    assert(confirmed.every(g=>g.garmentKey&&knowledge.colors.includes(g.color)),JSON.stringify(confirmed));
    const scoringResponse=await call('/api/scoring/assessments',json({analysisId:entry.id,garments:confirmed,context:{occasion:'Casual',weather:'Any'}}));
    const scored=await scoringResponse.json();assert.equal(scoringResponse.status,200,JSON.stringify(scored));
    assert(scored.assessment.score===null||Number.isFinite(scored.assessment.score));
    assert.equal(scored.assessment.version,knowledge.version);
    console.log(`PASS: ${source} recognition followed by backend score ${scored.assessment.score}, with saved breakdown.`);
    response = await call('/api/analyses', json({ url: upload.url, source }));
    assert.equal((await response.json()).entry.id, entry.id);
    const duplicateForm = new FormData(); duplicateForm.append('image', new File([bytes], 'same-image-renamed.png', { type: 'image/png' }));
    response = await call('/api/uploads', { method: 'POST', body: duplicateForm });
    assert.equal(response.status, 201); const duplicateUpload = (await response.json()).upload;
    response = await call('/api/analyses', json({ url: duplicateUpload.url, source: source === 'photo' ? 'camera' : 'photo' }));
    assert.equal(response.status, 200); assert.deepEqual((await response.json()).entry, entry);
    assert.deepEqual((await (await call('/api/items')).json()).items.map(item => item.item_id).sort(), itemIds);
    console.log(`PASS: ${source} result generated, validated, saved and reopened without duplicate history.`, `(${entry.analysis.garments.length} garments)`);
  }
  await call('/api/auth/logout', json({})); cookie = undefined;
  assert.equal((await call('/api/analyses')).status, 401);
  await stop(); await start();
  assert.equal((await call('/api/auth/login', json({ email, password: 'wrong-password' }))).status, 401);
  response = await call('/api/auth/login', json({ email: ` ${email.toUpperCase()} `, password }));
  assert.equal(response.status, 200); assert.equal((await response.json()).user.id, users[0]);
  cookie = response.headers.get('set-cookie').split(';')[0];
  let page = await (await call('/api/analyses?limit=1')).json();
  assert.equal(page.entries.length, 1); assert(page.nextCursor);
  const secondPage = await (await call(`/api/analyses?limit=1&cursor=${page.nextCursor}`)).json();
  assert.equal(secondPage.entries.length, 1); assert.equal(secondPage.nextCursor, null);
  assert.notEqual(page.entries[0].id, secondPage.entries[0].id);
  const restoredCloset = await (await call('/api/items')).json();
  assert.equal(restoredCloset.photos.length, 2);
  assert.equal(restoredCloset.items.length, entries.reduce((count, entry) => count + entry.analysis.garments.length, 0));
  for (const entry of entries) {
    response = await call(`/api/analyses/${entry.id}`); assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).entry, entry);
  }
  response = await call('/api/auth/register', json({ name: 'Other account', email: `other-${crypto.randomUUID()}@example.test`, password }));
  assert.equal(response.status, 201); users.push((await response.json()).user.id);
  cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await call('/api/analyses')).json()).entries.length, 0);
  const otherCloset = await (await call('/api/items')).json(); assert.equal(otherCloset.items.length, 0); assert.equal(otherCloset.photos.length, 0);
  assert.equal((await call(`/api/analyses/${entries[0].id}`)).status, 404);
  assert.equal((await call('/api/analyses', json({ url: entries[0].url }))).status, 404);
  assert.equal((await call(`/api/analyses?cursor=${entries[0].id}`)).status, 400);
  console.log('PASS: signup survives API restart; returning login restores both results; pagination and account isolation work.');
} finally {
  await stop();
  for (const id of users) await prisma.user.delete({ where: { id } });
  await prisma.$disconnect(); await rm(dir, { recursive: true, force: true });
}
