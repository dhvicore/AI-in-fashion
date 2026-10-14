import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { toClient } from './items.js';
export const wardrobePhotosRouter = Router();
wardrobePhotosRouter.use(requireAuth);
wardrobePhotosRouter.get('/trash',async(req,res)=>{
 const [photos,items]=await Promise.all([
  prisma.wardrobePhoto.findMany({where:{userId:req.userId,deletedAt:{not:null}},include:{upload:true},orderBy:{deletedAt:'desc'}}),
  prisma.clothingItem.findMany({where:{userId:req.userId,deletedAt:{not:null},OR:[{photoId:null},{photo:{deletedAt:null}}]},orderBy:{deletedAt:'desc'}})
 ]);
 res.json({photos:photos.map(p=>({id:p.id,url:`/uploads/${p.upload.filename}`,deletedAt:p.deletedAt})),items:items.map(i=>({...toClient(i),deletedAt:i.deletedAt}))});
});
wardrobePhotosRouter.delete('/:id',async(req,res)=>{
 const photo=await prisma.wardrobePhoto.findFirst({where:{id:req.params.id,userId:req.userId,deletedAt:null}});
 if(!photo)throw new HttpError(404,'Photo not found');
 const deletedAt=new Date();
 await prisma.$transaction(async tx=>{
  await tx.wardrobePhoto.update({where:{id:photo.id},data:{deletedAt}});
  await tx.clothingItem.updateMany({where:{userId:req.userId,photoId:photo.id,deletedAt:null},data:{deletedAt,deletedWithPhoto:true}});
 });
 res.status(204).end();
});
wardrobePhotosRouter.post('/:id/restore',async(req,res)=>{
 const photo=await prisma.wardrobePhoto.findFirst({where:{id:req.params.id,userId:req.userId,deletedAt:{not:null}}});
 if(!photo)throw new HttpError(404,'Deleted photo not found');
 await prisma.$transaction(async tx=>{
  await tx.clothingItem.updateMany({where:{userId:req.userId,photoId:photo.id,deletedWithPhoto:true},data:{deletedAt:null,deletedWithPhoto:false}});
  await tx.wardrobePhoto.update({where:{id:photo.id},data:{deletedAt:null}});
 });
 res.status(204).end();
});
