import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
const {createApp}=await import('../src/app.ts');
const {recommend:pickOutfit}=await import('../src/scoring/recommend.ts');
const {canonicalColor}=await import('../src/scoring/score.ts');
const prisma=new PrismaClient(),users=[];let cookie;
const server=createApp().listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});
const base=`http://127.0.0.1:${server.address().port}/api`,password='Recommendation-check-2026!';
const json=body=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
async function call(url,options={}){const r=await fetch(base+url,{...options,headers:{...(cookie?{Cookie:cookie}:{}),...options.headers}});const body=await r.json();assert.ok(r.ok,JSON.stringify(body));return {body,r};}
async function account(){cookie=undefined;const email=`recommend-${crypto.randomUUID()}@example.test`;const {body,r}=await call('/auth/register',json({name:'Recommendation check',email,password}));users.push(body.user.id);cookie=r.headers.get('set-cookie').split(';')[0];return {email,id:body.user.id};}
try{
 const user=await account(),{body:k}=await call('/scoring/knowledge');
 const add=async(key,color)=>{const g=k.garments.find(g=>g.key===key);await call('/items',json({product_name:`${color} ${g.title}`,category:g.category,subcategory:g.title,color,colorHex:'#333333',style:'Unknown'}));};
 for(const color of k.colors)await add('tee',color);
 for(const g of k.garments.filter(g=>g.key!=='tee'&&g.category!=='Accessories'))await add(g.key,'black');
 const recommend=async(context,extra={})=>(await call('/scoring/recommendations',json({context,seed:42,...extra}))).body;
 const casual={occasion:'Casual',weather:'Any',style:'Casual'};
 for(const color of [...k.colors,'Blush','Denim Blue','Emerald','Maroon','Light Blue']){
  const pick=await recommend(casual,{colors:[color]});assert.ok(pick.items.length,color);assert.ok(pick.items.some(i=>canonicalColor(i.color)===canonicalColor(color)),color);assert.ok(pick.items.every(i=>i.owned));
 }
 const missing=await recommend({occasion:'Formal',weather:'Any',style:'Formal'},{colors:['beige']});assert.equal(missing.items.length,0);assert.match(missing.note,/beige/);
 const tiny=[{item_id:'top',product_name:'White tee',subcategory:'T-shirt',category:'Tops',color:'white',style:'Unknown',owned:true},{item_id:'bottom',product_name:'Black pants',subcategory:'Trousers / chinos',category:'Bottoms',color:'black',style:'Unknown',owned:true},{item_id:'shoe',product_name:'Red sneakers',subcategory:'Sneakers / trainers',category:'Shoes',color:'red',style:'Unknown',owned:true}];
 const brief={styles:['Casual'],occasion:'College',weather:'Any'};
 const only=pickOutfit(tiny,brief,k,1);assert.equal(only.items.length,3);
 const done=pickOutfit(tiny,brief,k,1,[],[only.key],false,[only.items.map(i=>({garmentKey:i.category==='Tops'?'tee':i.category==='Bottoms'?'trousers':'sneakers',color:i.color,style:i.style}))]);assert.equal(done.items.length,0);assert.equal(done.exhausted,true,'Never silently recycle an exhausted wardrobe');
 const first=await recommend(casual,{colors:['olive']}),payload={automatic:true,itemIds:first.items.map(i=>i.item_id),context:casual};
 const {body:saved}=await call('/scoring/assessments',json(payload));assert.equal(typeof saved.assessment.score,'number');
 const {body:repeat}=await call('/scoring/assessments',json({...payload,itemIds:[...payload.itemIds].reverse()}));assert.equal(repeat.assessment.id,saved.assessment.id);assert.equal(repeat.assessment.score,saved.assessment.score);
 const second=await recommend(casual,{colors:['olive']});assert.notEqual(second.key,first.key,'Saved result prevents a repeated look');
 const core=items=>items.filter(i=>['Tops','Bottoms','Dresses'].includes(i.category)).map(i=>`${i.subcategory}:${canonicalColor(i.color)}`).sort().join('|');assert.notEqual(core(second.items),core(first.items),'Main clothing changes, not only shoes');
 const third=await recommend(casual,{colors:['olive'],excludedKeys:[second.key]});assert.ok(![first.key,second.key].includes(third.key));
 const {body:secondSaved}=await call('/scoring/assessments',json({automatic:true,itemIds:second.items.map(i=>i.item_id),context:casual}));
 const demoLooks=[];
 for(let n=0;n<6;n++){const pick=await recommend({occasion:'College',weather:'Cold',style:'Casual'},{includeSamples:true});assert.ok(pick.items.length);assert.ok(!demoLooks.includes(core(pick.items)),'Six genuinely different sample/owned looks');demoLooks.push(core(pick.items));await call('/scoring/assessments',json({automatic:true,itemIds:pick.items.map(i=>i.item_id),context:{occasion:'College',weather:'Cold',style:'Casual'}}));}
 for(const occasion of k.occasions.map(o=>o.key))for(const weather of ['Any','Hot','Cold','Rainy']){
  const context={occasion,weather,style:['Formal','Wedding','Interview'].includes(occasion)?'Formal':occasion==='Workout'?'Sporty':'Casual'},pick=await recommend(context);
  if(!pick.items.length){assert.ok(pick.note);continue;}
  const rule=k.occasions.find(o=>o.key===occasion),keys=pick.items.map(i=>k.garments.find(g=>g.title===i.subcategory).key);
  assert.ok(keys.every(key=>!rule.avoid.includes(key)),`${occasion}/${weather}`);
  if(occasion==='College')assert.ok(!keys.some(key=>['skirt','dress','shorts'].includes(key)));
  if(weather==='Cold'){assert.ok(!keys.some(key=>['skirt','dress','shorts','sandals'].includes(key)));assert.ok(keys.some(key=>['coat','cardigan','jacket','sweater','hoodie'].includes(key)));}
  if(weather==='Rainy')assert.ok(keys.includes('raincoat'));
  if(weather==='Hot')assert.ok(!keys.some(key=>['coat','sweater','hoodie','jacket'].includes(key)));
  const {body:score}=await call('/scoring/assessments',json({automatic:true,itemIds:pick.items.map(i=>i.item_id),context}));assert.equal(typeof score.assessment.score,'number');
 }
 const olive=await prisma.clothingItem.findFirst({where:{userId:user.id,color:'olive'}});await prisma.clothingItem.update({where:{id:olive.id},data:{laundryStatus:'in-laundry'}});
 assert.equal((await recommend(casual,{colors:['olive']})).items.length,0);
 const {r}=await call('/auth/login',json({email:user.email,password}));cookie=r.headers.get('set-cookie').split(';')[0];assert.equal((await call(`/scoring/assessments/${saved.assessment.id}`)).body.assessment.id,saved.assessment.id);
 await account();assert.equal((await recommend(casual)).items.length,0);assert.equal((await call('/scoring/assessments')).body.entries.length,0);assert.ok((await recommend(casual,{includeSamples:true})).items.every(i=>!i.owned));
 console.log('PASS: all 24 colours and aliases; unavailable-colour feedback; numeric stable scores; history after login; backend repeat avoidance; 44 occasion/weather requests; college exclusions; cold/rain layers; laundry and account isolation.');
}finally{await new Promise(r=>server.close(r));for(const id of users)await prisma.user.delete({where:{id}});await prisma.$disconnect();}
