import { HttpError } from '../lib/errors.js';

export const visionModel=process.env.OLLAMA_MODEL??'qwen3-vl:4b';
export const chatModel=process.env.OLLAMA_CHAT_MODEL??visionModel;
const base=process.env.OLLAMA_BASE_URL??'http://127.0.0.1:11434';
let tail:Promise<unknown>=Promise.resolve();
let waiting=0;
let active=false;
export const modelQueue=()=>({active,waiting});

// One local inference at a time prevents photo + chat requests exhausting RAM.
// The request timeout begins after its place in the queue is reached.
export async function localChat(body:Record<string,unknown>,timeout=180_000) {
 if(waiting>=16)throw new HttpError(429,'The local model queue is full. Please try again shortly.');
 waiting++;
 const task=tail.catch(()=>{}).then(async()=>{
  waiting--;active=true;
  try {
   const response=await fetch(`${base}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(timeout),body:JSON.stringify({model:visionModel,stream:false,think:false,keep_alive:'10m',...body})});
   if(!response.ok)throw new HttpError(503,`The local model could not complete the request (${response.status}). Check Ollama and retry.`);
   const result=await response.json() as {message?:{content?:string};done_reason?:string};
   if(result.done_reason==='length'||!result.message?.content?.trim())throw new HttpError(502,'The local model returned an incomplete answer. Please retry.');
   return result.message.content;
  } catch(error) {
   if(error instanceof HttpError)throw error;
   throw new HttpError(503,'The local model is unavailable or took too long. Start Ollama and retry.');
  } finally {active=false;}
 });
 tail=task;
 return task;
}

export async function modelHealth() {
 try {
  const response=await fetch(`${base}/api/tags`,{signal:AbortSignal.timeout(3000)});
  if(!response.ok)throw new Error('Unavailable');
  const data=await response.json() as {models?:{name:string}[]};
  const installed=data.models?.map(m=>m.name)??[];
  return {available:true,visionModel,chatModel,visionInstalled:installed.includes(visionModel),chatInstalled:installed.includes(chatModel),queue:modelQueue()};
 } catch {return {available:false,visionModel,chatModel,visionInstalled:false,chatInstalled:false,queue:modelQueue()};}
}
