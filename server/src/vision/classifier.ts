import { access, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot=fileURLToPath(new URL('../../',import.meta.url));
const checkpoint=process.env.LOCAL_CLASSIFIER_MODEL??path.join(serverRoot,'models/fashionpedia-v1/classifier.pt');
const python=process.env.LOCAL_CLASSIFIER_PYTHON??path.join(serverRoot,'../.venv-training/bin/python');
export interface CropPrediction {modelId:string;garmentKey:string;confidence:number;validationPrecision:number;eligible:boolean;category:string;categoryConfidence:number;categoryEligible:boolean;alternatives:{garmentKey:string;confidence:number}[]}

export async function classifierHealth() {
 if(process.env.LOCAL_CLASSIFIER_ENABLED==='false')return {available:false,reason:'disabled'};
 try {
  await Promise.all([access(checkpoint),access(python)]);
  const report=JSON.parse(await readFile(path.join(path.dirname(checkpoint),'evaluation.json'),'utf8')) as {model_id:string;classes:string[];test?:{accuracy:number;macro_f1:number;category_accuracy:number;examples:number}};
  const test=report.test?{accuracy:report.test.accuracy,macroF1:report.test.macro_f1,categoryAccuracy:report.test.category_accuracy,examples:report.test.examples}:undefined;
  return {available:true,modelId:report.model_id,classes:report.classes,test,role:'Independent crop-label check; disagreements request review. Does not replace Qwen grounding or sleeve detection.'};
 }catch{return {available:false,reason:'No trained checkpoint is installed'};}
}

export async function classifyCrops(crops:Buffer[]):Promise<CropPrediction[]|null> {
 if(!crops.length||!(await classifierHealth()).available)return null;
 return new Promise((resolve,reject)=>{
  const child=spawn(python,['-u',path.join(serverRoot,'training/predict_classifier.py'),checkpoint],{stdio:['pipe','pipe','pipe']});
  let output='';
  const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('Local crop classifier timed out'));},30_000);
  child.stdout.on('data',data=>{output+=String(data);if(output.length>1_000_000){child.kill('SIGTERM');reject(new Error('Classifier response too large'));}});
  // Drain errors without exposing internal model paths to users.
  child.stderr.on('data',()=>{});
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('close',code=>{
   clearTimeout(timer);
   if(code!==0){reject(new Error('Local crop classifier failed'));return;}
   try{const data=JSON.parse(output) as {predictions:CropPrediction[]};if(data.predictions.length!==crops.length)throw new Error('Classifier count mismatch');resolve(data.predictions);}catch(error){reject(error);}
  });
  child.stdin.on('error',()=>{});
  child.stdin.end(JSON.stringify({images:crops.map(crop=>crop.toString('base64'))}));
 });
}
