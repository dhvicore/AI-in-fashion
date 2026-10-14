import { useApp } from '@/state/store';
export function EmptyWardrobe() {
  const { go, loadingData, wardrobe } = useApp();
  return <div className="mx-auto max-w-3xl px-5 py-12"><p className="label-caps text-wine">Your real wardrobe</p><h1 className="mt-3 font-display text-4xl">{loadingData ? 'Loading your saved clothes…' : wardrobe.length ? 'Review your piece categories.' : 'Add your clothes first.'}</h1><p className="mt-4 text-sm text-soot">Upload a photo in My Closet or Analyze Outfit. Once clothing is identified, it can be used in outfits and wardrobe insights.</p><button className="btn-solid mt-6" onClick={()=>go('wardrobe')}>Open My Closet →</button></div>;
}
