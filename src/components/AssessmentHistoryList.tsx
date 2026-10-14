import { useEffect,useState } from 'react';
import { api,errorMessage } from '@/lib/api';
import { AssessmentCard } from './AssessmentCard';
import type { Assessment } from '@/types/scoring';
type Entry=Assessment&{url:string|null;source:string};
export function AssessmentHistoryList({compact=false}:{compact?:boolean}) {
 const [entries,setEntries]=useState<Entry[]>([]);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;void api.get<{entries:Entry[]}>(`/scoring/assessments?limit=${compact?4:50}`).then(r=>{if(active)setEntries(r.entries);}).catch(e=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[compact,attempt]);
 return <div className="space-y-4">{error&&<div role="alert" className="card-ed p-4 text-sm text-wine">{error}<button className="btn-stroke ml-3" onClick={()=>{setError('');setAttempt(v=>v+1);}}>Retry saved results</button></div>}
 {entries.map(e=><article className="card-ed p-5" key={e.id}><div className="flex items-center gap-4">{e.url&&<img src={e.url} alt="Outfit photo" className="h-24 w-16 rounded object-cover" />}<div className="flex-1"><p className="label-caps text-wine">{e.source==='camera'?'Camera outfit':e.source==='photo'?'Uploaded outfit':'Wardrobe outfit'}</p><p className="mt-2 text-sm">{e.context.styles.join(' / ')} · {e.context.occasion} · {e.context.weather}</p><p className="mt-2 text-xs text-soot">{new Date(e.createdAt).toLocaleString()}</p></div><p className="font-display text-3xl">{e.score===null?'—':e.score}</p></div>
 <details className="mt-4 border-t border-charcoal/10 pt-3"><summary className="cursor-pointer text-sm font-semibold text-wine">View saved result and breakdown</summary><div className="mt-4"><p className="mb-4 text-sm text-soot">{e.version.endsWith('-auto-v2')?'Detected clothes':'Confirmed pieces'}: {e.garments.map(g=>`${g.color} ${g.garmentKey}${e.version.endsWith('-auto-v2')?'':` (${g.style})`}`).join(', ')}</p><AssessmentCard assessment={e} reused compact={e.version.endsWith('-auto-v2')} /></div></details></article>)}
 </div>;
}
