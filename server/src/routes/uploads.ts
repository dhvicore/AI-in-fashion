import { z } from 'zod';
import { imageHash } from '../analysis/identity.js';
import { registerPhoto } from '../wardrobe/photos.js';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../env.js';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { detectImageType } from '../lib/images.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { enqueueAnalysis } from '../analysis/jobs.js';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

function toJson(u: { id: string; filename: string; mimeType: string; size: number; createdAt: Date }) {
  return { id: u.id, url: `/uploads/${u.filename}`, mimeType: u.mimeType, size: u.size, createdAt: u.createdAt };
}

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

// POST /api/uploads  (multipart/form-data, field name "image")
uploadsRouter.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach an image in the "image" field');

  const source = z.enum(['photo', 'camera']).default('photo').parse(req.body.source);
  const type = detectImageType(req.file.buffer);
  if (!type) throw new HttpError(415, 'Only JPEG, PNG or WebP images are allowed');

  const hidden = await prisma.wardrobePhoto.findUnique({where:{userId_imageHash:{userId:req.userId!,imageHash:imageHash(req.file.buffer)}}});
  if(hidden?.deletedAt) throw new HttpError(409,'This photo is in Trash. Restore it before uploading it again.');

  // Random file name: unguessable, and never trusts the user's original name.
  const filename = `${randomUUID()}.${type.ext}`;
  await mkdir(env.uploadDir, { recursive: true });
  await writeFile(path.join(env.uploadDir, filename), req.file.buffer);

  const file = req.file;
  const saved = await prisma.$transaction(async tx => {
    const saved = await tx.upload.create({data: { userId: req.userId!, filename, mimeType: type.mime, size: file.size }});
    await registerPhoto(tx, saved, imageHash(file.buffer), source);
    return saved;
  }).catch(async (err: unknown) => {
    // A failed database write must not leave an untracked photo on disk.
    await unlink(path.join(env.uploadDir, filename)).catch(() => {});
    throw err;
  });
  const job=process.env.AUTO_ANALYZE_UPLOADS==='false'?null:await enqueueAnalysis(req.userId!,`/uploads/${saved.filename}`,source).catch(()=>null);
  res.status(201).json({ upload: toJson(saved),analysisJob:job?{id:job.id,status:job.status}:null });
});

// GET /api/uploads — the current user's images, newest first
uploadsRouter.get('/', async (req, res) => {
  const uploads = await prisma.upload.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ uploads: uploads.map(toJson) });
});

// DELETE /api/uploads/:id — only the owner can delete
uploadsRouter.delete('/:id', async (req, res) => {
  const found = await prisma.upload.findFirst({ where: { id: req.params.id, userId: req.userId } });
  if (!found) throw new HttpError(404, 'Image not found');

  if (await prisma.clothingItem.findFirst({where:{userId:req.userId,OR:[{imageUrl:`/uploads/${found.filename}`},{photo:{uploadId:found.id}}]}})) throw new HttpError(409, 'Remove wardrobe pieces using this photo before deleting it');
  await prisma.upload.delete({ where: { id: found.id } });
  await unlink(path.join(env.uploadDir, found.filename)).catch(() => {});
  res.status(204).end();
});
