import { Router } from 'express';
import { z } from 'zod';
import type { Prisma, OutfitAssessment } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { HttpError } from '../lib/errors.js';
import { loadKnowledge, matchGarment, OCCASIONS, WEATHER, STYLES } from '../scoring/knowledge.js';
import { canonicalColor, COLORS, colorCompatibility,evaluate, fingerprint, type ConfirmedGarment, type AssessmentResult } from '../scoring/score.js';
import { toClient } from './items.js';
import { SAMPLE_ITEMS } from '../data/samples.js';
import { validateAnalysis } from '../vision/analyze.js';
import { recommend } from '../scoring/recommend.js';
import { importAnalysis } from '../wardrobe/photos.js';
const contextSchema=z.object({occasion:z.enum(OCCASIONS).default('Casual'),weather:z.enum(WEATHER).default('Any'),style:z.enum(STYLES).optional()});
const garmentSchema=z.object({garmentKey:z.string().trim().min(1).max(60),color:z.string().trim().min(1).max(60),style:z.enum(STYLES),originalIndex:z.number().int().min(0).max(11).optional()});
const COLOR_HEX:Record<string,string>={black:'#1C1C1C',white:'#F5F4EF',ivory:'#EEE8DA',cream:'#F2EBDD',grey:'#888888',charcoal:'#333333',beige:'#D8C5A5',camel:'#B88B5A',brown:'#795548',navy:'#233A59',red:'#B93636',burgundy:'#6E1E3C',pink:'#DFA8B0',orange:'#CE8745',rust:'#A64B32',yellow:'#E4C84A',mustard:'#C7A233',green:'#55764C',olive:'#768044',sage:'#A1B09A',teal:'#3E8989',blue:'#527DA7',purple:'#79558C',lavender:'#BCA4D0'};
const json=(value:unknown)=>value as Prisma.InputJsonValue;
const entry=(row:OutfitAssessment)=>({id:row.id,analysisId:row.analysisId,createdAt:row.createdAt.toISOString(),...row.result as unknown as AssessmentResult});
export const scoringRouter=Router();
scoringRouter.use(requireAuth);
scoringRouter.get('/knowledge',async(_req,res)=>res.json({...await loadKnowledge(),colors:COLORS}));
scoringRouter.post('/recommendations',async(req,res)=>{
 const input=z.object({context:contextSchema.default({occasion:'Casual',weather:'Any'}),includeSamples:z.boolean().default(false),colors:z.array(z.string().max(60)).max(4).optional(),excludedKeys:z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(50).default([]),seed:z.number().int().min(0).max(1000000).default(0)}).parse(req.body);
 const knowledge=await loadKnowledge();
 const profile=await prisma.profile.findUnique({where:{userId:req.userId}});
 const prefs=profile?.data as {styles?:string[];colors?:string[]}|undefined;
 const styles=input.context.style?[input.context.style]:prefs?.styles?.filter(s=>knowledge.styles.includes(s))??[];
 if(!styles.length)styles.push('Casual');
 const owned=await prisma.clothingItem.findMany({where:{userId:req.userId,deletedAt:null,laundryStatus:'clean'}});
 const items=[...owned.map(toClient),...(input.includeSamples?SAMPLE_ITEMS.map(i=>({...i,owned:false,laundry_status:'clean'})):[])];
 const recent=await prisma.outfitAssessment.findMany({where:{userId:req.userId,version:knowledge.version+'-auto-v4'},orderBy:{createdAt:'desc'},select:{context:true,fingerprint:true,garments:true}});
 const matching=recent.filter(r=>{const c=r.context as typeof input.context & {styles:string[]};return c.occasion===input.context.occasion&&c.weather===input.context.weather&&JSON.stringify([...c.styles].sort())===JSON.stringify([...styles].sort());});
 const seen=matching.map(r=>r.fingerprint);
 res.json(recommend(items,{styles,occasion:input.context.occasion,weather:input.context.weather},knowledge,input.seed,input.colors??prefs?.colors??[],[...seen,...input.excludedKeys],Boolean(input.colors?.length),matching.map(r=>r.garments as unknown as ConfirmedGarment[])));
});
scoringRouter.post('/colour-match',async(req,res)=>{
 const {colors}=z.object({colors:z.array(z.string().trim().min(1).max(60)).max(12)}).parse(req.body);
 const score=colorCompatibility(colors);
 res.json({score,explanation:score===null?'Choose supported colours to compare them.':`These colours score ${score} under the same colour-coordination rules used by outfit analysis. Any pair with a neutral scores 95; other pairs scale smoothly with the hue gap, so matching and complementary colours score highest and clashing mid-gaps lowest.`});
});
scoringRouter.get('/assessments',async(req,res)=>{
 const limit=z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
 const rows=await prisma.outfitAssessment.findMany({where:{userId:req.userId},orderBy:[{createdAt:'desc'},{id:'desc'}],take:limit,include:{analysis:{include:{upload:true}}}});
 res.json({entries:rows.map(r=>({...entry(r),url:r.analysis?`/uploads/${r.analysis.upload.filename}`:null,source:r.analysis?((r.analysis.result as {source?:string}).source??'photo'):'wardrobe'}))});
});
scoringRouter.get('/assessments/:id',async(req,res)=>{
 const row=await prisma.outfitAssessment.findFirst({where:{id:req.params.id,userId:req.userId}});
 if(!row)throw new HttpError(404,'Result not found');res.json({assessment:entry(row)});
});
scoringRouter.post('/assessments',async(req,res)=>{
 const input=z.object({automatic:z.boolean().default(false),analysisId:z.string().max(100).optional(),itemIds:z.array(z.string().max(100)).min(1).max(12).optional(),garments:z.array(garmentSchema).min(1).max(12).optional(),context:contextSchema.default({occasion:'Casual',weather:'Any'})})
  .refine(v=>Boolean(v.itemIds)!==Boolean(v.analysisId&&(v.garments||v.automatic)),'Choose wardrobe items or confirm a photo analysis').parse(req.body);
 const knowledge=await loadKnowledge();
 const profile=await prisma.profile.findUnique({where:{userId:req.userId}});
 const prefs=profile?.data as {styles?:string[];colors?:string[]}|undefined;
 const styles=input.context.style?[input.context.style]:[...new Set(prefs?.styles?.filter(s=>knowledge.styles.includes(s))??[])].sort();
 if(input.automatic&&!styles.length)styles.push('Casual');
 const context={styles,occasion:input.context.occasion,weather:input.context.weather};
 let garments:ConfirmedGarment[]=[];
 let row:Awaited<ReturnType<typeof prisma.outfitAnalysis.findFirst>>=null;
 if(input.itemIds){
  const ids=[...new Set(input.itemIds)];
  const owned=await prisma.clothingItem.findMany({where:{userId:req.userId,id:{in:ids},deletedAt:null}});
  garments=ids.map(id=>{
   const real=owned.find(i=>i.id===id);const sample=SAMPLE_ITEMS.find(i=>i.item_id===id);
   if(!real&&!sample)throw new HttpError(404,'A selected piece is not available in your wardrobe');
   if(real?.laundryStatus==='in-laundry')throw new HttpError(409,`${real.name} is in laundry. Choose a clean piece.`);
   const item=real?toClient(real):sample!;
   return {garmentKey:matchGarment(item.subcategory,knowledge.garments)?.key??matchGarment(item.product_name,knowledge.garments)?.key??'unknown',color:item.color,style:item.style};
  });
 }else{
  row=await prisma.outfitAnalysis.findFirst({where:{id:input.analysisId,userId:req.userId}});
  if(!row)throw new HttpError(404,'Photo analysis not found');
  if(row.canonicalId)row=await prisma.outfitAnalysis.findFirst({where:{id:row.canonicalId,userId:req.userId}});
  if(!row)throw new HttpError(404,'Photo analysis not found');
  const photo= row.imageHash ? await prisma.wardrobePhoto.findUnique({where:{userId_imageHash:{userId:req.userId!,imageHash:row.imageHash}}}):null;
  if(photo?.deletedAt)throw new HttpError(409,'Restore this photo from Trash first');
  if(input.automatic){
   const original=validateAnalysis(row.result).garments;
   garments=original.map((g,index)=>({garmentKey:matchGarment(g.name,knowledge.garments)?.key??'unknown',color:canonicalColor(g.color),style:'Unknown',originalIndex:index}));
  }else garments=input.garments!;
  if(!input.automatic&&garments.some(g=>!knowledge.garments.some(k=>k.key===g.garmentKey)))throw new HttpError(400,'Choose a supported clothing type');
  if(!input.automatic&&garments.some(g=>!COLORS.includes(canonicalColor(g.color))))throw new HttpError(400,'Choose a supported main colour');
  const original=validateAnalysis(row.result).garments;
  if(garments.some(g=>g.originalIndex===undefined||g.originalIndex>=original.length)||new Set(garments.map(g=>g.originalIndex)).size!==garments.length)throw new HttpError(400,'Confirm each detected piece once');
  await importAnalysis(row);
  // Refine imported pieces, preserving independently edited or deleted clothes.
  if(photo&&!input.automatic){
   const items=await prisma.clothingItem.findMany({where:{userId:req.userId,photoId:photo.id,deletedAt:null}});
   const used=new Set<string>();
   await prisma.$transaction(async tx=>{
    for(const garment of garments){
     const detected=original[garment.originalIndex!];const name=`${detected.color} ${detected.name}`.toLowerCase();
     const item=items.find(i=>!used.has(i.id)&&(i.recognitionIndex===garment.originalIndex||(i.recognitionIndex===null&&i.name.toLowerCase()===name)));
     if(!item)continue;used.add(item.id);
     const guide=knowledge.garments.find(g=>g.key===garment.garmentKey)!;
     await tx.clothingItem.update({where:{id:item.id},data:{recognitionIndex:garment.originalIndex,name:`${garment.color} ${guide.title}`,subcategory:guide.title,category:guide.category,color:garment.color,colorHex:COLOR_HEX[canonicalColor(garment.color)],style:garment.style}});
    }
   });
  }
 }
 const key=fingerprint(garments,context,knowledge.version+(input.automatic?'-auto-v4':''));
 const cached=await prisma.outfitAssessment.findUnique({where:{userId_fingerprint:{userId:req.userId!,fingerprint:key}}});
 if(cached){res.json({assessment:entry(cached),reused:true});return;}
 const result=evaluate(garments,context,knowledge,input.automatic);
 const owned=await prisma.clothingItem.findMany({where:{userId:req.userId,deletedAt:null,laundryStatus:'clean'}});
 const alternatives:{itemId:string;name:string;replaces:string;improvement:number}[]=[];
 if(result.score!==null){
  for(let index=0;index<garments.length;index++){
   const current=garments[index];const guide=knowledge.garments.find(g=>g.key===current.garmentKey);if(!guide)continue;
   for(const item of owned){
    const candidateGuide=matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.name,knowledge.garments);
    if(!candidateGuide||candidateGuide.category!==guide.category||!STYLES.includes(item.style as typeof STYLES[number]))continue;
    const occasionRule=knowledge.occasions.find(o=>o.key===context.occasion)!;
    if(occasionRule.avoid.includes(candidateGuide.key))continue;
    if(context.weather==='Hot'&&candidateGuide.weather.Hot<60)continue;
    if(context.weather==='Cold'&&['Bottoms','Dresses','Shoes'].includes(candidateGuide.category)&&candidateGuide.weather.Cold<60)continue;
    if(context.weather==='Rainy'&&candidateGuide.category==='Shoes'&&candidateGuide.weather.Rainy<60)continue;
    const replacement={garmentKey:candidateGuide.key,color:item.color,style:item.style};
    const trial=evaluate(garments.map((g,i)=>i===index?replacement:g),context,knowledge,input.automatic);
    if(trial.score!==null&&trial.score>result.score)alternatives.push({itemId:item.id,name:item.name,replaces:`${current.color} ${guide.title}`,improvement:trial.score-result.score});
   }
  }
 }
 const suggestions=alternatives.sort((a,b)=>b.improvement-a.improvement||a.itemId.localeCompare(b.itemId)).filter((s,i,a)=>a.findIndex(x=>x.itemId===s.itemId)===i).slice(0,3);
 const saved=await prisma.outfitAssessment.upsert({where:{userId_fingerprint:{userId:req.userId!,fingerprint:key}},create:{userId:req.userId!,analysisId:row?.id,version:result.version,fingerprint:key,garments:json(result.garments),context:json(context),result:json({...result,suggestions})},update:{}});
 res.json({assessment:entry(saved),reused:false});
});
