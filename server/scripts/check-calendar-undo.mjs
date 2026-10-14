import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {PrismaClient} from '@prisma/client';
const dir=await mkdtemp(path.join(tmpdir(),'divara-calendar-'));process.env.UPLOAD_DIR=dir;
const {createApp}=await import('../src/app.ts');const prisma=new PrismaClient();const users=[];let cookie,server,base;
async function start(){server=createApp().listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});base=`http://127.0.0.1:${server.address().port}`;}
const json=(body,method='POST')=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const call=(url,opts={})=>fetch(base+url,{...opts,headers:{...(cookie?{Cookie:cookie}:{}),...opts.headers}});
const password='Calendar-test-72836';
async function account(){const email=`calendar-${crypto.randomUUID()}@example.test`;const r=await call('/api/auth/register',json({name:'Calendar test',email,password}));assert.equal(r.status,201);users.push((await r.json()).user.id);cookie=r.headers.get('set-cookie').split(';')[0];return email;}
const closet=async()=>(await(await call('/api/items')).json());const trash=async()=>(await(await call('/api/wardrobe-photos/trash')).json());
try{
 await start();assert.equal((await call('/api/calendar?month=2026-10')).status,401);const email=await account();
 const bytes=await readFile('../public/images/outfit-before.png');const upload=async()=>{const f=new FormData();f.append('image',new File([bytes],'photo.png',{type:'image/png'}));return call('/api/uploads',{method:'POST',body:f});};const photo=(await(await upload()).json()).upload;
 const make=async(name)=>{const r=await call('/api/items',json({product_name:name,category:'Tops',subcategory:'Shirt',color:'White',colorHex:'#FFFFFF',style:'Casual',material:'Cotton',image_url:photo.url}));assert.equal(r.status,201);return(await r.json()).item;};const a=await make('Calendar shirt');const b=await make('Other piece');const photoId=(await closet()).photos[0].id;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=key=>parts.find(x=>x.type===key).value;const today=`${p('year')}-${p('month')}-${p('day')}`;const tomorrow=new Date(`${today}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);const future=tomorrow.toISOString().slice(0,10);
 const plan=async(date)=>{const r=await call(`/api/calendar/${date}`,json({label:'College look',occasion:'College',itemIds:[a.item_id,'DV-0001']},'PUT'));assert.equal(r.status,200);return(await r.json()).entry;};
 assert.equal(a.laundry_status,'clean');
 const reviewed={material:'Silk',pattern:'Striped',fit:'Tailored',season:['Winter'],occasion:['Party'],formality_score:88,trend_score:90};
 assert.equal((await call(`/api/items/${a.item_id}`,json(reviewed,'PATCH'))).status,200);
 assert.equal((await call(`/api/items/${a.item_id}`,json({laundry_status:'dirty'},'PATCH'))).status,400);
 assert.equal((await call(`/api/items/${a.item_id}`,json({laundry_status:'in-laundry'},'PATCH'))).status,200);
 const preserved=(await closet()).items.find(i=>i.item_id===a.item_id);for(const [key,value] of Object.entries(reviewed))assert.deepEqual(preserved[key],value,`Laundry-only edits must preserve ${key}`);
 assert.equal((await call(`/api/calendar/${today}`,json({label:'Unavailable',itemIds:[a.item_id]},'PUT'))).status,409);
 assert.equal((await call(`/api/items/${a.item_id}`,json({laundry_status:'clean'},'PATCH'))).status,200);
 assert.equal((await call(`/api/items/${b.item_id}`,json({laundry_status:'in-laundry'},'PATCH'))).status,200);
 const entry=await plan(today);assert.equal(entry.items[0].owned,true);assert.equal(entry.items[1].owned,false);assert.equal((await call('/api/calendar/2026-02-30',json({label:'Bad',itemIds:[a.item_id]},'PUT'))).status,400);
 const futurePlan=await plan(future);assert.equal((await call(`/api/calendar/${futurePlan.id}/worn`,json({timezone:'Asia/Kolkata'}))).status,400);
 for(let i=0;i<2;i++)assert.equal((await call(`/api/calendar/${entry.id}/worn`,json({timezone:'Asia/Kolkata'}))).status,200);
 assert.equal((await closet()).items.find(i=>i.item_id===a.item_id).wear_count,1);assert.equal((await call(`/api/calendar/${today}`,json({label:'Replace worn',itemIds:[b.item_id]},'PUT'))).status,409);
 assert.equal((await call(`/api/items/${b.item_id}`,{method:'DELETE'})).status,204);assert.equal((await closet()).items.length,1);assert.equal((await trash()).items.length,1);
 assert.equal((await call(`/api/wardrobe-photos/${photoId}`,{method:'DELETE'})).status,204);assert.equal((await closet()).items.length,0);assert.equal((await closet()).photos.length,0);assert.equal((await trash()).photos.length,1);assert.equal((await upload()).status,409);assert.equal((await call(`/api/items/${a.item_id}/restore`,json({}))).status,409);
 await new Promise(r=>server.close(r));await start();const login=await call('/api/auth/login',json({email,password}));assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await trash()).photos.length,1);assert((await(await call(`/api/calendar?month=${today.slice(0,7)}`)).json()).entries.find(e=>e.id===entry.id).wornAt);
 assert.equal((await call(`/api/wardrobe-photos/${photoId}/restore`,json({}))).status,204);assert.equal((await closet()).items.length,1,'Earlier independent deletion must stay deleted');assert.equal((await closet()).photos.length,1);assert.equal((await trash()).items[0].item_id,b.item_id);
 assert.equal((await call(`/api/items/${b.item_id}/restore`,json({}))).status,204);assert.equal((await closet()).items.length,2);assert.equal((await closet()).items.find(i=>i.item_id===b.item_id).laundry_status,'in-laundry','Laundry status survives restart, returning login, and Trash restoration');assert.equal((await call(`/api/items/${b.item_id}`,json({laundry_status:'clean'},'PATCH'))).status,200);
 await account();assert.equal((await call(`/api/items/${a.item_id}`,json({laundry_status:'in-laundry'},'PATCH'))).status,404);assert.equal((await call(`/api/items/${a.item_id}`,{method:'DELETE'})).status,404);assert.equal((await call(`/api/wardrobe-photos/${photoId}`,{method:'DELETE'})).status,404);assert.equal((await call(`/api/wardrobe-photos/${photoId}/restore`,json({}))).status,404);assert.equal((await call(`/api/calendar/${entry.id}/worn`,json({}))).status,404);assert.equal((await call(`/api/calendar/${today}`,json({label:'Not mine',itemIds:[a.item_id]},'PUT'))).status,400);assert.equal((await trash()).items.length,0);assert.equal((await(await call(`/api/calendar?month=${today.slice(0,7)}`)).json()).entries.length,0);
 console.log('PASS: calendar dates, saved plans, future-wear prevention, idempotent wear counts, photo/piece recovery, independent deletions, returning login/API restart persistence, account isolation, and persistent laundry status.');
}finally{if(server)await new Promise(r=>server.close(r));for(const id of users)await prisma.user.delete({where:{id}});await prisma.$disconnect();await rm(dir,{recursive:true,force:true});}
