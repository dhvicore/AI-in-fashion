// Run from server/: node --env-file=.env --import tsx scripts/check-analysis-access.mjs
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../src/env.ts';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.ts';
const prisma = new PrismaClient();
const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = `http://127.0.0.1:${server.address().port}`;
const users = [];
let testFile;
const post = (url, body, cookie) => fetch(base + url, {method:'POST', headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}, body:JSON.stringify(body)});
try {
  assert.equal((await post('/api/analyses',{url:'/uploads/missing.jpg'})).status,401);
  const sessions=[];
  for(let n=0;n<2;n++){
    const response=await post('/api/auth/register',{name:'Analysis test',email:`analysis-${crypto.randomUUID()}@example.test`,password:'Test-password-63894'});
    assert.equal(response.status,201);users.push((await response.json()).user.id);sessions.push(response.headers.get('set-cookie').split(';')[0]);
  }
  const filename=`analysis-test-${crypto.randomUUID()}.jpg`;
  await mkdir(env.uploadDir, { recursive: true });
  testFile = path.join(env.uploadDir, filename);
  const bytes = await readFile('../public/images/outfit-before.png');
  await writeFile(testFile, bytes);
  const upload=await prisma.upload.create({data:{userId:users[0],filename,mimeType:'image/jpeg',size:bytes.length}});
  const result={garments:[{name:'T-shirt',color:'white'}],score:70,summary:'Cached test fixture.',corrections:['Test suggestion.'],limitations:''};
  await prisma.outfitAnalysis.create({data:{userId:users[0],uploadId:upload.id,model:'test-fixture',result}});
  let response=await post('/api/analyses',{url:`/uploads/${filename}`},sessions[0]);
  assert.equal(response.status,200);assert.deepEqual((await response.json()).analysis,result);
  assert.equal((await post('/api/analyses',{url:`/uploads/${filename}`},sessions[1])).status,404);
  assert.equal((await post('/api/analyses',{url:'../../etc/passwd'},sessions[0])).status,404);
  console.log('PASS: login required; cached result returned; other accounts and arbitrary paths rejected.');
} finally {
  await new Promise(resolve=>server.close(resolve));
  for(const id of users)await prisma.user.delete({where:{id}});
  await prisma.$disconnect();
  if (testFile) await unlink(testFile).catch(() => {});
}
