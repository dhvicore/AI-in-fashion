import { useEffect,useState,useRef } from 'react';
import { Loader2,RefreshCw } from 'lucide-react';
import { useApp } from '@/state/store';
import { api,errorMessage } from '@/lib/api';
import { COLOR_TABLE } from '@/data/dataset';
import { GarmentArt,Swatch } from '@/components/divara';
import { AssessmentCard } from './AssessmentCard';
import type { Assessment,ClothingKnowledge } from '@/types/scoring';
import type { ClothingItem } from '@/types/fashion';
export function OutfitBuilder({title}:{title:string}) {
 const {profile,myItems,go}=useApp();
 const [knowledge,setKnowledge]=useState<ClothingKnowledge>();const [occasion,setOccasion]=useState('Casual');const [weather,setWeather]=useState('Any');const [style,setStyle]=useState('');
 const seen=useRef<Record<string,string[]>>({});
 const [colors,setColors]=useState<string[]>([]);
 const [exhausted,setExhausted]=useState(false);
 const [includeSamples,setIncludeSamples]=useState(false);const [items,setItems]=useState<ClothingItem[]>([]);const [assessment,setAssessment]=useState<Assessment>();const [reused,setReused]=useState(false);
 const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [note,setNote]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;void api.get<ClothingKnowledge>('/scoring/knowledge').then(k=>{if(active)setKnowledge(k);}).catch(e=>{if(active)setError(errorMessage(e));});return()=>{active=false;};},[attempt]);
 const generate=async(samples=includeSamples)=>{
  if(samples!==includeSamples)setIncludeSamples(samples);
  setExhausted(false);
  setLoading(true);setError('');setAssessment(undefined);setItems([]);setNote('');
  try{
   const context={occasion,weather,...(style?{style}:{})};
   const brief=JSON.stringify({context,colors,includeSamples:samples});
   const selection=await api.post<{items:ClothingItem[];note:string;key:string|null;exhausted:boolean}>('/scoring/recommendations',{context,includeSamples:samples,excludedKeys:seen.current[brief]??[],...(colors.length?{colors}:{}),seed:Math.floor(Math.random()*1000000)});
   setItems(selection.items);setNote(selection.note);setExhausted(selection.exhausted);
   if(selection.key)seen.current[brief]=[...(seen.current[brief]??[]),selection.key].slice(-50);
   if(selection.items.length){const result=await api.post<{assessment:Assessment;reused:boolean}>('/scoring/assessments',{automatic:true,itemIds:selection.items.map(i=>i.item_id),context});setAssessment(result.assessment);setReused(result.reused);}
  }catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 };
 const change=()=>{setExhausted(false);setItems([]);setAssessment(undefined);setNote('');};
 return <div>
  <p className="label-caps mb-3 text-wine">Your wardrobe · Your preferences</p><h1 className="font-display text-4xl md:text-5xl">{title}</h1>
  <p className="mt-4 max-w-xl text-sm text-soot">Find a look for your plans, your weather and your style. Choose a colour to include it in your outfit. Only clean, available clothes are used.</p>
  {knowledge&&<div className="card-ed mt-7 space-y-5 p-5"><div className="grid gap-4 sm:grid-cols-3">
   <label className="text-sm">Occasion<select aria-label="Outfit occasion" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={occasion} disabled={loading} onChange={e=>{setOccasion(e.target.value);change();}}>{knowledge.occasions.map(o=><option key={o.key}>{o.key}</option>)}</select></label>
   <label className="text-sm">Weather<select aria-label="Outfit weather" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={weather} disabled={loading} onChange={e=>{setWeather(e.target.value);change();}}><option value="Any">Unspecified</option>{knowledge.weather.map(w=><option key={w.key}>{w.key}</option>)}</select></label>
   <label className="text-sm">Style for this outing<select aria-label="Outfit preferred style" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={style} disabled={loading} onChange={e=>{setStyle(e.target.value);change();}}><option value="">{profile?.styles.length?`My profile (${profile.styles.join(', ')})`:'Everyday casual (default)'}</option>{knowledge.styles.map(s=><option key={s}>{s}</option>)}</select></label>
  </div><div><p className="mb-3 text-sm">Colour preference (optional, up to four)</p><div className="flex flex-wrap gap-2">{COLOR_TABLE.map(c=><Swatch key={c.name} hex={c.hex} name={c.name} selected={colors.includes(c.name)} size={30} onClick={()=>{if(loading)return;setColors(previous=>previous.includes(c.name)?previous.filter(v=>v!==c.name):[...previous,c.name].slice(-4));change();}}/>)}</div>{!!colors.length&&<p className="mt-2 text-xs text-soot">{colors.join(' · ')}</p>}</div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeSamples} disabled={loading} onChange={e=>{setIncludeSamples(e.target.checked);change();}}/>Include sample clothes for the demo</label>
  <button className="btn-solid" disabled={loading||exhausted} onClick={()=>void generate()}>{loading?<><Loader2 size={15} className="animate-spin"/>Finding your outfit…</>:<><RefreshCw size={15}/>{exhausted?'No new looks for these choices':'Generate an outfit'}</>}</button>
  </div>}
  {error&&<div role="alert" className="card-ed mt-5 p-5 text-sm text-wine">{error}{!knowledge&&<button className="btn-stroke ml-3" onClick={()=>{setError('');setAttempt(v=>v+1);}}>Retry</button>}</div>}
  {!myItems.length&&!includeSamples&&<p className="mt-5 text-sm text-soot">Your wardrobe is empty. Add clothes in My Closet, or enable samples to explore the demo.</p>}
  {note&&<div role="status" className="card-ed mt-5 space-y-3 p-5"><p className="text-sm text-soot">{note}</p>{!items.length&&<div className="flex flex-wrap gap-3">{!includeSamples&&<button className="btn-solid" disabled={loading} onClick={()=>void generate(true)}>Explore sample looks</button>}<button className="btn-stroke" onClick={()=>go('wardrobe')}>Add more clothes</button></div>}</div>}
  {!!items.length&&<div className="mt-7 grid gap-7 md:grid-cols-2"><div className="grid content-start grid-cols-2 gap-3">{items.map(item=><div className="card-ed p-4" key={item.item_id}><p className="label-caps text-wine">{item.owned?'Yours':'Sample'}</p><GarmentArt item={item} className="mx-auto mt-3 w-full max-w-[130px]"/><p className="mt-3 text-center text-sm font-semibold">{item.product_name}</p><p className="mt-1 text-center text-xs text-soot">{item.color}{item.style!=='Unknown'?` · ${item.style}`:''}</p></div>)}</div><div>{assessment&&assessment.score!==null&&<AssessmentCard assessment={assessment} reused={reused} compact/>}</div></div>}
 </div>;
}
