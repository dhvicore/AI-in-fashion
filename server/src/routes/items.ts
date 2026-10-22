import type { ClothingItem, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { syncWardrobePhotos, wardrobePhotoList } from '../wardrobe/photos.js';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { confirmLabels } from '../training/labels.js';
import { SAMPLE_ITEMS } from '../data/samples.js';

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories', 'Outerwear', 'Uncategorized'] as const;
const text = z.string().trim().min(1).max(60);
const score = z.number().int().min(0).max(100);

// Same field names the frontend uses (src/types/fashion.ts).
const itemSchema = z.object({
  product_name: z.string().trim().min(1, 'Item name is required').max(100),
  category: z.enum(CATEGORIES),
  subcategory: text,
  color: text,
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'colorHex must look like #aabbcc'),
  pattern: text.default('Solid'),
  style: text,
  season: z.array(text).max(4).default([]),
  occasion: z.array(text).max(10).default([]),
  gender: text.default('Unisex'),
  material: text.default('Cotton'),
  fit: text.default('Regular'),
  formality_score: score.default(50),
  trend_score: score.default(50),
  comfort_score: score.default(50),
  versatility_score: score.default(50),
  sustainability_score: score.default(50),
  laundry_status: z.enum(['clean', 'in-laundry']).optional(),
  sleeve: z.enum(['strapless','sleeveless','short','long','unknown']).optional(),
  image_url: z
    .string()
    .regex(/^\/uploads\/[\w-]+\.(jpg|png|webp)$/, 'image_url must come from /api/uploads')
    .nullable()
    .optional(),
});

type ItemInput = z.infer<typeof itemSchema>;

function toDb(input: Partial<ItemInput>) {
  return {
    name: input.product_name,
    category: input.category,
    subcategory: input.subcategory,
    color: input.color,
    colorHex: input.colorHex,
    pattern: input.pattern,
    style: input.style,
    seasons: input.season,
    occasions: input.occasion,
    gender: input.gender,
    material: input.material,
    fit: input.fit,
    formalityScore: input.formality_score,
    trendScore: input.trend_score,
    comfortScore: input.comfort_score,
    versatilityScore: input.versatility_score,
    sustainabilityScore: input.sustainability_score,
    imageUrl: input.image_url,
    laundryStatus: input.laundry_status,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function toClient(item: ClothingItem) {
  return {
    item_id: item.id,
    product_name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    colorHex: item.colorHex,
    pattern: item.pattern,
    style: item.style,
    season: item.seasons as string[],
    occasion: item.occasions as string[],
    gender: item.gender,
    material: item.material,
    fit: item.fit,
    formality_score: item.formalityScore,
    trend_score: item.trendScore,
    comfort_score: item.comfortScore,
    versatility_score: item.versatilityScore,
    sustainability_score: item.sustainabilityScore,
    wear_count: item.wearCount,
    last_worn_days_ago: item.lastWornAt ? Math.max(0, Math.floor((Date.now() - item.lastWornAt.getTime()) / DAY_MS)) : null,
    image_url: item.imageUrl,
    owned: true,
    laundry_status: item.laundryStatus,
    photo_id: item.photoId,
    needs_review: item.category === 'Uncategorized' || item.material === 'Unknown' || item.style === 'Unknown',
    recognition: item.recognition as {confidence?:number;bbox?:number[];cropped?:boolean;sourceImageUrl?:string}|null,
    labels_confirmed: Boolean(item.labelsConfirmedAt),
    source_image_url: (item.recognition as {sourceImageUrl?:string}|null)?.sourceImageUrl??item.imageUrl,
    sleeve: (item.recognition as {sleeve?:string}|null)?.sleeve??'unknown',
  };
}

// An image can only be attached by the user who uploaded it.
async function assertOwnImage(userId: string, imageUrl: string | null | undefined) {
  if (!imageUrl) return;
  const filename = imageUrl.replace('/uploads/', '');
  const upload = await prisma.upload.findFirst({ where: { filename, userId } });
  if (!upload) throw new HttpError(400, 'That image was not uploaded by you');
  const photo = await prisma.wardrobePhoto.findUnique({where:{uploadId:upload.id}});
  if (photo?.deletedAt) throw new HttpError(409, 'Restore this photo from Trash first');
  return upload;
}

async function findOwnItem(userId: string, id: string) {
  const item = await prisma.clothingItem.findFirst({ where: { id, userId, deletedAt:null } });
  if (!item) throw new HttpError(404, 'Item not found');
  return item;
}

export const itemsRouter = Router();
itemsRouter.use(requireAuth);
itemsRouter.get('/samples',(_req,res)=>res.json({items:SAMPLE_ITEMS.map(item=>({...item,owned:false}))}));

itemsRouter.get('/', async (req, res) => {
  await syncWardrobePhotos(req.userId!);
  const items = await prisma.clothingItem.findMany({
    where: { userId: req.userId, deletedAt:null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ items: items.map(toClient), photos: await wardrobePhotoList(req.userId!) });
});

itemsRouter.post('/', async (req, res) => {
  const input = itemSchema.parse(req.body);
  const upload = await assertOwnImage(req.userId!, input.image_url);
  const photo = upload ? await prisma.wardrobePhoto.findUnique({ where: { uploadId: upload.id } }) : null;
  const item = await prisma.$transaction(async tx => {
    const item = await tx.clothingItem.create({ data: { ...(toDb(input) as Omit<Prisma.ClothingItemUncheckedCreateInput, 'userId'>), userId: req.userId!, photoId: photo?.id,...(input.sleeve?{recognition:{sleeve:input.sleeve}}:{}) } });
    if (photo) await tx.wardrobePhoto.update({where:{id:photo.id},data:{importedAt:new Date()}});
    return item;
  });
  res.status(201).json({ item: toClient(item) });
});

itemsRouter.patch('/:id', async (req, res) => {
  const previous=await findOwnItem(req.userId!, req.params.id);
  const parsed = itemSchema.partial().parse(req.body);
  // Zod defaults must not overwrite unrelated details during a partial edit.
  const input = Object.fromEntries(Object.entries(parsed).filter(([key]) => Object.hasOwn(req.body, key))) as Partial<ItemInput>;
  if(input.image_url!==previous.imageUrl)await assertOwnImage(req.userId!, input.image_url);
  const item = await prisma.clothingItem.update({ where: { id: req.params.id }, data: {...toDb(input),...(input.sleeve?{recognition:{...(previous.recognition as Prisma.JsonObject??{}),sleeve:input.sleeve}}:{})} });
  if(previous.recognition&&['product_name','subcategory','category','color'].some(key=>Object.hasOwn(input,key)))await confirmLabels(req.userId!,item.id);
  res.json({ item: toClient(item) });
});

itemsRouter.post('/:id/confirm',async(req,res)=>{
 await confirmLabels(req.userId!,req.params.id);
 const item=await findOwnItem(req.userId!,req.params.id);
 res.json({item:toClient(item)});
});

// Log that the item was worn today (feeds "never worn" and rotation insights).
itemsRouter.post('/:id/wear', async (req, res) => {
  await findOwnItem(req.userId!, req.params.id);
  const item = await prisma.clothingItem.update({
    where: { id: req.params.id },
    data: { wearCount: { increment: 1 }, lastWornAt: new Date() },
  });
  res.json({ item: toClient(item) });
});

itemsRouter.post('/:id/restore', async (req,res) => {
  const item = await prisma.clothingItem.findFirst({where:{id:req.params.id,userId:req.userId,deletedAt:{not:null}},include:{photo:true}});
  if(!item) throw new HttpError(404,'Deleted piece not found');
  if(item.photo?.deletedAt) throw new HttpError(409,'Restore the source photo from Trash first');
  await prisma.clothingItem.update({where:{id:item.id},data:{deletedAt:null,deletedWithPhoto:false}});
  res.status(204).end();
});
itemsRouter.delete('/:id', async (req, res) => {
  const item = await findOwnItem(req.userId!, req.params.id);
  await prisma.clothingItem.update({ where: { id: item.id }, data:{deletedAt:new Date(),deletedWithPhoto:false} });
  res.status(204).end();
});
