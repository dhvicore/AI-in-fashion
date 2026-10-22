import type { AnalysisJob } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { HttpError } from '../lib/errors.js';
import { analyzeUpload } from './service.js';

export const jobView=(job:AnalysisJob)=>({id:job.id,status:job.status,error:job.error,analysisId:job.analysisId,createdAt:job.createdAt,updatedAt:job.updatedAt});
let draining=false;
export function kickWorker() {
 if(draining)return;
 draining=true;
 void (async()=>{
  while(true) {
   const job=await prisma.analysisJob.findFirst({where:{status:'queued'},orderBy:{createdAt:'asc'},include:{upload:true}});
   if(!job)break;
   const claimed=await prisma.analysisJob.updateMany({where:{id:job.id,status:'queued'},data:{status:'running',error:null}});
   if(!claimed.count)continue;
   try {
    const result=await analyzeUpload(job.userId,`/uploads/${job.upload.filename}`,job.source==='camera'?'camera':'photo');
    await prisma.analysisJob.update({where:{id:job.id},data:{status:'completed',analysisId:result.entry.id}});
   } catch(error) {
    await prisma.analysisJob.updateMany({where:{id:job.id},data:{status:'failed',error:error instanceof HttpError?error.message:'Recognition failed. Please retry this photo.'}});
   }
  }
 })().catch(error=>console.error('Analysis worker error:',error instanceof Error?error.message:'Unknown error')).finally(()=>{draining=false;});
}

export async function recoverJobs() {
 // This local deployment runs one API process. Interrupted jobs can safely retry:
 // inference/import are deduplicated by account + image hash.
 await prisma.analysisJob.updateMany({where:{status:'running'},data:{status:'queued',error:null}});
 kickWorker();
}

export async function enqueueAnalysis(userId:string,url:string,source:'photo'|'camera',retry=false) {
 const filename=url.replace(/^\/uploads\//,'');
 const upload=await prisma.upload.findFirst({where:{userId,filename},include:{wardrobePhoto:true}});
 if(!upload||url!==`/uploads/${upload.filename}`)throw new HttpError(404,'Photo not found');
 if(upload.wardrobePhoto?.deletedAt)throw new HttpError(409,'Restore this photo from Trash first');
 const existing=await prisma.analysisJob.findUnique({where:{userId_uploadId:{userId,uploadId:upload.id}}});
 if(existing&&(!retry||existing.status!=='failed')){kickWorker();return existing;}
 const count=await prisma.analysisJob.count({where:{userId,status:{in:['queued','running']}}});
 if(count>=10)throw new HttpError(429,'You already have ten photos waiting for recognition. Please wait for them to finish.');
 const job=await prisma.analysisJob.upsert({where:{userId_uploadId:{userId,uploadId:upload.id}},create:{userId,uploadId:upload.id,source},update:{status:'queued',error:null}});
 kickWorker();
 return job;
}
