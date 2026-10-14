import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '@/state/store';
import { useAuth } from '@/state/auth';
import { api } from '@/lib/api';
import type { ClothingItem } from '@/types/fashion';
import { ItemCard, SectionHeading } from '@/components/divara';
import { AnalysisHistoryList } from '@/components/AnalysisHistoryList';

export default function Dashboard() {
  const { go, profile, myItems, wardrobePhotos, loadingData } = useApp();
  const { user } = useAuth();
  const [outfit,setOutfit]=useState<ClothingItem[]>([]);
  useEffect(()=>{let active=true;void api.post<{items:ClothingItem[]}>('/scoring/recommendations',{context:{occasion:'Casual',weather:'Any'},seed:0}).then(r=>{if(active)setOutfit(r.items);}).catch(()=>{if(active)setOutfit([]);});return()=>{active=false;};},[profile,myItems]);
  const firstName = (profile?.name || user?.name)?.split(' ')[0] || 'there';
  return <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
    <div className="flex flex-wrap items-center justify-between gap-5"><div><p className="label-caps mb-2 text-wine">Your wardrobe, saved to your account</p><h1 className="font-display text-4xl md:text-5xl">Welcome back, {firstName} ✦</h1><p className="mt-3 text-sm text-soot">Upload your clothes, review their details, and build outfits from your clothes and the sample collection.</p></div><button className="btn-solid" onClick={()=>go('wardrobe')}>Open My Closet <ArrowRight size={16}/></button></div>
    <div className="mt-8 grid grid-cols-2 gap-4"><div className="card-ed p-6"><p className="label-caps text-soot">Your saved pieces</p><p className="mt-3 font-display text-4xl">{loadingData ? '…' : myItems.length}</p></div><div className="card-ed p-6"><p className="label-caps text-soot">Your wardrobe photos</p><p className="mt-3 font-display text-4xl">{loadingData ? '…' : wardrobePhotos.length}</p></div></div>
    <div className="mt-10"><SectionHeading kicker="Your own clean clothes" title="Pieces for your next look" />{outfit.length > 0 ? <><p className="mb-5 text-sm text-soot">A selection from your own clean clothes using your saved style and outing guidance. Review unconfirmed details to improve suggestions.</p><div className="grid grid-cols-2 gap-5 md:grid-cols-4">{outfit.slice(0,4).map(item=><ItemCard key={item.item_id} item={item} compact />)}</div><button className="btn-stroke mt-5" onClick={()=>go('stylist')}>Style my clothes →</button></> : <div className="card-ed p-8"><p className="font-display text-2xl">Start with a photo of your clothes.</p><p className="mt-3 text-sm text-soot">Detected pieces will be saved in My Closet. Photos waiting for details stay available there too.</p><button className="btn-solid mt-5" onClick={()=>{go('analyze');}}>Upload or take a photo</button></div>}</div>
    <div className="mb-5 mt-12 flex items-center justify-between"><h2 className="font-display text-2xl">Recently analyzed</h2><button className="text-sm font-semibold text-wine" onClick={()=>go('analysis-history')}>Full history →</button></div><AnalysisHistoryList compact />
  </div>;
}
