import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp,rm,writeFile,readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const directory=await mkdtemp(path.join(tmpdir(),'divara-pipeline-'));
const root=fileURLToPath(new URL('../',import.meta.url));
process.env.DATABASE_URL=`file:${path.join(directory,'test.db')}`;
process.env.UPLOAD_DIR=path.join(directory,'uploads');
process.env.JWT_SECRET='pipeline-regression-test-secret';
process.env.LOCAL_CLASSIFIER_ENABLED='false';
process.env.AUTO_ANALYZE_UPLOADS='true';
delete process.env.ASSISTANT_MODEL_ENABLED;
let server,mock,prisma,failVision=false,inferenceCount=0;
try {
 await writeFile(path.join(directory,'test.db'),'');
 execFileSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:root,env:process.env,stdio:'pipe'});
 mock=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'qwen3-vl:4b'}]}));return;}
  let raw='';for await(const chunk of req)raw+=chunk;
  const request=JSON.parse(raw);
  assert.ok(request.format,'Structured outputs must be requested');
  const last=request.messages.at(-1);
  let answer;
  if(last.images) {
   inferenceCount++;
   const prepared=Buffer.from(last.images[0],'base64');
   assert.ok((await sharp(prepared).metadata()).width<=1280);
   answer=failVision?{garments:[{name:'Invalid',color:'red',garmentKey:'shirt',bbox:[-20,0,500,500],confidence:1}],summary:'Invalid',limitations:''}:{garments:[
    {name:'shirt',color:'navy',garmentKey:'shirt',bbox:[0,0,1000,400],confidence:0.96},
    {name:'trousers',color:'black',garmentKey:'trousers',bbox:[0,400,1000,1000],confidence:0.95},
    {name:'earrings',color:'gold',garmentKey:'earrings',bbox:[200,50,350,120],confidence:0.91},
    {name:'handbag',color:'white',garmentKey:'bag',bbox:[700,400,950,700],confidence:0.4},
   ],summary:'A shirt, trousers, earrings and a partially visible bag.',limitations:'The bag is uncertain; review all detected labels.'};
  } else {
   answer={action:'answer',reply:'Two plus two is four.',occasion:null,weather:null,style:null,color:null,garmentKey:null,targetId:null};
   if(last.content.includes('help me pick'))answer={...answer,action:'recommend',reply:'',occasion:'Wedding',garmentKey:'shirt'};
   if(last.content.includes('broken model'))answer={wrong:'schema'};
  }
  res.end(JSON.stringify({message:{content:JSON.stringify(answer)},done_reason:'stop'}));
 });
 mock.listen(0,'127.0.0.1');await new Promise(r=>mock.once('listening',r));
 process.env.OLLAMA_BASE_URL=`http://127.0.0.1:${mock.address().port}`;
 const {createApp}=await import('../src/app.ts');
 ({prisma}=await import('../src/lib/db.ts'));
 const {recoverJobs}=await import('../src/analysis/jobs.ts');
 const {respond}=await import('../src/scoring/assistant.ts');
 const {accessoryChoices}=await import('../src/scoring/accessories.ts');
 const {isSuitable,recommend}=await import('../src/scoring/recommend.ts');
 server=createApp().listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 let cookie;
 async function request(url,body,expected=200,method) {
  const response=await fetch(base+url,{method:method??(body?'POST':'GET'),headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const raw=await response.text();
  assert.equal(response.status,expected,raw);
  return {data:raw?JSON.parse(raw):null,response};
 }
 async function register(email){const result=await request('/api/auth/register',{name:'Pipeline check',email,password:'Pipeline-test-2026!'},201);cookie=result.response.headers.get('set-cookie').split(';')[0];return result.data.user;}
 const user=await register('pipeline@example.test');
 const {data:health}=await request('/api/health/models');assert.equal(health.visionInstalled,true);
 const upload=async(bytes)=>{
  const form=new FormData();form.append('image',new Blob([bytes],{type:'image/png'}),'wardrobe.png');form.append('source','camera');
  const response=await fetch(base+'/api/uploads',{method:'POST',headers:{Cookie:cookie},body:form});
  assert.equal(response.status,201);return response.json();
 };
 const wait=async(id,expected='completed')=>{
  for(let n=0;n<100;n++) {
   const {data}=await request(`/api/analyses/jobs/${id}`);
   if(['failed','completed'].includes(data.job.status)){assert.equal(data.job.status,expected,data.job.error);return data.job;}
   await new Promise(r=>setTimeout(r,30));
  }
  throw new Error('Job did not finish');
 };
 const image=await sharp({create:{width:400,height:600,channels:3,background:'#223344'}}).png().toBuffer();
 const uploaded=await upload(image);
 assert.ok(uploaded.analysisJob,'Upload automatically queues recognition');
 const done=await wait(uploaded.analysisJob.id);
 const {data:analysis}=await request(`/api/analyses/${done.analysisId}`);
 assert.equal(analysis.entry.source,'camera');assert.equal(analysis.entry.analysis.garments.length,4);
 const {data:wardrobe}=await request('/api/items');
 assert.equal(wardrobe.items.length,4);
 assert.equal(new Set(wardrobe.items.map(i=>i.image_url)).size,4);
 const shirt=wardrobe.items.find(i=>i.category==='Tops');
 const earrings=wardrobe.items.find(i=>i.subcategory==='Earrings');
 const bag=wardrobe.items.find(i=>i.subcategory==='Bag / handbag');
 assert.ok(shirt.recognition.cropped);assert.equal(shirt.source_image_url,uploaded.upload.url);
 const crop=await sharp(await readFile(path.join(directory,'uploads',path.basename(shirt.image_url)))).metadata();
 assert.equal(crop.width,400);assert.equal(crop.height,240);
 const {data:knowledge}=await request('/api/scoring/knowledge');
 const context={styles:['Formal'],occasion:'Wedding',weather:'Any'};
 assert.equal(isSuitable(bag,context,knowledge),false,'Low confidence pieces require confirmation');
 assert.ok(accessoryChoices(wardrobe.items.filter(i=>isSuitable(i,context,knowledge)),[],context,knowledge).some(i=>i.item_id===earrings.item_id));
 const exact=recommend(wardrobe.items,context,knowledge,42,[],[],false,[],[{garmentKey:'shirt',color:'navy'},{garmentKey:'trousers',color:'black'},{garmentKey:'earrings',color:'gold'}]);
 assert.ok(exact.items.some(i=>i.item_id===shirt.item_id));assert.ok(exact.items.some(i=>i.item_id===earrings.item_id));
 assert.ok(exact.selection.probability>0&&exact.selection.probability<=1);
 const impossible=recommend(wardrobe.items,context,knowledge,42,[],[],false,[],[{garmentKey:'trousers',color:'purple'}]);
 assert.equal(impossible.items.length,0,'Hard requirements cannot be silently ignored');
 await request(`/api/uploads/${uploaded.upload.id}`,undefined,409,'DELETE');
 const originalState={itemIds:wardrobe.items.filter(i=>i.category!=='Accessories').map(i=>i.item_id),context};
 const accessories=respond('suggest jewellery',wardrobe.items,knowledge,{},originalState);
 assert.ok(accessories.items.some(i=>i.item_id===earrings.item_id));
 assert.deepEqual(accessories.state.itemIds.filter(id=>id!==earrings.item_id),originalState.itemIds);
 const {data:general}=await request('/api/assistant',{message:'What is two plus two?'});
 assert.equal(general.mode,'local-model');assert.match(general.note,/four/);
 const {data:planned}=await request('/api/assistant',{message:'Can you help me pick a wedding look with a shirt?'});
 assert.equal(planned.mode,'local-model+wardrobe-tools');assert.equal(planned.state.context.occasion,'Wedding');assert.ok(planned.items.length);
 const {data:fallback}=await request('/api/assistant',{message:'broken model please'});
 assert.ok(fallback.modelWarning);assert.equal(fallback.mode,'wardrobe-tools');
 await request(`/api/items/${shirt.item_id}/confirm`,{});
 const {data:confirmed}=await request(`/api/items/${bag.item_id}/confirm`,{});
 assert.equal(confirmed.item.labels_confirmed,true);
 assert.equal(isSuitable(confirmed.item,context,knowledge),true);
 const removed=respond('no jewellery',wardrobe.items,knowledge,{}, {itemIds:wardrobe.items.map(i=>i.item_id),context});
 assert.ok(removed.items.some(i=>i.item_id===bag.item_id));assert.ok(!removed.items.some(i=>i.item_id===earrings.item_id));
 await request(`/api/items/${shirt.item_id}`,{product_name:'Reviewed navy shirt',image_url:shirt.image_url},200,'PATCH');
 const {data:training}=await request('/api/training/export');
 assert.equal(training.examples.length,2);assert.ok(training.examples.every(e=>e.bboxVerified===false));
 assert.equal(new Set(training.examples.map(e=>e.split)).size,1,'All crops from one source stay in one split');
 assert.ok(training.examples.some(e=>e.name==='Reviewed navy shirt'));
 const exportPath=path.join(directory,'export');
 execFileSync(process.execPath,['--import','tsx','scripts/export-training.mjs','--user-email',user.email,'--out',exportPath],{cwd:root,env:process.env,stdio:'pipe'});
 assert.equal(JSON.parse(await readFile(path.join(exportPath,'manifest.json'),'utf8')).examples.length,2);
 await request(`/api/items/${shirt.item_id}`,undefined,204,'DELETE');
 assert.equal((await request('/api/training/export')).data.examples.length,1);
 const duplicated=await upload(image);await wait(duplicated.analysisJob.id);
 assert.equal(inferenceCount,1,'Identical upload reuses inference');
 assert.equal(await prisma.clothingItem.count({where:{userId:user.id}}),4,'No duplicate pieces');
 failVision=true;
 const secondImage=await sharp({create:{width:400,height:600,channels:3,background:'#665544'}}).png().toBuffer();
 const failed=await upload(secondImage);await wait(failed.analysisJob.id,'failed');
 assert.equal(await prisma.clothingItem.count({where:{userId:user.id}}),4,'Failed inference creates no pieces');
 failVision=false;
 const {data:retried}=await request('/api/analyses/jobs',{url:failed.upload.url,source:'camera',retry:true},202);
 await wait(retried.job.id);
 assert.equal(await prisma.clothingItem.count({where:{userId:user.id}}),8);
 await prisma.analysisJob.update({where:{id:retried.job.id},data:{status:'running'}});
 await recoverJobs();await wait(retried.job.id);
 assert.equal(await prisma.clothingItem.count({where:{userId:user.id}}),8,'Recovery is idempotent');
 const ownerCookie=cookie;
 await register('other-pipeline@example.test');
 await request(`/api/analyses/jobs/${done.id}`,undefined,404);
 const foreign=await fetch(base+shirt.image_url,{headers:{Cookie:cookie}});assert.equal(foreign.status,404);
 cookie=undefined;assert.equal((await fetch(base+shirt.image_url)).status,401);
 cookie=ownerCookie;assert.equal((await fetch(base+earrings.image_url,{headers:{Cookie:cookie}})).status,200);
 console.log('PASS: camera upload → durable job → structured detection → individual crops → wardrobe; low-confidence review; jewellery; natural-language model plans; fallback; human labels + grouped export; cache/dedup; failure/retry/recovery; private images and account isolation. Inference is mocked here; real-model quality is tested separately.');
} finally {
 if(server)await new Promise(r=>server.close(r));
 if(mock)await new Promise(r=>mock.close(r));
 if(prisma)await prisma.$disconnect();
 await rm(directory,{recursive:true,force:true});
}
