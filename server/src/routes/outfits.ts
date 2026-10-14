import type { HistoryEntry, Prisma, SavedOutfit } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';

// Outfits keep a snapshot of their items, so we only check the basic shape.
const itemSnapshots = z
  .array(z.looseObject({ item_id: z.string(), product_name: z.string() }))
  .min(1)
  .max(12)
  .transform((items) => items as Prisma.InputJsonArray);

const scoreSchema = z.object({
  total: z.number().min(0).max(100),
  breakdown: z.record(z.string(), z.number()),
  reasons: z.array(z.string()),
});

const outfitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  occasion: z.string().trim().max(60).optional(),
  source: z.enum(['analyzer', 'stylist', 'generator', 'assistant']),
  score: scoreSchema,
  items: itemSnapshots,
});

const historySchema = z.object({
  label: z.string().trim().min(1).max(100),
  occasion: z.string().trim().max(60),
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().max(500),
  items: itemSnapshots,
  image: z.string().max(300).optional(),
});

function outfitToClient(o: SavedOutfit) {
  return {
    outfit_id: o.id,
    name: o.name,
    occasion: o.occasion ?? undefined,
    source: o.source,
    score: o.score,
    items: o.items,
    createdAt: o.createdAt.toISOString(),
  };
}

function historyToClient(h: HistoryEntry) {
  return {
    id: h.id,
    date: h.date.toISOString(),
    label: h.label,
    occasion: h.occasion,
    score: h.score,
    feedback: h.feedback,
    items: h.items,
    image: h.image ?? undefined,
  };
}

// ---------- saved outfits ----------

export const outfitsRouter = Router();
outfitsRouter.use(requireAuth);

outfitsRouter.get('/', async (req, res) => {
  const outfits = await prisma.savedOutfit.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
  res.json({ outfits: outfits.map(outfitToClient) });
});

outfitsRouter.post('/', async (req, res) => {
  const input = outfitSchema.parse(req.body);
  const outfit = await prisma.savedOutfit.create({ data: { ...input, userId: req.userId! } });
  res.status(201).json({ outfit: outfitToClient(outfit) });
});

outfitsRouter.delete('/:id', async (req, res) => {
  const { count } = await prisma.savedOutfit.deleteMany({ where: { id: req.params.id, userId: req.userId } });
  if (!count) throw new HttpError(404, 'Outfit not found');
  res.status(204).end();
});

// ---------- outfit history ----------

export const historyRouter = Router();
historyRouter.use(requireAuth);

historyRouter.get('/', async (req, res) => {
  const entries = await prisma.historyEntry.findMany({ where: { userId: req.userId }, orderBy: { date: 'desc' }, take: 100 });
  res.json({ history: entries.map(historyToClient) });
});

historyRouter.post('/', async (req, res) => {
  const input = historySchema.parse(req.body);
  const entry = await prisma.historyEntry.create({ data: { ...input, userId: req.userId! } });
  res.status(201).json({ entry: historyToClient(entry) });
});
