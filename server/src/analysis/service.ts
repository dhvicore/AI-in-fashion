import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../env.js';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { analyzePhoto, model, validateAnalysis } from '../vision/analyze.js';
import { importAnalysis, syncWardrobePhotos } from '../wardrobe/photos.js';
import { imageHash, reconcileAnalyses } from './identity.js';
import type { OutfitAnalysis, Upload } from '@prisma/client';

export function toEntry(row: OutfitAnalysis & { upload: Upload }) {
  const analysis = validateAnalysis(row.result);
  const metadata = row.result as { source?: unknown };
  return { id: row.id, url: `/uploads/${row.upload.filename}`, createdAt: row.createdAt.toISOString(),
    source: metadata.source === 'camera' ? 'camera' : 'photo', analysis };
}

const pending=new Map<string,Promise<OutfitAnalysis & {upload:Upload}>>();
export async function analyzeUpload(userId:string,url:string,source:'photo'|'camera') {
  // Resolve only a recorded upload belonging to this account, never an arbitrary path or URL.
  const upload = await prisma.upload.findFirst({ where: { userId: userId, filename: url.replace(/^\/uploads\//, '') } });
  if (!upload || url !== `/uploads/${upload.filename}`) throw new HttpError(404, 'Photo not found');
  const photo = await prisma.wardrobePhoto.findUnique({where:{uploadId:upload.id}});
  if(photo?.deletedAt) throw new HttpError(409,'Restore this photo from Trash before analyzing it');
  await reconcileAnalyses(userId);
  const bytes = await readFile(path.join(env.uploadDir, upload.filename));
  const hash = imageHash(bytes);
  const identity = { userId: userId, imageHash: hash };
  const cached = await prisma.outfitAnalysis.findUnique({ where: { userId_imageHash: identity }, include: { upload: true } });
  if (cached) { await syncWardrobePhotos(userId); const entry = toEntry(cached); return {analysis:entry.analysis,entry,reused:true}; }
  const key = `${userId}:${hash}`;
  let task = pending.get(key);
  const reused = Boolean(task);
  if (!task) {
    task = (async () => {
      const analysis = await analyzePhoto(bytes);
      return prisma.outfitAnalysis.upsert({ where: { userId_imageHash: identity },
        create: { userId: userId, uploadId: upload.id, model, imageHash: hash, result: { ...analysis, source } },
        update: {}, include: { upload: true },
      });
    })();
    pending.set(key, task);
    void task.finally(() => { if (pending.get(key) === task) pending.delete(key); }).catch(() => {});
  }
  const saved = await task;
  await importAnalysis(saved);
  const entry=toEntry(saved);
  return {analysis:entry.analysis,entry,reused};
}
