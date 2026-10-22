import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { OutfitAnalysis, Prisma, Upload } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { env } from '../env.js';
import { imageHash, reconcileAnalyses } from '../analysis/identity.js';
import sharp from 'sharp';
import { matchGarment, GARMENTS } from '../scoring/knowledge.js';
import { canonicalColor } from '../scoring/score.js';
import { validateAnalysis } from '../vision/analyze.js';

export function registerPhoto(tx: Prisma.TransactionClient, upload: Upload, hash: string, source: string) {
  return tx.wardrobePhoto.upsert({ where: { userId_imageHash: { userId: upload.userId, imageHash: hash } },
    create: { userId: upload.userId, uploadId: upload.id, imageHash: hash, source }, update: {} });
}

export function garmentCategory(name: string) {
  if (/\b(coat|jacket|blazer|cardigan|outerwear|puffer|parka|trench)\b/i.test(name)) return 'Outerwear';
  if (/\b(dress|gown|jumpsuit|romper)\b/i.test(name)) return 'Dresses';
  if (/\b(shoe|shoes|sneaker|sneakers|boot|boots|heel|heels|sandal|sandals|loafer|loafers|trainer|trainers)\b/i.test(name)) return 'Shoes';
  if (/\b(pants|trousers|jeans|skirt|shorts|leggings|bottom|bottoms)\b/i.test(name)) return 'Bottoms';
  if (/\b(shirt|t-shirt|tee|top|blouse|sweater|hoodie|tank|polo|turtleneck|kurta)\b/i.test(name)) return 'Tops';
  if (/\b(bag|handbag|purse|backpack|belt|sock|socks|scarf|hat|cap|watch|earrings|necklace|bracelet|sunglasses|ring|rings|jewellery|jewelry|clutch|bangle|bangles|choker|pendant)\b/i.test(name)) return 'Accessories';
  return 'Uncategorized';
}
const colors: Record<string, string> = { black:'#1C1C1C', white:'#F5F4EF', ivory:'#EEE8DA', camel:'#B88B5A', brown:'#795548', beige:'#D8C5A5', navy:'#233A59', blue:'#527DA7', red:'#B93636', burgundy:'#6E1E3C', maroon:'#6E1E3C', green:'#55764C', grey:'#888888', gray:'#888888', pink:'#DFA8B0', yellow:'#D8B94B', purple:'#79558C', orange:'#CE8745', cream:'#F2EBDD',gold:'#D4AF37',silver:'#C0C0C0' };
function colorHex(color: string) { return colors[color.toLowerCase()] ?? Object.entries(colors).find(([name]) => color.toLowerCase().includes(name))?.[1] ?? '#808080'; }
const title = (text: string) => text.replace(/\b\w/g, c => c.toUpperCase());

export async function importAnalysis(row: OutfitAnalysis) {
  const analysis = validateAnalysis(row.result);
  if (!analysis.garments.length || !row.imageHash) return;
  const photo = await prisma.wardrobePhoto.findUnique({ where: { userId_imageHash: { userId: row.userId, imageHash: row.imageHash } }, include: { upload: true } });
  if (!photo || photo.deletedAt || photo.importedAt) return;
  const createdFiles:string[]=[];
  let claimed=false;
  try {
    const original=await readFile(path.join(env.uploadDir,photo.upload.filename)).catch(()=>null);
    const rotated=original?await sharp(original,{limitInputPixels:40_000_000}).rotate().toBuffer().catch(()=>null):null;
    const metadata=rotated?await sharp(rotated).metadata():null;
    const pieces=await Promise.all(analysis.garments.map(async(garment,recognitionIndex)=>{
      const guide=GARMENTS.find(g=>g.key===garment.garmentKey)??matchGarment(garment.name,GARMENTS);
      let imageUrl=`/uploads/${photo.upload.filename}`;
      let cropped=false;
      const box=garment.bbox;
      if(rotated&&metadata?.width&&metadata.height&&box&&box[2]>box[0]&&box[3]>box[1]) {
        const left=Math.floor(box[0]/1000*metadata.width),top=Math.floor(box[1]/1000*metadata.height);
        const right=Math.min(metadata.width,Math.ceil(box[2]/1000*metadata.width)),bottom=Math.min(metadata.height,Math.ceil(box[3]/1000*metadata.height));
        if(right-left>=8&&bottom-top>=8) {
          const filename=`${photo.id}-${recognitionIndex}.jpg`;
          await mkdir(env.uploadDir,{recursive:true});
          const crop=await sharp(rotated).extract({left,top,width:right-left,height:bottom-top}).resize({width:640,height:640,fit:'inside',withoutEnlargement:true}).jpeg({quality:90}).toBuffer();
          await writeFile(path.join(env.uploadDir,filename),crop);
          createdFiles.push(filename);imageUrl=`/uploads/${filename}`;cropped=true;
        }
      }
      return {userId:row.userId,photoId:photo.id,recognitionIndex,name:title(`${garment.color} ${garment.name}`).slice(0,100),
        category:guide?.category??garmentCategory(garment.name),subcategory:guide?.title??title(garment.name).slice(0,60),color:canonicalColor(garment.color),colorHex:colorHex(canonicalColor(garment.color)),
        recognition:{...garment,cropped,pipeline:'grounded-v1',model:row.model,sourceImageUrl:`/uploads/${photo.upload.filename}`} as Prisma.InputJsonValue,
        imageUrl,pattern:'Unknown',style:'Unknown',seasons:[],occasions:[],gender:'Unisex',material:'Unknown',fit:'Unknown',
        formalityScore:50,trendScore:50,comfortScore:50,versatilityScore:50,sustainabilityScore:50};
    }));
    await prisma.$transaction(async tx=>{
      const gate=await tx.wardrobePhoto.updateMany({where:{id:photo.id,importedAt:null,deletedAt:null},data:{importedAt:new Date()}});
      if(!gate.count)return;
      claimed=true;
      await tx.clothingItem.createMany({data:pieces});
    });
  } catch(error) {
    // Don't leave orphan crops when importing fails. Concurrent import calls
    // share deterministic crop names; retain files if another caller saved them.
    const saved=await prisma.wardrobePhoto.findUnique({where:{id:photo.id}});
    if(!saved?.importedAt)await Promise.all(createdFiles.map(name=>unlink(path.join(env.uploadDir,name)).catch(()=>{})));
    throw error;
  }
  if(!claimed) {
    const saved=await prisma.wardrobePhoto.findUnique({where:{id:photo.id}});
    if(!saved?.importedAt)await Promise.all(createdFiles.map(name=>unlink(path.join(env.uploadDir,name)).catch(()=>{})));
  }
}

const syncing = new Map<string, Promise<void>>();
export function syncWardrobePhotos(userId: string) {
  const pending = syncing.get(userId); if (pending) return pending;
  const task = (async () => {
    await reconcileAnalyses(userId);
    const uploads = await prisma.upload.findMany({ where: { userId, wardrobePhoto: null }, orderBy: { createdAt: 'asc' } });
    const existing = new Set((await prisma.wardrobePhoto.findMany({ where:{userId}, select:{imageHash:true} })).map(p=>p.imageHash));
    for (const upload of uploads) {
      let hash: string; try { hash = imageHash(await readFile(path.join(env.uploadDir, upload.filename))); } catch { continue; }
      if (existing.has(hash)) continue;
      const analysis = await prisma.outfitAnalysis.findUnique({ where: { userId_imageHash: { userId, imageHash: hash } } });
      const source = (analysis?.result as { source?: string } | undefined)?.source === 'camera' ? 'camera' : 'photo';
      await prisma.$transaction(async tx => {
        const photo = await registerPhoto(tx, upload, hash, source);
        // Previously added manual pieces already represent this photo.
        const manual = await tx.clothingItem.findMany({ where: { userId, imageUrl: `/uploads/${upload.filename}` } });
        if (manual.length) {
          await tx.clothingItem.updateMany({ where: { id: { in: manual.map(i=>i.id) } }, data:{photoId:photo.id} });
          await tx.wardrobePhoto.update({where:{id:photo.id},data:{importedAt:new Date()}});
        }
      });
      existing.add(hash);
    }
    const analyses = await prisma.outfitAnalysis.findMany({where:{userId,canonicalId:null,imageHash:{not:null}}});
    for (const analysis of analyses) await importAnalysis(analysis);
  })();
  syncing.set(userId, task);
  void task.finally(()=>{if(syncing.get(userId)===task)syncing.delete(userId);}).catch(()=>{});
  return task;
}

export async function wardrobePhotoList(userId: string) {
  const photos = await prisma.wardrobePhoto.findMany({where:{userId, deletedAt:null, OR:[{importedAt:null},{items:{some:{deletedAt:null}}}]},include:{upload:true},orderBy:{createdAt:'desc'}});
  const hashes = new Set((await prisma.outfitAnalysis.findMany({where:{userId,canonicalId:null},select:{imageHash:true}})).map(a=>a.imageHash));
  return photos.map(photo=>({id:photo.id,url:`/uploads/${photo.upload.filename}`,source:photo.source,createdAt:photo.createdAt.toISOString(),
    status:photo.importedAt?'identified':hashes.has(photo.imageHash)?'needs-review':'needs-analysis'}));
}
