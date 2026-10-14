// Run from server/: node --env-file=.env --import tsx scripts/check-photo-wardrobe.mjs
// Tests import behavior with controlled model fixtures; no inference/downloads.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const dir=await mkdtemp(path.join(tmpdir(),'divara-wardrobe-'));
process.env.UPLOAD_DIR=dir;
const {createApp}=await import('../src/app.ts');
const prisma=new PrismaClient();const users=[];let cookie;
const server=createApp().listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
const base=`http://127.0.0.1:${server.address().port}`;
const json=(data,method='POST')=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
const call=(url,options={})=>fetch(base+url,{...options,headers:{...(cookie?{Cookie:cookie}:{}),...options.headers}});
async function account(){const r=await call('/api/auth/register',json({name:'Wardrobe test',email:`closet-${crypto.randomUUID()}@example.test`,password:'Wardrobe-test-72836'}));assert.equal(r.status,201);users.push((await r.json()).user.id);cookie=r.headers.get('set-cookie').split(';')[0];return users.at(-1);}
async function upload(bytes,source='photo'){const form=new FormData();form.append('image',new File([bytes],'wardrobe.png',{type:'image/png'}));form.append('source',source);const r=await call('/api/uploads',{method:'POST',body:form});assert.equal(r.status,201);return(await r.json()).upload;}
async function seed(userId,upload,bytes,garments){await prisma.outfitAnalysis.create({data:{userId,uploadId:upload.id,imageHash:createHash('sha256').update(bytes).digest('hex'),model:'test-fixture',result:{garments,score:garments.length?80:null,summary:garments.length?'Visible outfit.':'No clothing visible.',corrections:garments.length?['Try a contrasting accessory.']:[],limitations:''}}});}
try{
 const userId=await account();const bytes=await readFile('../public/images/outfit-before.png');const photo=await upload(bytes,'camera');
 let closet=await(await call('/api/items')).json();assert.equal(closet.items.length,0);assert.equal(closet.photos.length,1);assert.equal(closet.photos[0].source,'camera');assert.equal(closet.photos[0].status,'needs-analysis');
 await seed(userId,photo,bytes,[{name:'T-shirt',color:'white'},{name:'Jeans',color:'black'},{name:'Sneakers',color:'red'}]);
 closet=await(await call('/api/items')).json();assert.equal(closet.items.length,3);assert.deepEqual(closet.items.map(i=>i.category).sort(),['Bottoms','Shoes','Tops']);assert(closet.items.every(i=>i.image_url===photo.url&&i.photo_id&&i.owned&&i.needs_review));assert.equal(closet.photos[0].status,'identified');
 assert.equal((await call(`/api/uploads/${photo.id}`,{method:'DELETE'})).status,409,'Protect photos used by saved pieces');
 const duplicate=await upload(bytes);let response=await call('/api/analyses',json({url:duplicate.url}));assert.equal(response.status,200);closet=await(await call('/api/items')).json();assert.equal(closet.items.length,3);assert.equal(closet.photos.length,1);
 const piece=closet.items[0];response=await call(`/api/items/${piece.item_id}`,json({product_name:'My reviewed piece',style:'Casual',material:'Cotton',pattern:'Solid',fit:'Regular'},'PATCH'));assert.equal(response.status,200);assert.equal((await response.json()).item.needs_review,false);
 response=await call(`/api/items/${piece.item_id}/wear`,json({}));assert.equal(response.status,200);const worn=(await response.json()).item;assert.equal(worn.wear_count,1);assert.equal(worn.last_worn_days_ago,0);
 assert.equal((await call(`/api/items/${piece.item_id}`,{method:'DELETE'})).status,204);assert.equal((await(await call('/api/items')).json()).items.length,2,'Removed pieces must not be imported again');
 const blank=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64');const unrecognized=await upload(blank);await seed(userId,unrecognized,blank,[]);
 closet=await(await call('/api/items')).json();assert.equal(closet.items.length,2);assert.equal(closet.photos.find(p=>p.url===unrecognized.url).status,'needs-review');
 const manual={product_name:'My white shirt',category:'Tops',subcategory:'Shirt',color:'White',colorHex:'#FFFFFF',style:'Casual',material:'Cotton',image_url:unrecognized.url};response=await call('/api/items',json(manual));assert.equal(response.status,201);closet=await(await call('/api/items')).json();assert.equal(closet.photos.find(p=>p.url===unrecognized.url).status,'identified');
 await account();closet=await(await call('/api/items')).json();assert.equal(closet.items.length,0);assert.equal(closet.photos.length,0);assert.equal((await call(`/api/items/${piece.item_id}`,json({style:'Formal'},'PATCH'))).status,404);assert.equal((await call('/api/items',json({...manual,image_url:photo.url}))).status,400);
 console.log('PASS: every photo saved immediately; camera source retained; recognized pieces imported with real source photos; duplicates skipped; details editable; deleted pieces stay deleted; unidentified photos saved for manual entry; account isolation.');
}finally{await new Promise(resolve=>server.close(resolve));for(const id of users)await prisma.user.delete({where:{id}});await prisma.$disconnect();await rm(dir,{recursive:true,force:true});}
