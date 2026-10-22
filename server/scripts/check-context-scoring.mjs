// Disposable-account local integration checks; no downloads or model calls.
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {PrismaClient} from '@prisma/client';
const dir=await mkdtemp(path.join(tmpdir(),'divara-context-'));process.env.UPLOAD_DIR=dir;
const {createApp}=await import('../src/app.ts');
const {imageHash}=await import('../src/analysis/identity.ts');
const {matchGarment,GARMENTS}=await import('../src/scoring/knowledge.ts');
const {evaluate,fingerprint}=await import('../src/scoring/score.ts');
const prisma=new PrismaClient();const users=[];let server,base,cookie,email;
const password='Local-demo-scoring-8234';
const json=(body,method='POST')=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function start(){server=createApp().listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});base=`http://127.0.0.1:${server.address().port}/api`;}
async function stop(){if(server)await new Promise(r=>server.close(r));server=null;}
const call=(url,opt={})=>fetch(base+url,{...opt,headers:{...(cookie?{Cookie:cookie}:{}),...opt.headers}});
async function ok(url,opt){const r=await call(url,opt);const body=await r.json();assert.equal(r.status,200,JSON.stringify(body));return body;}
async function account(){email=`context-${crypto.randomUUID()}@example.test`;const r=await call('/auth/register',json({name:'Context test',email,password}));assert.equal(r.status,201);const u=(await r.json()).user;users.push(u.id);cookie=r.headers.get('set-cookie').split(';')[0];return u;}
const profile=styles=>({name:'Context test',styles,colors:['Ivory'],fits:['Regular'],occasions:['Casual'],climate:'Hot & humid',goals:[]});
async function photo(bytes,name){const f=new FormData();f.append('image',new File([bytes],name,{type:'image/png'}));f.append('source','camera');const r=await call('/uploads',{method:'POST',body:f});assert.equal(r.status,201);return(await r.json()).upload;}
const recognition={garments:[{name:'t-shirt',color:'white'},{name:'jeans',color:'black'},{name:'sneakers',color:'white'}],score:80,summary:'Fixture outfit.',corrections:['Old fixture opinion'],limitations:''};
const garments=[{garmentKey:'tee',color:'white',style:'Casual',originalIndex:0},{garmentKey:'jeans',color:'black',style:'Casual',originalIndex:1},{garmentKey:'sneakers',color:'white',style:'Casual',originalIndex:2}];
try{
 await start();const user=await account();const mainEmail=email;await ok('/profile',json(profile(['Casual']),'PUT'));
 const knowledge=await ok('/scoring/knowledge');
 assert.equal(knowledge.garments.length,GARMENTS.length);assert.equal(knowledge.occasions.length,11);assert.equal(knowledge.weather.length,5);assert.equal(knowledge.sources.length,4);
 for(const key of ['earrings','necklace','bracelet','ring','bag'])assert.ok(knowledge.garments.some(g=>g.key===key));
 assert.equal((await ok('/scoring/colour-match',json({colors:['White','Black']}))).score,95);
 assert.equal((await ok('/scoring/colour-match',json({colors:['constructor','white']}))).score,null);
 assert.equal((await ok('/scoring/colour-match',json({colors:['Blush','Denim Blue','Emerald']}))).score===null,false);
 assert.equal(await prisma.clothingGuide.count({where:{version:knowledge.version}}),GARMENTS.length+25);
 assert.equal(matchGarment('white t-shirt',knowledge.garments).key,'tee');assert.equal(matchGarment('rain jacket',knowledge.garments).key,'raincoat');
 const bytes=await readFile('../public/images/outfit-before.png'),first=await photo(bytes,'first.png');
 const a=await prisma.outfitAnalysis.create({data:{userId:user.id,uploadId:first.id,imageHash:imageHash(bytes),model:'fixture',result:{...recognition,source:'camera'}}});
 const payload={analysisId:a.id,garments,context:{occasion:'Casual',weather:'Any'}};
 const firstScore=await ok('/scoring/assessments',json(payload));assert.equal(firstScore.reused,false);assert.equal(firstScore.assessment.score,97);assert.deepEqual(firstScore.assessment.weights,{style:40,color:30,occasion:30,weather:0});
 const ids=(await ok('/items')).items.filter(i=>i.photo_id).map(i=>i.item_id);assert.equal(ids.length,3);
 const reviewed=await prisma.clothingItem.findMany({where:{userId:user.id}});assert.ok(reviewed.every(i=>i.style==='Casual'));assert.equal(reviewed.find(i=>i.category==='Bottoms').colorHex,'#1C1C1C');
 for(const r of await Promise.all([ok('/scoring/assessments',json({...payload,garments:[...garments].reverse()})),ok('/scoring/assessments',json(payload))])){assert.equal(r.assessment.id,firstScore.assessment.id);assert.equal(r.assessment.score,97);assert.equal(r.reused,true);}
 const bytes2=Buffer.concat([bytes,Buffer.from('\nsecond-photo')]),second=await photo(bytes2,'second.png');
 const b=await prisma.outfitAnalysis.create({data:{userId:user.id,uploadId:second.id,imageHash:imageHash(bytes2),model:'fixture',result:{...recognition,score:85,source:'photo'}}});
 assert.equal((await ok('/scoring/assessments',json({...payload,analysisId:b.id}))).assessment.id,firstScore.assessment.id,'Same confirmed outfit across different photos');
 assert.equal((await ok('/scoring/assessments',json({itemIds:ids,context:payload.context}))).assessment.id,firstScore.assessment.id,'Same photo and wardrobe rubric');
 const formal=await ok('/scoring/assessments',json({...payload,context:{occasion:'Formal',weather:'Any'}}));assert.ok(formal.assessment.score<97);
 const cold=await ok('/scoring/assessments',json({...payload,context:{occasion:'Casual',weather:'Cold'}}));assert.ok(cold.assessment.score<97);assert.equal(cold.assessment.breakdown.weather,45);assert.deepEqual(cold.assessment.weights,{style:40,color:30,occasion:20,weather:10});
 const rain=await ok('/scoring/assessments',json({...payload,context:{occasion:'Casual',weather:'Rainy'}}));assert.equal(rain.assessment.breakdown.weather,55);assert.ok(rain.assessment.sources.some(s=>s.id==='rei-layers'));
 await ok('/profile',json(profile(['Formal']),'PUT'));
 const changed=await ok('/scoring/assessments',json(payload));assert.equal(changed.assessment.breakdown.style,40);assert.equal(changed.assessment.score,73);
 assert.equal((await ok(`/scoring/assessments/${firstScore.assessment.id}`)).assessment.score,97,'Immutable old result');
 assert.equal((await ok('/scoring/assessments',json({...payload,context:{...payload.context,style:'Casual'}}))).assessment.id,firstScore.assessment.id);
 assert.equal((await ok('/scoring/assessments',json({...payload,garments:garments.slice(0,1)}))).assessment.score,null);
 await ok('/scoring/assessments',json({...payload,garments:garments.map((g,i)=>i===0?{...g,style:'Minimal',color:'ivory'}:g)}));
 assert.equal((await prisma.clothingItem.findFirst({where:{userId:user.id,photoId:reviewed[0].photoId,recognitionIndex:0}})).style,'Minimal');
 assert.equal((await call('/scoring/assessments',json({...payload,garments:[{...garments[0],color:'constructor'},...garments.slice(1)]}))).status,400);
 assert.equal(evaluate([{garmentKey:'tee',style:'Unknown',color:'constructor'},{garmentKey:'jeans',style:'Casual',color:'black'}],{styles:['Casual'],occasion:'Casual',weather:'Any'},knowledge).score,null);
 assert.equal(fingerprint(garments,{styles:['Casual'],occasion:'Casual',weather:'Any'},knowledge.version),fingerprint([...garments].reverse(),{styles:['Casual'],occasion:'Casual',weather:'Any'},knowledge.version));
 const picks=await ok('/scoring/recommendations',json({context:{occasion:'Casual',weather:'Cold',style:'Casual'}}));assert.equal(picks.items.length,0,'Cold outfit cannot be fabricated without a warm layer');assert.match(picks.note,/warm/);
 await ok(`/items/${ids[1]}`,json({laundry_status:'in-laundry'},'PATCH'));
 assert.equal((await call('/scoring/assessments',json({itemIds:ids,context:payload.context}))).status,409);
 assert.ok((await ok('/scoring/recommendations',json({context:{occasion:'Casual',weather:'Any',style:'Casual'}}))).items.every(i=>i.item_id!==ids[1]));
 await stop();await start();cookie=undefined;const login=await call('/auth/login',json({email:mainEmail,password}));assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 assert.equal((await ok(`/scoring/assessments/${firstScore.assessment.id}`)).assessment.score,97);assert.equal((await ok('/profile')).profile.styles[0],'Formal');
 await account();assert.equal((await call(`/scoring/assessments/${firstScore.assessment.id}`)).status,404);assert.equal((await call('/scoring/assessments',json(payload))).status,404);assert.equal((await ok('/scoring/assessments')).entries.length,0);
 assert.equal((await ok('/scoring/recommendations',json({context:{occasion:'Casual',weather:'Any',style:'Casual'}}))).items.length,0);
 const demo=await ok('/scoring/recommendations',json({includeSamples:true,context:{occasion:'Casual',weather:'Any',style:'Casual'}}));assert.ok(demo.items.length);assert.ok(demo.items.every(i=>!i.owned));
 cookie=undefined;assert.equal((await call('/scoring/knowledge')).status,401);
 console.log('PASS: versioned database rules, including jewellery; repeat/different-photo/wardrobe consistency; style/occasion/weather affect explained scores; immutable results survive login/restart; confirmed edits persist; partial/unknown inputs unscored; own clean suggestions and optional samples; account isolation.');
}finally{await stop();for(const id of users)await prisma.user.delete({where:{id}});await prisma.$disconnect();await rm(dir,{recursive:true,force:true});}
