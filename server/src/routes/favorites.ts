import { SAMPLE_ITEMS } from '../data/samples.js';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/errors.js';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const itemId = z.string().trim().min(1).max(64);

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);

// GET /api/favorites → { favorites: string[] } (item ids)
favoritesRouter.get('/', async (req, res) => {
  const rows = await prisma.favorite.findMany({ where: { userId: req.userId }, orderBy: { createdAt: 'desc' } });
  res.json({ favorites: rows.map((r) => r.itemId) });
});

favoritesRouter.put('/:itemId', async (req, res) => {
  const id = itemId.parse(req.params.itemId);
  // The seeded sample collection uses DV-0001 through DV-0084, plus DV-0000.
  const sample = SAMPLE_ITEMS.some(item=>item.item_id===id);
  if (!sample && !await prisma.clothingItem.findFirst({ where: { id, userId: req.userId, deletedAt:null } })) throw new HttpError(404, 'Wardrobe item not found');
  await prisma.favorite.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: id } },
    create: { userId: req.userId!, itemId: id },
    update: {},
  });
  res.status(204).end();
});

favoritesRouter.delete('/:itemId', async (req, res) => {
  await prisma.favorite.deleteMany({ where: { userId: req.userId, itemId: req.params.itemId } });
  res.status(204).end();
});
