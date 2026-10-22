import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { GARMENTS, matchGarment } from '../scoring/knowledge.js';
import { canonicalColor, COLORS } from '../scoring/score.js';

export async function confirmLabels(userId:string,itemId:string) {
 const item=await prisma.clothingItem.findFirst({where:{id:itemId,userId,deletedAt:null},include:{photo:true}});
 if(!item||item.photo?.deletedAt)throw new HttpError(404,'Wardrobe item not found');
 const guide=matchGarment(item.subcategory,GARMENTS)??matchGarment(item.name,GARMENTS);
 if(!guide||!COLORS.includes(canonicalColor(item.color)))throw new HttpError(400,'Choose a supported clothing type and main colour before confirming.');
 const confirmedAt=new Date();
 const labels={name:item.name,garmentKey:guide.key,color:canonicalColor(item.color),sleeve:(item.recognition as {sleeve?:string}|null)?.sleeve??'unknown',bboxVerified:false};
 await prisma.$transaction([
  prisma.clothingItem.update({where:{id:itemId},data:{labelsConfirmedAt:confirmedAt}}),
  prisma.trainingExample.upsert({where:{itemId},create:{userId,itemId,labels},update:{confirmedAt,labels}}),
 ]);
}

export async function trainingManifest(userId:string) {
 const rows=await prisma.trainingExample.findMany({where:{userId,item:{deletedAt:null}},include:{item:{include:{photo:true}}},orderBy:{id:'asc'}});
 const examples=rows.filter(r=>r.item.imageUrl&&!r.item.photo?.deletedAt&&(r.item.recognition as {cropped?:boolean}|null)?.cropped).map(r=>({
  id:r.id,itemId:r.itemId,image:r.item.imageUrl,group:r.item.photo?.imageHash??r.itemId,
  ...r.labels as {name:string;garmentKey:string;color:string;bboxVerified:boolean},
  confirmedAt:r.confirmedAt,
 }));
 // Group on the ORIGINAL image, so crops from one outfit cannot leak between splits.
 return {version:'divara-labels-v1',purpose:'human-confirmed crop classification; boxes are model-generated and unverified',examples:examples.map(e=>({...e,split:parseInt(e.group.slice(0,8),16)%5===0?'validation':'train'}))};
}
