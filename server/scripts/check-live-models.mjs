// Real, installed-model smoke test. No cloud requests or model downloads.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
if(!process.argv[2])throw new Error('Pass a local outfit image path. This test uses a fresh, temporary account and database.');
const root=fileURLToPath(new URL('../',import.meta.url));
const directory=await mkdtemp(path.join(tmpdir(),'divara-live-'));
process.env.DATABASE_URL=`file:${path.join(directory,'test.db')}`;
process.env.UPLOAD_DIR=path.join(directory,'uploads');
process.env.JWT_SECRET='live-test-only-secret';
process.env.AUTO_ANALYZE_UPLOADS='true';
process.env.ASSISTANT_MODEL_ENABLED='true';
let server,prisma;
try {
 await writeFile(path.join(directory,'test.db'),'');
 execFileSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:root,env:process.env,stdio:'pipe'});
 const {createApp}=await import('../src/app.ts');
 ({prisma}=await import('../src/lib/db.ts'));
 server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 let cookie;
 const call=async(url,body)=>{
  const response=await fetch(base+url,{method:body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return {response,data};
 };
 const registered=await call('/api/auth/register',{name:'Disposable live-model test',email:'live@example.test',password:'Live-test-2026!'});
 cookie=registered.response.headers.get('set-cookie').split(';')[0];
 const form=new FormData();form.append('image',new Blob([await readFile(process.argv[2])],{type:'image/png'}),'outfit.png');form.append('source','camera');
 const started=Date.now();
 const uploaded=await fetch(base+'/api/uploads',{method:'POST',headers:{Cookie:cookie},body:form});
 assert.equal(uploaded.status,201);const {analysisJob}=await uploaded.json();assert.ok(analysisJob);
 console.log('Real camera-image recognition queued.');
 let completed;
 for(let n=0;n<360;n++) {
  const {data:{job}}=await call(`/api/analyses/jobs/${analysisJob.id}`);
  if(job.status==='failed')throw new Error(job.error);
  if(job.status==='completed'){completed=job;break;}
  await new Promise(r=>setTimeout(r,1000));
 }
 assert.ok(completed,'Real recognition exceeded six minutes');
 const {data:{entry}}=await call(`/api/analyses/${completed.analysisId}`);
 const {data:{items}}=await call('/api/items');
 assert.ok(items.length>=2);assert.ok(items.filter(i=>i.recognition?.cropped).length>=2);
 console.log(`PASS: real recognition → ${items.length} saved wardrobe pieces in ${Math.round((Date.now()-started)/1000)}s. Labels: ${items.map(i=>i.product_name).join('; ')}`);
 const chatStarted=Date.now();
 const {data:chat}=await call('/api/assistant',{message:'What is two plus two? Answer briefly.'});
 assert.equal(chat.mode,'local-model',chat.modelWarning);assert.match(chat.note,/4|four/i);
 console.log(`PASS: real conversational model answered ${JSON.stringify(chat.note)} in ${Math.round((Date.now()-chatStarted)/1000)}s.`);
 const {data:look}=await call('/api/assistant',{message:'What should I wear for a wedding?'});
 assert.ok(look.items.length);assert.equal(look.state.context.occasion,'Wedding');
 console.log('PASS: real HTTP upload, durable job, inference, crop import, wardrobe retrieval, model chat and outfit recommendation. Test data removed.');
} finally {
 if(server)await new Promise(r=>server.close(r));
 if(prisma)await prisma.$disconnect();
 await rm(directory,{recursive:true,force:true});
}
