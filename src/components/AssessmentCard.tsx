import type { Assessment } from '@/types/scoring';
export function AssessmentCard({assessment,reused=false,compact=false}:{assessment:Assessment;reused?:boolean;compact?:boolean}) {
 if(assessment.score===null)return <p className="mt-4 text-sm text-soot">{assessment.limitations}</p>;
 const names={style:'Your style',color:'Colour coordination',occasion:'Occasion',weather:'Weather'};
 return <div className="space-y-5">
  <div className="card-ed p-6">
   <p className="label-caps text-wine">{compact?'Outfit score':'Personal outfit compatibility'}</p>
   <p className="mt-2 font-display text-5xl">{`${assessment.score} / 100`}</p>
   <p className="mt-3 text-sm text-soot">{assessment.context.styles.join(' / ')||'No style selected'} · {assessment.context.occasion} · {assessment.context.weather==='Any'?'Weather unspecified':assessment.context.weather}</p>
   <p className="mt-2 text-xs text-sage">{reused?'Reused the saved result for these clothes and preferences.':'Result saved to your account.'}</p>
   <div className="mt-5 space-y-3">{(Object.keys(names) as (keyof typeof names)[]).map(key=>assessment.weights[key]>0&&<div key={key}>
    <div className="flex justify-between gap-3 text-sm"><span>{names[key]} ({assessment.weights[key]}%)</span><strong>{assessment.breakdown[key]??'Needs details'}</strong></div>
    {assessment.breakdown[key]!==null&&<div className="mt-1 h-1.5 overflow-hidden rounded bg-charcoal/10"><div className="h-full bg-wine" style={{width:`${assessment.breakdown[key]}%`}} /></div>}
   </div>)}</div>
   <p className="mt-4 text-xs text-soot">{assessment.limitations}</p>
  </div>
  <section><h2 className="font-display text-2xl">Suggestions for this outing</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{assessment.corrections.map((s,i)=><li key={i}>{s}</li>)}</ul></section>
  {!!assessment.suggestions?.length&&<section><h2 className="font-display text-2xl">Try your own clothes</h2><ul className="mt-3 space-y-2 text-sm">{assessment.suggestions.map(s=><li className="card-ed p-3" key={s.itemId}>Try {s.name} instead of {s.replaces} (+{s.improvement} points under these rules).</li>)}</ul><p className="mt-2 text-xs text-soot">These pieces were clean and available when this result was saved.</p></section>}
  {!compact&&<details className="card-ed p-4"><summary className="cursor-pointer text-sm font-semibold text-wine">How this score was calculated</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{assessment.reasons.map((s,i)=><li key={i}>{s}</li>)}</ul>
   <p className="mt-3 text-xs text-soot">Rules: {assessment.version}. Same confirmed clothes, selected preferences and rule version give the same score. Numeric weights and style matches are Divara’s demo rules.</p>
   {!!assessment.sources.length&&<div className="mt-4 space-y-3">{assessment.sources.map(s=><div key={s.id}><a href={s.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-wine underline">{s.title} ↗</a><p className="mt-1 text-xs text-soot">{s.summary}</p></div>)}</div>}
  </details>}
 </div>;
}
