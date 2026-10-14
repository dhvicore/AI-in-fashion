import type { RequestHandler } from 'express';
import { HttpError } from '../lib/errors.js';
import { SESSION_COOKIE, readSession } from '../auth/session.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Rejects the request with 401 unless it carries a valid session cookie.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = readSession(req.cookies?.[SESSION_COOKIE]);
  if (!userId) throw new HttpError(401, 'Please log in');
  req.userId = userId;
  next();
};
