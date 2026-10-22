import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { reconcileAnalyses } from '../analysis/identity.js';
import { analyzeUpload, toEntry } from '../analysis/service.js';
import { enqueueAnalysis, kickWorker, jobView } from '../analysis/jobs.js';

export const analysesRouter = Router();
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
analysesRouter.post('/jobs',async(req,res)=>{
 const {url,source,retry}=z.object({url:z.string().max(200),source:z.enum(['photo','camera']).default('photo'),retry:z.boolean().default(false)}).parse(req.body);
 const job=await enqueueAnalysis(req.userId!,url,source,retry);
 res.status(202).json({job:jobView(job)});
});
analysesRouter.get('/jobs/:id',async(req,res)=>{
 const job=await prisma.analysisJob.findFirst({where:{id:req.params.id,userId:req.userId}});
 if(!job)throw new HttpError(404,'Analysis job not found');
 kickWorker();
 res.json({job:jobView(job)});
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
 const {url,source}=z.object({url:z.string().min(1).max(200),source:z.enum(['photo','camera']).default('photo')}).parse(req.body);
 res.json(await analyzeUpload(req.userId!,url,source));
});
