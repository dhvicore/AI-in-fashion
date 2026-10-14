import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { toClient } from './items.js';
import { SAMPLE_ITEMS } from '../data/samples.js';
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(`${s}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;},'Choose a valid calendar date');
export const calendarRouter=Router();
calendarRouter.use(requireAuth);
calendarRouter.get('/',async(req,res)=>{
 const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).parse(req.query.month);
 const entries=await prisma.outfitDay.findMany({where:{userId:req.userId,date:{startsWith:month}},orderBy:{date:'asc'}});
 res.json({entries});
});
calendarRouter.put('/:date',async(req,res)=>{
 const date=dateSchema.parse(req.params.date);
 const input=z.object({label:z.string().trim().min(1).max(100),occasion:z.string().trim().max(60).default('Casual'),itemIds:z.array(z.string().max(100)).min(1).max(12)}).parse(req.body);
 const ids=[...new Set(input.itemIds)];
 const owned=await prisma.clothingItem.findMany({where:{userId:req.userId,id:{in:ids},deletedAt:null}});
 const items=ids.map(id=>{const real=owned.find(i=>i.id===id);const sample=SAMPLE_ITEMS.find(i=>i.item_id===id);if(!real&&!sample)throw new HttpError(400,'A selected piece is unavailable in your wardrobe');if(real?.laundryStatus==='in-laundry')throw new HttpError(409,`${real.name} is in laundry. Mark it clean or choose another piece.`);return real?toClient(real):sample!;});
 const existing=await prisma.outfitDay.findUnique({where:{userId_date:{userId:req.userId!,date}}});
 if(existing?.wornAt)throw new HttpError(409,'This outfit is already recorded as worn');
 // Conditional updates also protect a worn record from a concurrent edit.
 const entry=await prisma.$transaction(async tx=>{
  const current=await tx.outfitDay.findUnique({where:{userId_date:{userId:req.userId!,date}}});
  if(current?.wornAt)throw new HttpError(409,'This outfit is already recorded as worn');
  return tx.outfitDay.upsert({where:{userId_date:{userId:req.userId!,date}},create:{userId:req.userId!,date,label:input.label,occasion:input.occasion,items:items as unknown as Prisma.InputJsonArray},update:{label:input.label,occasion:input.occasion,items:items as unknown as Prisma.InputJsonArray}});
 });
 res.json({entry});
});
calendarRouter.post('/:id/worn',async(req,res)=>{
 const {timezone}=z.object({timezone:z.string().max(100).default('Asia/Kolkata')}).parse(req.body);
 let today:string;
 try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=(key:string)=>parts.find(x=>x.type===key)!.value;today=`${p('year')}-${p('month')}-${p('day')}`;}catch{throw new HttpError(400,'Invalid timezone');}
 const entry=await prisma.outfitDay.findFirst({where:{id:req.params.id,userId:req.userId}});
 if(!entry)throw new HttpError(404,'Outfit plan not found');
 if(entry.date>today)throw new HttpError(400,'A future outfit cannot be marked worn yet');
 const updated=await prisma.$transaction(async tx=>{
  const claimed=await tx.outfitDay.updateMany({where:{id:entry.id,userId:req.userId,wornAt:null},data:{wornAt:new Date()}});
  if(claimed.count){
   const current=await tx.outfitDay.findUniqueOrThrow({where:{id:entry.id}});
   const snapshots=current.items as {item_id:string}[];
   const wornDate=new Date(`${entry.date}T12:00:00Z`);
   // Samples never accrue real wear. A retry cannot increment the count again.
   const pieces=await tx.clothingItem.findMany({where:{userId:req.userId,id:{in:snapshots.map(i=>i.item_id)},deletedAt:null}});
   for(const piece of pieces)await tx.clothingItem.update({where:{id:piece.id},data:{wearCount:{increment:1},lastWornAt:piece.lastWornAt&&piece.lastWornAt>wornDate?piece.lastWornAt:wornDate}});
  }
  return tx.outfitDay.findUniqueOrThrow({where:{id:entry.id}});
 });
 res.json({entry:updated});
});
