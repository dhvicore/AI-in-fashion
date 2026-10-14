import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import { env } from '../env.js';
import { prisma } from '../lib/db.js';
import { validateAnalysis } from '../vision/analyze.js';

export const imageHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const reconciliation = new Map<string, Promise<void>>();

// Preserve old records, but give identical files one canonical result: the first
// valid saved analysis. Aliases remain in the DB and reopen the canonical result.
export function reconcileAnalyses(userId: string): Promise<void> {
  const existing = reconciliation.get(userId);
  if (existing) return existing;
  const task = (async () => {
    const legacy = await prisma.outfitAnalysis.findMany({
      where: { userId, imageHash: null, canonicalId: null }, include: { upload: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    for (const row of legacy) {
      let hash: string;
      try {
        validateAnalysis(row.result);
        hash = imageHash(await readFile(path.join(env.uploadDir, row.upload.filename)));
      } catch { continue; } // A missing file or invalid old result must not become canonical.
      let canonical = await prisma.outfitAnalysis.findUnique({ where: { userId_imageHash: { userId, imageHash: hash } } });
      if (!canonical) {
        try { await prisma.outfitAnalysis.update({ where: { id: row.id }, data: { imageHash: hash } }); continue; }
        catch (err) { if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err; }
        canonical = await prisma.outfitAnalysis.findUnique({ where: { userId_imageHash: { userId, imageHash: hash } } });
      }
      if (canonical && canonical.id !== row.id) await prisma.outfitAnalysis.update({ where: { id: row.id }, data: { canonicalId: canonical.id } });
    }
  })();
  reconciliation.set(userId, task);
  void task.finally(() => { if (reconciliation.get(userId) === task) reconciliation.delete(userId); }).catch(() => {});
  return task;
}
