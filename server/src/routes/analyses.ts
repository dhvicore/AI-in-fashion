import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env.js';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { analyzePhoto, model, validateAnalysis } from '../vision/analyze.js';
import { importAnalysis, syncWardrobePhotos } from '../wardrobe/photos.js';
import { imageHash, reconcileAnalyses } from '../analysis/identity.js';
import type { OutfitAnalysis, Upload } from '@prisma/client';

function toEntry(row: OutfitAnalysis & { upload: Upload }) {
  const analysis = validateAnalysis(row.result);
  const metadata = row.result as { source?: unknown };
  return { id: row.id, url: `/uploads/${row.upload.filename}`, createdAt: row.createdAt.toISOString(),
    source: metadata.source === 'camera' ? 'camera' : 'photo', analysis };
}

export const analysesRouter = Router();
// Different uploads of identical bytes share both inference and its saved result.
const pending = new Map<string, Promise<OutfitAnalysis & { upload: Upload }>>();
analysesRouter.use(requireAuth);
analysesRouter.get('/', async (req, res) => {
  await reconcileAnalyses(req.userId!);
  const { limit, cursor } = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.string().max(100).optional() }).parse(req.query);
  if (cursor && !await prisma.outfitAnalysis.findFirst({ where: { id: cursor, userId: req.userId, canonicalId: null } })) throw new HttpError(400, 'Invalid history cursor');
  const rows = await prisma.outfitAnalysis.findMany({ where: { userId: req.userId, canonicalId: null }, include: { upload: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  const page = rows.slice(0, limit);
  res.json({ entries: page.map(toEntry), nextCursor: rows.length > limit ? page.at(-1)?.id : null });
});
analysesRouter.get('/:id', async (req, res) => {
  await reconcileAnalyses(req.userId!);
  let row = await prisma.outfitAnalysis.findFirst({ where: { id: String(req.params.id), userId: req.userId }, include: { upload: true } });
  if (!row) throw new HttpError(404, 'Analysis not found');
  if (row.canonicalId) row = await prisma.outfitAnalysis.findFirst({ where: { id: row.canonicalId, userId: req.userId }, include: { upload: true } });
  if (!row) throw new HttpError(404, 'Analysis not found');
  res.json({ entry: toEntry(row) });
});
analysesRouter.post('/', async (req, res) => {
  const { url, source } = z.object({ url: z.string().min(1).max(200), source: z.enum(['photo', 'camera']).default('photo') }).parse(req.body);
  // Resolve only a recorded upload belonging to this account, never an arbitrary path or URL.
  const upload = await prisma.upload.findFirst({ where: { userId: req.userId, filename: url.replace(/^\/uploads\//, '') } });
  if (!upload || url !== `/uploads/${upload.filename}`) throw new HttpError(404, 'Photo not found');
  const photo = await prisma.wardrobePhoto.findUnique({where:{uploadId:upload.id}});
  if(photo?.deletedAt) throw new HttpError(409,'Restore this photo from Trash before analyzing it');
  await reconcileAnalyses(req.userId!);
  const bytes = await readFile(path.join(env.uploadDir, upload.filename));
  const hash = imageHash(bytes);
  const identity = { userId: req.userId!, imageHash: hash };
  const cached = await prisma.outfitAnalysis.findUnique({ where: { userId_imageHash: identity }, include: { upload: true } });
  if (cached) { await syncWardrobePhotos(req.userId!); const entry = toEntry(cached); res.json({ analysis: entry.analysis, entry, reused: true }); return; }
  const key = `${req.userId}:${hash}`;
  let task = pending.get(key);
  const reused = Boolean(task);
  if (!task) {
    task = (async () => {
      const analysis = await analyzePhoto(bytes);
      return prisma.outfitAnalysis.upsert({ where: { userId_imageHash: identity },
        create: { userId: req.userId!, uploadId: upload.id, model, imageHash: hash, result: { ...analysis, source } },
        update: {}, include: { upload: true },
      });
    })();
    pending.set(key, task);
    void task.finally(() => { if (pending.get(key) === task) pending.delete(key); }).catch(() => {});
  }
  const saved = await task;
  await importAnalysis(saved);
  const entry = toEntry(saved);
  res.json({ analysis: entry.analysis, entry, reused });
});
