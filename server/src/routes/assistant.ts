import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { toClient } from './items.js';
import { SAMPLE_ITEMS } from '../data/samples.js';
import { loadKnowledge, matchGarment, OCCASIONS, WEATHER, STYLES } from '../scoring/knowledge.js';
import { converse } from '../scoring/conversation.js';
import { evaluate, fingerprint, type ScoreContext, type ConfirmedGarment } from '../scoring/score.js';
import type { Prisma } from '@prisma/client';

const stateSchema=z.object({
 itemIds:z.array(z.string().min(1).max(100)).max(12),
 targetId:z.string().max(100).optional(),
 context:z.object({occasion:z.enum(OCCASIONS),weather:z.enum(WEATHER),styles:z.array(z.enum(STYLES)).min(1).max(STYLES.length)}),
});
export const assistantRouter=Router();
assistantRouter.use(requireAuth);
assistantRouter.post('/',async(req,res)=>{
 const {message,state,history}=z.object({message:z.string().trim().min(1).max(2000),state:stateSchema.optional(),history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().max(4000)})).max(8).default([])}).parse(req.body);
 const [knowledge,owned,profile]=await Promise.all([
  loadKnowledge(),
  prisma.clothingItem.findMany({where:{userId:req.userId,deletedAt:null}}),
  prisma.profile.findUnique({where:{userId:req.userId}}),
 ]);
 // Only this account's saved items and the dummy collection shown in My Closet.
 const items=[...owned.map(toClient),...SAMPLE_ITEMS.map(i=>({...i,owned:false,laundry_status:'clean' as const}))];
 const preferences=(profile?.data??{}) as {styles?:string[];colors?:string[]};
 const stored=await prisma.outfitAssessment.findMany({where:{userId:req.userId,version:knowledge.version+'-auto-v4'},orderBy:{createdAt:'desc'},take:50,select:{context:true,garments:true}});
 const recommendationHistory=stored.map(r=>({context:r.context as unknown as ScoreContext,garments:r.garments as unknown as ConfirmedGarment[]}));
 const reply=await converse(message,items,knowledge,preferences,state,history,recommendationHistory);
 let assessmentId:string|undefined;
 if(reply.items.length&&reply.score!==null&&reply.state.itemIds.length===reply.items.length&&reply.items.every(i=>reply.state.itemIds.includes(i.item_id))) {
  const garments=reply.items.map(item=>({garmentKey:(matchGarment(item.subcategory,knowledge.garments)??matchGarment(item.product_name,knowledge.garments))?.key??'unknown',color:item.color,style:item.style}));
  const result=evaluate(garments,reply.state.context,knowledge,true);
  const key=fingerprint(garments,reply.state.context,result.version);
  const assessment=await prisma.outfitAssessment.upsert({where:{userId_fingerprint:{userId:req.userId!,fingerprint:key}},create:{userId:req.userId!,version:result.version,fingerprint:key,garments:result.garments as unknown as Prisma.InputJsonValue,context:result.context as unknown as Prisma.InputJsonValue,result:result as unknown as Prisma.InputJsonValue},update:{}});
  assessmentId=assessment.id;
 }
 res.json({...reply,assessmentId});
});
