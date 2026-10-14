import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { loginSchema, registerSchema } from '../auth/schemas.js';
import { endSession, startSession } from '../auth/session.js';
import { publicUser } from '../auth/user.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

// Slow down password guessing: 20 attempts per 15 minutes per IP.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });

authRouter.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new HttpError(409, 'An account with this email already exists');

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  startSession(res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same message for unknown email and wrong password, so accounts can't be discovered.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }
  startSession(res, user.id);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  endSession(res);
  res.status(204).end();
});

// Who is logged in? The frontend calls this on page load to restore the session.
authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(401, 'Please log in');
  res.json({ user: publicUser(user) });
});
