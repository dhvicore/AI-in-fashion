import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/requireAuth.js';

const list = z.array(z.string().trim().min(1).max(60)).max(20);

// Mirrors UserProfile in src/types/fashion.ts
const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  styles: list,
  colors: list,
  fits: list,
  occasions: list,
  climate: z.string().trim().max(60),
  goals: list,
});

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get('/', async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
  res.json({ profile: profile?.data ?? null });
});

profileRouter.put('/', async (req, res) => {
  const data = profileSchema.parse(req.body);
  await prisma.profile.upsert({
    where: { userId: req.userId },
    create: { userId: req.userId!, data },
    update: { data },
  });
  res.json({ profile: data });
});
