import type { ClothingKnowledge } from '@/types/scoring';
export function GuidancePanel({knowledge,occasion,weather}:{knowledge:ClothingKnowledge;occasion:string;weather:string}) {
 const outing=knowledge.occasions.find(o=>o.key===occasion);const forecast=knowledge.weather.find(w=>w.key===weather);
 return <details className="card-ed mt-5 p-4"><summary className="cursor-pointer text-sm font-semibold text-wine">Clothing guidance for this outing</summary><div className="mt-4 space-y-3 text-sm">
 <p>{outing?.note}</p><p><strong>Example pieces: </strong>{outing?.recommended.map(key=>knowledge.garments.find(g=>g.key===key)?.title).filter(Boolean).join(', ')}.</p>
 {forecast&&<p><strong>{weather}: </strong>{forecast.note}</p>}
 <p className="text-xs text-soot">Your style 40%, colour 30%, {weather==='Any'?'occasion 30%.':'occasion 20%, weather 10%.'} These are Divara’s stored demo rules. Clothing guidance is stored in the local database; dress codes and personal comfort take priority.</p>
 <div className="flex flex-wrap gap-3">{knowledge.sources.map(s=><a className="text-xs text-wine underline" href={s.url} target="_blank" rel="noreferrer" key={s.id}>{s.title} ↗</a>)}</div>
 </div></details>;
}
