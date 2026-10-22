import { z } from 'zod';
import { HttpError } from '../lib/errors.js';
import sharp from 'sharp';
import { GARMENTS } from '../scoring/knowledge.js';
import { COLORS } from '../scoring/score.js';
import { localChat, visionModel } from './ollama.js';
import { classifyCrops } from './classifier.js';

export const detectionSchema=z.object({
 name:z.string().trim().min(1).max(100),color:z.string().trim().min(1).max(80),
 garmentKey:z.enum(['unknown',...GARMENTS.map(g=>g.key)]).optional(),
 bbox:z.array(z.number().min(0).max(1000)).length(4).nullable().optional(),
 confidence:z.number().min(0).max(1).optional(),
 sleeve:z.enum(['strapless','sleeveless','short','long','unknown']).optional(),
 classifier:z.object({modelId:z.string(),garmentKey:z.string(),confidence:z.number(),validationPrecision:z.number(),eligible:z.boolean(),agrees:z.boolean(),category:z.string(),categoryConfidence:z.number(),categoryEligible:z.boolean(),alternatives:z.array(z.object({garmentKey:z.string(),confidence:z.number()}))}).optional(),
});

export const photoAnalysisSchema = z.object({
  garments: z.array(detectionSchema).max(12),
  score: z.number().min(0).max(100).nullable(),
  summary: z.string().trim().min(1).max(1500),
  corrections: z.array(z.string().trim().min(1).max(500)).max(5),
  limitations: z.string().trim().max(1000),
}).refine((value) => value.garments.length === 0 || value.score === null || value.corrections.length > 0,
  'A scored outfit must include styling suggestions')
  .refine((value) => value.garments.length === 0 || value.score !== null || value.limitations.length > 0,
    'Explain why visible clothing cannot be scored');

export function validateAnalysis(value: unknown) {
  const result = photoAnalysisSchema.safeParse(value);
  if (!result.success) throw new HttpError(502, 'The local model returned an incomplete analysis. Please retry.');
  // Never attach a styling score or clothing corrections to a photo with no detected clothes.
  return result.data.garments.length === 0 ? { ...result.data, score: null, corrections: [] } : result.data;
}

export function parseModelAnswer(content: string, doneReason?: string) {
  if (!content.trim() || doneReason === 'length') throw new HttpError(502, 'The local model did not finish its analysis. Please retry with a clear, smaller outfit photo.');
  let parsed: unknown;
  try { parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')); }
  catch { throw new HttpError(502, 'The local model returned an unreadable result. Please retry.'); }
  return validateAnalysis(parsed);
}
export const model = visionModel;

export async function analyzePhoto(image: Buffer) {
  const prepared=await sharp(image,{limitInputPixels:40_000_000}).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
  const output=z.object({garments:z.array(detectionSchema.omit({classifier:true}).required({garmentKey:true,bbox:true,confidence:true})).max(12),summary:z.string().max(1000),limitations:z.string().max(800)});
  const content=await localChat({model,format:z.toJSONSchema(output),messages:[{role:'user',images:[prepared.toString('base64')],content:
   `Detect the actual visible clothing, shoes, bags and jewellery in this image. Return one entry per distinct piece (a pair of shoes or earrings is one piece). Use the closest garmentKey from this database taxonomy: ${GARMENTS.map(g=>`${g.key}=${g.title}`).join('; ')}. Choose the main colour from: ${COLORS.join(', ')}, silver, gold. name must describe the visible piece, including strapless or sleeveless when visible (e.g. strapless peplum top rather than top). sleeve must be strapless, sleeveless, short, long, or unknown; accessories use unknown. Never label a strapless or sleeveless garment as sleeved. bbox=[left,top,right,bottom] in normalized 0..1000 image coordinates, tightly enclosing the visible item; use null if you cannot locate it reliably. confidence is an uncalibrated estimate 0..1. Do not invent hidden shoes, jewellery, fabric or a person’s attributes. No clothes means garments=[]. Summary one sentence; explain uncertain or occluded pieces in limitations. Return JSON matching the schema.`}],options:{temperature:0,seed:42,num_predict:1600,num_ctx:4096}},240_000);
  let parsed:unknown;
  try {parsed=JSON.parse(content);}catch{throw new HttpError(502,'The local model returned unreadable clothing labels. Please retry.');}
  const detected=output.safeParse(parsed);
  if(!detected.success)throw new HttpError(502,'The local model returned invalid clothing locations. Please retry.');
  const garments=detected.data.garments.map(g=>({...g}) as z.infer<typeof detectionSchema>);
  const metadata=await sharp(prepared).metadata();
  const located=garments.map((garment,index)=>({garment,index})).filter(({garment})=>garment.bbox&&garment.bbox[2]>garment.bbox[0]&&garment.bbox[3]>garment.bbox[1]);
  try {
   const crops=await Promise.all(located.map(({garment})=>{
    const box=garment.bbox!;const left=Math.floor(box[0]/1000*metadata.width!),top=Math.floor(box[1]/1000*metadata.height!);
    const right=Math.min(metadata.width!,Math.ceil(box[2]/1000*metadata.width!)),bottom=Math.min(metadata.height!,Math.ceil(box[3]/1000*metadata.height!));
    return sharp(prepared).extract({left,top,width:right-left,height:bottom-top}).jpeg().toBuffer();
   }));
   const predictions=await classifyCrops(crops);
   predictions?.forEach((prediction,i)=>{
    const garment=garments[located[i].index];
    const recognized=GARMENTS.find(g=>g.key===garment.garmentKey);
    const predicted=GARMENTS.find(g=>g.key===prediction.garmentKey);
    const agrees=garment.garmentKey===prediction.garmentKey||garment.garmentKey==='blouse'&&prediction.garmentKey==='shirt'||predicted?.key==='shoes'&&recognized?.category==='Shoes';
    garment.classifier={...prediction,agrees};
    // Coarse classifier cannot determine sleeves, colours or jewellery. Keep
    // the grounded label, but withhold confident disagreements for review.
    const supported=['shirt','blouse','tee','sweater','cardigan','jacket','coat','trousers','shorts','skirt','dress','bag','hat','scarf','belt'].includes(garment.garmentKey??'')||recognized?.category==='Shoes';
    if(supported&&(prediction.eligible&&!agrees&&predicted||prediction.categoryEligible&&prediction.category!==recognized?.category))garment.confidence=Math.min(garment.confidence??1,.54);
   });
  }catch{detected.data.limitations+=' The optional local crop classifier was unavailable; review the vision labels.';}
  return validateAnalysis({...detected.data,garments,score:null,corrections:[],limitations:detected.data.limitations||'Review the detected labels and crops. Model confidence is an estimate, not measured accuracy.'});
}
