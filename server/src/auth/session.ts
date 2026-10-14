import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export const SESSION_COOKIE = 'divara_session';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionPayload {
  sub: string; // user id
}

export function startSession(res: Response, userId: string) {
  const token = jwt.sign({ sub: userId } satisfies SessionPayload, env.jwtSecret, {
    expiresIn: MAX_AGE_MS / 1000,
  });
  // httpOnly: page scripts can't read the token, which limits damage from XSS.
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: MAX_AGE_MS,
  });
}

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: env.isProd });
}

// Returns the user id from a valid token, or null if missing/invalid/expired.
export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.jwtSecret) as SessionPayload;
    return payload.sub;
  } catch {
    return null;
  }
}
