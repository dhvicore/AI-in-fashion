import { calendarRouter } from './routes/calendar.js';
import { wardrobePhotosRouter } from './routes/wardrobe-photos.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env.js';
import { errorHandler, notFound } from './lib/errors.js';
import { authRouter } from './routes/auth.js';
import { favoritesRouter } from './routes/favorites.js';
import { itemsRouter } from './routes/items.js';
import { historyRouter, outfitsRouter } from './routes/outfits.js';
import { profileRouter } from './routes/profile.js';
import { uploadsRouter } from './routes/uploads.js';
import { analysesRouter } from './routes/analyses.js';
import { scoringRouter } from './routes/scoring.js';

export function createApp() {
  const app = express();

  // 'same-site' lets the frontend on another localhost port display uploaded images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/analyses', analysesRouter);
  app.use('/api/scoring', scoringRouter);
  app.use('/api/items', itemsRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/wardrobe-photos', wardrobePhotosRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/outfits', outfitsRouter);
  app.use('/api/history', historyRouter);
  app.use('/uploads', express.static(env.uploadDir));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
