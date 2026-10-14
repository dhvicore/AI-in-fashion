// Run from server/: node --env-file=.env --import tsx scripts/check-analysis-consistency.mjs
// Uses conflicting old test results to verify reconciliation; no model or downloads.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { PrismaClient } from '@prisma/client';
const dir=await mkdtemp(path.join(tmpdir(),'divara-consistency-'));
process.env.UPLOAD_DIR=dir;
const {createApp}=await import('../src/app.ts');
const prisma=new PrismaClient();
let server,base,cookie;
const users=[];
const email=`consistent-${crypto.randomUUID()}@example.test`, password='Consistency-test-73624';
const json=data=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const call=(endpoint,options={})=>fetch(base+endpoint,{...options,headers:{...(cookie?{Cookie:cookie}:{}),...options.headers}});
async function start(){server=createApp().listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});base=`http://127.0.0.1:${server.address().port}`;}
async function stop(){if(server)await new Promise(resolve=>server.close(resolve));server=null;}
const bytes=await readFile('../public/images/outfit-before.png');
async function upload(name){const form=new FormData();form.append('image',new File([bytes],name,{type:'image/png'}));const r=await call('/api/uploads',{method:'POST',body:form});assert.equal(r.status,201);return(await r.json()).upload;}
try{
 await start();let r=await call('/api/auth/register',json({name:'Consistency check',email,password}));assert.equal(r.status,201);users.push((await r.json()).user.id);cookie=r.headers.get('set-cookie').split(';')[0];
 const first=await upload('first.png'),second=await upload('same-photo-different-name.png');
 const result={garments:[{name:'T-shirt',color:'white'}],score:80,summary:'First valid result.',corrections:['Try a contrasting accessory.'],limitations:''};
 const primary=await prisma.outfitAnalysis.create({data:{userId:users[0],uploadId:first.id,model:'test-fixture',result:{...result,source:'photo'},createdAt:new Date('2026-10-01T10:00:00Z')}});
 const duplicate=await prisma.outfitAnalysis.create({data:{userId:users[0],uploadId:second.id,model:'test-fixture',result:{...result,score:85,summary:'Conflicting duplicate.'},createdAt:new Date('2026-10-01T10:01:00Z')}});
 r=await call('/api/analyses');assert.equal(r.status,200);const page=await r.json();assert.equal(page.entries.length,1);assert.equal(page.entries[0].id,primary.id);assert.equal(page.entries[0].analysis.score,80);
 assert.equal((await prisma.outfitAnalysis.findUnique({where:{id:duplicate.id}})).result.score,85,'Preserve the old raw record');
 assert.equal((await(await call(`/api/analyses/${duplicate.id}`)).json()).entry.analysis.score,80,'Old links resolve to canonical output');
 const third=await upload('camera.png'),fourth=await upload('renamed.png');
 const repeated=await Promise.all([call('/api/analyses',json({url:third.url,source:'camera'})),call('/api/analyses',json({url:fourth.url,source:'photo'}))]);
 for(const response of repeated){assert.equal(response.status,200);const output=await response.json();assert.equal(output.entry.id,primary.id);assert.deepEqual(output.analysis,result);}
 await call('/api/auth/logout',json({}));cookie=undefined;await stop();await start();
 r=await call('/api/auth/login',json({email,password}));assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];
 r=await call('/api/analyses',json({url:third.url,source:'camera'}));assert.equal(r.status,200);assert.deepEqual((await r.json()).analysis,result);
 assert.equal((await(await call('/api/analyses')).json()).entries.length,1);
 r=await call('/api/auth/register',json({name:'Other account',email:`other-${crypto.randomUUID()}@example.test`,password}));users.push((await r.json()).user.id);cookie=r.headers.get('set-cookie').split(';')[0];
 assert.equal((await(await call('/api/analyses')).json()).entries.length,0);assert.equal((await call(`/api/analyses/${primary.id}`)).status,404);
 console.log('PASS: 80/85 legacy duplicates become one canonical 80; raw records preserved; identical renamed and camera uploads return identical output; consistency survives returning login and API restart; accounts isolated.');
}finally{await stop();for(const id of users)await prisma.user.delete({where:{id}});await prisma.$disconnect();await rm(dir,{recursive:true,force:true});}
