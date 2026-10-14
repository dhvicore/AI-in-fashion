import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/state/store';
import { GarmentArt, SectionHeading } from '@/components/divara';
import type { ClothingItem } from '@/types/fashion';
interface DayPlan { id:string; date:string; label:string; occasion:string; items:ClothingItem[]; wornAt:string|null }
const localDate=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export default function OutfitCalendar(){
 const {wardrobe,savedOutfits,refreshWardrobe}=useApp();
 const today=localDate(new Date());
 const [date,setDate]=useState(()=>{const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);return localDate(tomorrow);});
 const month=date.slice(0,7);
 const [entries,setEntries]=useState<DayPlan[]>([]);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [label,setLabel]=useState('Tomorrow’s outfit');const [occasion,setOccasion]=useState('Casual');const [ids,setIds]=useState<string[]>([]);const [search,setSearch]=useState('');
 const entry=entries.find(e=>e.date===date);
 useEffect(()=>{let active=true;setLoading(true);setError('');api.get<{entries:DayPlan[]}>(`/calendar?month=${month}`).then(r=>{if(active)setEntries(r.entries);}).catch(e=>{if(active){setEntries([]);setError(errorMessage(e));}}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[month]);
 useEffect(()=>{setLabel(entry?.label??'My outfit');setOccasion(entry?.occasion??'Casual');setIds(entry?.items.map(i=>i.item_id)??[]);},[date,entry]);
 const [year,monthNumber]=month.split('-').map(Number);
 const days=new Date(year,monthNumber,0).getDate();const offset=new Date(year,monthNumber-1,1).getDay();
 const visible=useMemo(()=>wardrobe.filter(i=>`${i.product_name} ${i.category} ${i.color}`.toLowerCase().includes(search.toLowerCase())),[wardrobe,search]);
 const inLaundry=entry?.items.filter(item=>wardrobe.find(w=>w.item_id===item.item_id)?.laundry_status==='in-laundry')??[];
 const displayDate=new Date(`${date}T12:00:00`).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
 const changeMonth=(step:number)=>setDate(localDate(new Date(year,monthNumber-1+step,1)));
 const save=async()=>{setBusy(true);try{const {entry:saved}=await api.put<{entry:DayPlan}>(`/calendar/${date}`,{label,occasion,itemIds:ids});setEntries(e=>[...e.filter(p=>p.date!==date),saved]);toast.success('Outfit plan saved');}catch(e){toast.error('Couldn’t save the plan',{description:errorMessage(e)});}finally{setBusy(false);}};
 const wear=async()=>{if(!entry)return;setBusy(true);try{const {entry:saved}=await api.post<{entry:DayPlan}>(`/calendar/${entry.id}/worn`,{timezone:Intl.DateTimeFormat().resolvedOptions().timeZone});setEntries(e=>e.map(p=>p.id===saved.id?saved:p));await refreshWardrobe();toast.success('Recorded as worn');}catch(e){toast.error('Couldn’t record the outfit',{description:errorMessage(e)});}finally{setBusy(false);}};
 return <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
  <SectionHeading kicker="Plan & remember" title="Outfit Calendar" />
  <p className="mb-6 text-sm text-soot">Plan one look per day. Mark it worn on that day or later. Your plans stay saved after logout; wear counts update only for your own pieces.</p>
  {error&&<p role="alert" className="mb-4 text-wine">{error}</p>}
  <div className="grid gap-6 lg:grid-cols-2">
   <section className="card-ed p-5"><div className="mb-5 flex items-center justify-between"><button aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft/></button><h2 className="font-display text-2xl">{new Date(year,monthNumber-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h2><button aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight/></button></div>
   <div className="grid grid-cols-7 gap-1 text-center">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><span key={d} className="py-2 text-xs text-soot">{d}</span>)}{Array.from({length:offset},(_,i)=><span key={`blank${i}`}/>)}{Array.from({length:days},(_,i)=>{const value=`${month}-${String(i+1).padStart(2,'0')}`;const plan=entries.find(e=>e.date===value);return <button key={value} aria-label={`${value}${plan?` ${plan.wornAt?'Worn':'Planned'}: ${plan.label}`:''}`} aria-pressed={date===value} onClick={()=>setDate(value)} className={`min-h-16 rounded border p-1 ${date===value?'border-wine bg-wine text-cream':'border-charcoal/10 bg-surface'} ${today===value?'font-bold':''}`}><span>{i+1}</span>{plan&&<span className="mt-1 block truncate text-[10px]">{plan.wornAt?'✓ Worn':'• Planned'}</span>}</button>;})}</div>{loading&&<p className="mt-3 text-sm">Loading saved plans…</p>}
   <label className="mt-5 block text-sm">Choose date<input aria-label="Outfit date" type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value);}} className="ml-3 rounded border bg-surface p-2"/></label></section>
   <section className="card-ed p-5"><h2 className="font-display text-2xl">{displayDate}</h2>{entry&&<><p className="mt-3 text-sm text-wine">{entry.wornAt?'✓ Recorded as worn':'Planned'} · {entry.label}</p><div className="mt-3 flex flex-wrap gap-3">{entry.items.map(item=><div key={item.item_id} className="w-20"><GarmentArt item={item} className="w-full"/><p className="text-xs">{item.product_name}</p><span className="text-[10px] text-soot">{item.owned?'Yours':'Sample'}</span></div>)}</div>{inLaundry.length>0&&<p className="mt-3 text-sm text-wine">Currently in laundry: {inLaundry.map(item=>item.product_name).join(', ')}. Your saved plan is kept; mark these pieces clean before using them in a new plan.</p>}</>}
   {!entry?.wornAt&&<fieldset disabled={busy||loading} className="mt-5 space-y-4"><label className="block text-sm">Outfit name<input aria-label="Outfit name" value={label} onChange={e=>setLabel(e.target.value)} maxLength={100} className="mt-1 block w-full rounded border bg-surface p-2"/></label><label className="block text-sm">Occasion<input aria-label="Outfit occasion" value={occasion} onChange={e=>setOccasion(e.target.value)} maxLength={60} className="mt-1 block w-full rounded border bg-surface p-2"/></label>
   {savedOutfits.length>0&&<select aria-label="Use a saved look" defaultValue="" onChange={e=>{const look=savedOutfits.find(o=>o.outfit_id===e.target.value);if(look){setIds(look.items.filter(i=>wardrobe.some(w=>w.item_id===i.item_id&&w.laundry_status!=='in-laundry')).map(i=>i.item_id));setLabel(look.name);setOccasion(look.occasion??'Casual');}}} className="w-full rounded border bg-surface p-2"><option value="">Start with a saved look</option>{savedOutfits.map(o=><option key={o.outfit_id} value={o.outfit_id}>{o.name}</option>)}</select>}
   <input aria-label="Search calendar clothes" placeholder="Search clothes to add…" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded border bg-surface p-2"/>
   <p className="text-sm">{ids.length} selected · choose up to 12 pieces</p><div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">{visible.map(item=><label key={item.item_id} className={`flex cursor-pointer items-center gap-2 rounded border p-2 ${ids.includes(item.item_id)?'border-wine bg-blush/20':'border-charcoal/15'}`}><input type="checkbox" aria-label={`Select ${item.product_name}`} checked={ids.includes(item.item_id)} disabled={!ids.includes(item.item_id)&&(item.laundry_status==='in-laundry'||ids.length>=12)} onChange={e=>setIds(old=>e.target.checked?[...old,item.item_id]:old.filter(id=>id!==item.item_id))}/><GarmentArt item={item} className="w-10 shrink-0"/><span className="text-xs">{item.product_name}<span className="block text-soot">{item.laundry_status==='in-laundry'?'In laundry':item.owned?'Yours':'Sample'}</span></span></label>)}</div>
   <button className="btn-solid disabled:opacity-50" disabled={!label.trim()||!ids.length} onClick={()=>void save()}>{busy?'Saving…':entry?'Update plan':'Save plan'}</button></fieldset>}
   {entry&&!entry.wornAt&&<button className="btn-stroke mt-4 disabled:opacity-50" disabled={busy||loading||date>today} onClick={()=>void wear()}>Mark outfit worn</button>}{entry&&!entry.wornAt&&date>today&&<p className="mt-2 text-xs text-soot">You can mark this look worn on its planned date.</p>}
   </section>
  </div>
 </div>;
}
