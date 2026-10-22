import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { trainingManifest } from '../training/labels.js';
export const trainingRouter=Router();
trainingRouter.use(requireAuth);
trainingRouter.get('/export',async(req,res)=>res.json(await trainingManifest(req.userId!)));
