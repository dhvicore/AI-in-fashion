import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Shirt, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, type NewItem } from '@/state/store';
import { matches, type ItemQuery } from '@/data/provider';
import { COLOR_TABLE, FITS, OCCASIONS, PATTERNS, SEASONS, STYLES } from '@/data/dataset';
import type { Category, ClothingItem } from '@/types/fashion';
import { Chip, GarmentArt, ItemCard, SectionHeading } from '@/components/divara';
import { LaundryControl } from '@/components/LaundryControl';
import { WardrobeRecovery } from '@/components/WardrobeRecovery';
import { PhotoUpload } from '@/components/PhotoUpload';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { createPortal } from 'react-dom';
import { api, errorMessage } from '@/lib/api';
import { garmentSleeve, type Sleeve } from '@/lib/garmentAppearance';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories', 'Outerwear', 'Uncategorized'];

export default function Wardrobe() {
  const { wardrobe, myItems, wardrobePhotos, addItem, updateItem, deleteItem, restoreItem, refreshWardrobe, loadingData, go, setAnalyzerImage } = useApp();
  useEffect(()=>{
    if(!wardrobePhotos.some(photo=>photo.status==='needs-analysis'))return;
    const timer=setInterval(()=>{void refreshWardrobe().catch(()=>{});},5000);
    return ()=>clearInterval(timer);
  },[wardrobePhotos,refreshWardrobe]);
  const [scope, setScope] = useState<'all' | 'mine' | 'samples'>('all');
  const [laundry, setLaundry] = useState('all');
  const [sort, setSort] = useState('default');
  const [query, setQuery] = useState<ItemQuery>({ category: 'All' });
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState<ClothingItem>();
  const [manualPhoto, setManualPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState<ClothingItem>();
  const [deleting, setDeleting] = useState(false);
  const reload = () => { setError(''); void refreshWardrobe().catch(err => setError(errorMessage(err))); };
  useEffect(() => { void refreshWardrobe().catch(err => setError(errorMessage(err))); }, [refreshWardrobe]);
  const items = useMemo(() => {
    const filtered = wardrobe.filter(item => matches(item, query) && (laundry === 'all' || (item.laundry_status ?? 'clean') === laundry) && (scope === 'all' || (scope === 'mine' ? item.owned : !item.owned)));
    if (sort === 'name') filtered.sort((a, b) => a.product_name.localeCompare(b.product_name));
    if (sort === 'category') filtered.sort((a, b) => a.category.localeCompare(b.category) || a.product_name.localeCompare(b.product_name));
    if (sort === 'least-worn') filtered.sort((a, b) => a.wear_count - b.wear_count || a.product_name.localeCompare(b.product_name));
    return filtered;
  }, [wardrobe, query, scope, laundry, sort]);
  const filtersActive = !!query.search || !!query.color || query.category !== 'All' || laundry !== 'all' || scope !== 'all';
  const resetFilters = () => { setQuery({ category: 'All' }); setLaundry('all'); setScope('all'); };
  const pendingPhotos = wardrobePhotos.filter(photo => photo.status !== 'identified');
  const colors = [...new Set(wardrobe.map(item => item.color))].sort();
  const remove = async (item: ClothingItem) => {
    setDeleting(true);
    try { await deleteItem(item.item_id); await refreshWardrobe(); toast.success('Piece moved to Trash', {duration:10000,action:{label:'Undo',onClick:()=>{void restoreItem(item.item_id).then(()=>toast.success('Piece restored')).catch(err=>toast.error('Couldn’t restore it',{description:errorMessage(err)}));}}}); }
    catch (err) { toast.error('Couldn’t remove it', { description: errorMessage(err) }); }
    finally { setDeleting(false); setRemoving(undefined); }
  };
  return <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
    <SectionHeading kicker="Your clothes & sample collection" title="My Closet" right={<button className="btn-solid" onClick={() => setUploading(true)}><Plus size={16} /> Add photo or use camera</button>} />
    <section className="closet-story mb-8">
      <div className="relative z-10 max-w-lg">
        <p className="label-caps flex items-center gap-2 text-wine"><Sparkles size={14} /> A little less scrolling. A lot more you.</p>
        <h2 className="mt-4 font-display text-3xl leading-tight md:text-4xl">Real clothes.<br /><em className="text-wine">Endless possibilities.</em></h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-soot">Photograph your clothes, review the detected pieces, then build a look that feels like you.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="closet-stat"><Shirt size={15} /><strong>{myItems.length}</strong> your pieces</span>
          <span className="closet-stat"><strong>{wardrobePhotos.length}</strong> saved photos</span>
          <span className="closet-stat"><strong>{myItems.filter(i => i.laundry_status !== 'in-laundry').length}</strong> available</span>
        </div>
      </div>
      <div className="closet-collage" aria-hidden="true">
        <div className="closet-orbit" /><span className="closet-spark">✦</span>
        {wardrobe.slice(0, 3).map((item, index) => <div key={item.item_id} className={`closet-mini closet-mini-${index}`}><GarmentArt item={item} className="h-full w-full" /><span>{item.owned ? 'From your closet' : 'Sample inspiration'}</span></div>)}
        <span className="closet-note">wear. remix. repeat.</span>
      </div>
    </section>
    <p className="mb-6 text-sm leading-relaxed text-soot">Your photos and reviewed clothes stay in your account. Illustrations use each piece’s saved category, colour and sleeve details. Review source photos and correct labels in Edit details.</p>
    <WardrobeRecovery />
    {error && <div role="alert" className="mb-4 text-sm text-wine"><p>{error}</p><button className="mt-2 underline" onClick={reload}>Retry loading wardrobe</button></div>}
    {pendingPhotos.length > 0 && <section className="mb-8"><h2 className="font-display text-2xl">Photos waiting for details</h2><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
      {pendingPhotos.map(photo => <article key={photo.id} className="card-ed p-3"><img src={photo.url} alt="Saved wardrobe photo" className="h-48 w-full rounded object-contain" /><p className="mt-3 text-sm">{photo.status === 'needs-review' ? 'No clear clothing detected' : 'Photo saved — identify the clothing'}</p><button className="btn-stroke mt-3 !px-3 !py-2" onClick={() => { setAnalyzerImage(photo.url, photo.source); go('analyze'); }}>Analyze photo</button><button className="mt-3 block text-sm font-semibold text-wine" onClick={() => { setManualPhoto(photo.url); setAdding(true); }}>Add details manually</button></article>)}
    </div></section>}
    <div className="mb-5 flex flex-wrap items-center gap-3"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-soot" /><input aria-label="Search your clothes" value={query.search ?? ''} onChange={event => setQuery(q => ({...q, search:event.target.value || undefined}))} placeholder="Search your clothes" className="rounded border border-charcoal/20 bg-surface py-2 pl-9 pr-3" /></div><select aria-label="Filter by color" value={query.color ?? ''} onChange={event=>setQuery(q=>({...q,color:event.target.value || undefined}))} className="rounded border border-charcoal/20 bg-surface p-2"><option value="">All colors</option>{colors.map(color=><option key={color}>{color}</option>)}</select><select aria-label="Filter by laundry status" value={laundry} onChange={e=>setLaundry(e.target.value)} className="rounded border border-charcoal/20 bg-surface p-2"><option value="all">All laundry statuses</option><option value="clean">Clean / available</option><option value="in-laundry">In laundry</option></select><button className="text-sm text-wine" onClick={() => {setEditing(undefined);setManualPhoto(null);setAdding(true);}}>Add a piece manually</button></div>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="text-sm text-soot">Sort pieces <select value={sort} onChange={e => setSort(e.target.value)} className="ml-2 rounded border border-charcoal/20 bg-surface p-2"><option value="default">Original order</option><option value="name">Name A–Z</option><option value="category">Category</option><option value="least-worn">Least worn</option></select></label>
      {filtersActive && <button className="text-sm font-semibold text-wine underline" onClick={resetFilters}>Clear filters</button>}
    </div>
    <div className="mb-4 flex gap-2">{(['all', 'mine', 'samples'] as const).map(value => <Chip key={value} label={value === 'all' ? 'Everything' : value === 'mine' ? 'My clothes' : 'Samples'} active={scope === value} onClick={() => setScope(value)} />)}</div>
    <div className="mb-6 flex flex-wrap gap-2">{CATEGORIES.map(category=><Chip key={category} label={category} active={(query.category ?? 'All') === category} onClick={()=>setQuery(q=>({...q,category}))} />)}</div>
    <p className="mb-4 text-xs text-soot">{loadingData ? 'Loading your wardrobe…' : `${items.length} showing · ${myItems.length} saved pieces · ${wardrobe.length - myItems.length} samples · ${wardrobePhotos.length} photos · ${myItems.filter(item => item.laundry_status === 'in-laundry').length} in laundry`}</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{items.map(item=><div key={item.item_id} className="closet-piece"><ItemCard item={item} onAnalyze={item.owned ? ()=>{if(item.source_image_url??item.image_url)setAnalyzerImage(item.source_image_url??item.image_url??null);else setAnalyzerImage(null);go('analyze');} : undefined} onDelete={item.owned ? setRemoving : undefined} />{item.owned && <><LaundryControl item={item} />{item.recognition&&<ConfirmLabels item={item} onSaved={refreshWardrobe} />}<button className="mt-3 text-sm font-semibold text-wine" onClick={()=>{setEditing(item);setAdding(true);}}>{item.needs_review ? 'Review piece details' : 'Edit details'}</button><WearControl item={item} onSaved={refreshWardrobe} /></>}</div>)}</div>
    {!loadingData && !items.length && <div className="mt-6 rounded border border-dashed border-charcoal/25 p-10 text-center"><p className="font-display text-2xl">{wardrobe.length ? 'No pieces match your search.' : 'Start with your own clothes.'}</p><p className="mt-3 text-sm text-soot">{filtersActive ? 'Try another search or clear your filters to see more clothes.' : 'Upload an outfit or garment photo. Recognized clothes will appear here with your photo.'}</p>{filtersActive && <button className="btn-stroke mt-5" onClick={resetFilters}>Show all pieces</button>}</div>}
    {removing && createPortal(<div role="dialog" aria-modal="true" aria-labelledby="remove-piece-title" className="fixed inset-0 z-50 flex items-center justify-center bg-panel/50 p-4"><div className="w-full max-w-sm rounded bg-ivory p-6"><h2 id="remove-piece-title" className="font-display text-2xl">Move piece to Trash?</h2><p className="mt-3 text-sm">{removing.product_name} can be restored with Undo or from Trash.</p><div className="mt-5 flex gap-3"><button disabled={deleting} className="btn-stroke" onClick={()=>setRemoving(undefined)}>Cancel</button><button disabled={deleting} className="btn-solid" onClick={()=>void remove(removing)}>{deleting?'Removing…':'Move to Trash'}</button></div></div></div>, document.body)}
    <Dialog open={uploading} onOpenChange={setUploading}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto bg-ivory">
        <DialogTitle className="pr-6 font-display text-3xl font-normal">Make it yours.</DialogTitle>
        <DialogDescription className="text-soot">Add a garment or outfit from your photos or camera. It’s saved to your wardrobe, then you can review the clothing details.</DialogDescription>
        <PhotoUpload onUploaded={(url,source)=>{setAnalyzerImage(url,source);setUploading(false);go('analyze');}} />
      </DialogContent>
    </Dialog>
    {adding && <AddItemPanel initial={editing} imageUrl={manualPhoto} onClose={()=>{setAdding(false);setEditing(undefined);setManualPhoto(null);}} onAdd={async item=>{if(editing)await updateItem(editing.item_id,item);else await addItem(item);await refreshWardrobe();setAdding(false);setEditing(undefined);setManualPhoto(null);toast.success('Wardrobe saved');}} />}
  </div>;
}

function WearControl({ item, onSaved }: { item: ClothingItem; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const recordWear = async () => {
    if (saving || item.last_worn_days_ago === 0) return;
    setSaving(true);
    try {
      await api.post(`/items/${item.item_id}/wear`);
      toast.success('Wear recorded');
      try { await onSaved(); } catch (err) { toast.error('Wear saved; refresh your wardrobe to see it', { description: errorMessage(err) }); }
    } catch (err) { toast.error('Couldn’t record wear', { description: errorMessage(err) }); }
    finally { setSaving(false); }
  };
  return <div className="mt-2 text-xs text-soot">
    <p>{item.wear_count} {item.wear_count === 1 ? 'wear' : 'wears'} · {item.last_worn_days_ago === null ? 'Not worn yet' : item.last_worn_days_ago === 0 ? 'Last worn today' : `Last worn ${item.last_worn_days_ago} ${item.last_worn_days_ago === 1 ? 'day' : 'days'} ago`}</p>
    <button className="mt-2 text-sm disabled:opacity-50" disabled={saving || item.last_worn_days_ago === 0} onClick={() => void recordWear()}>{saving ? 'Recording…' : item.last_worn_days_ago === 0 ? 'Worn today' : 'Mark worn today'}</button>
  </div>;
}

const FORMALITY: Record<string, number> = { Formal: 85, Chic: 70, Minimal: 60, Vintage: 55, Casual: 35, Streetwear: 30, Sporty: 20 };

function AddItemPanel({ onClose, onAdd, initial, imageUrl = null }: { onClose: () => void; onAdd: (i: NewItem) => Promise<void>; initial?: ClothingItem; imageUrl?: string | null }) {
  const [name, setName] = useState(initial?.product_name ?? '');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Tops');
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? 'Shirt');
  const [color, setColor] = useState(initial?.color ?? 'Ivory');
  const [style, setStyle] = useState(initial?.style ?? 'Minimal');
  const [pattern, setPattern] = useState(initial?.pattern ?? 'Solid');
  const [occasion, setOccasion] = useState(initial?.occasion[0] ?? 'Casual');
  const [sleeve,setSleeve]=useState<Sleeve>(initial?garmentSleeve(initial):'unknown');
  const [material, setMaterial] = useState(initial?.material ?? 'Cotton');
  const [seasons, setSeasons] = useState<string[]>(initial?.season ?? ['Spring', 'Summer']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorDef = COLOR_TABLE.find((c) => c.name === color) ?? { name: color, hex: initial?.colorHex ?? '#808080' };

  const toggleSeason = (s: string) => setSeasons((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        product_name: name.trim(),
        category,
        subcategory: subcategory.trim() || category,
        color: colorDef.name,
        colorHex: colorDef.hex,
        pattern,
        style,
        season: seasons,
        occasion: [occasion],
        gender: initial?.gender ?? 'Unisex',
        material: material.trim() || 'Cotton',
        fit: initial?.fit??FITS[1],
        sleeve,
        formality_score: FORMALITY[style] ?? 50,
        trend_score: initial?.trend_score ?? 50,
        comfort_score: initial?.comfort_score ?? 50,
        versatility_score: initial?.versatility_score ?? 50,
        sustainability_score: initial?.sustainability_score ?? 50,
        image_url: initial?.image_url ?? imageUrl,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  const field = 'w-full rounded-sm border border-charcoal/20 bg-surface px-2 py-2.5 text-[13px] outline-none focus:border-wine';

  return (
    createPortal(<div className="fixed inset-0 z-50 flex items-end justify-center bg-panel/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-md bg-ivory p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-display text-2xl">{initial ? 'Edit piece details' : 'Add piece details'}</h3>
          <button onClick={onClose} className="text-soot/60 hover:text-charcoal" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-4">
          {(initial?.image_url || imageUrl) && <img src={initial?.image_url ?? imageUrl!} alt="Source garment photo" className="mx-auto max-h-44 rounded object-contain" />}
          <label className="block"><span className="label-caps mb-1 block text-soot/60">Sleeves</span><select aria-label="Sleeve details" value={sleeve} onChange={e=>setSleeve(e.target.value as Sleeve)} className={field}><option value="unknown">Not specified</option><option value="strapless">Strapless</option><option value="sleeveless">Sleeveless</option><option value="short">Short sleeves</option><option value="long">Long sleeves</option></select></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name — e.g. Ivory Silk Blouse" className="w-full rounded-sm border border-charcoal/20 bg-surface px-3 py-2.5 text-[13px] outline-none focus:border-wine" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={field}>
                {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Type</span>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} placeholder="Shirt, Jeans, Sneakers…" className={field} />
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Color</span>
              <select value={color} onChange={(e) => setColor(e.target.value)} className={field}>
                {!COLOR_TABLE.some(c => c.name === color) && <option>{color}</option>}
                {COLOR_TABLE.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className={field}>
                {!STYLES.some(value => value === style) && <option>{style}</option>}
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Pattern</span>
              <select value={pattern} onChange={(e) => setPattern(e.target.value)} className={field}>
                {!PATTERNS.some(value => value === pattern) && <option>{pattern}</option>}
                {PATTERNS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Occasion</span>
              <select value={occasion} onChange={(e) => setOccasion(e.target.value)} className={field}>
                {OCCASIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <label className="col-span-2 block">
              <span className="label-caps mb-1 block text-soot/60">Material</span>
              <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Cotton, Denim, Silk…" className={field} />
            </label>
          </div>
          <div>
            <span className="label-caps mb-2 block text-soot/60">Seasons</span>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => <Chip key={s} label={s} active={seasons.includes(s)} onClick={() => toggleSeason(s)} />)}
            </div>
          </div>
          <WardrobeRecovery />
    {error && <p role="alert" className="text-[13px] font-medium text-wine">{error}</p>}
          <button onClick={submit} className="btn-solid w-full justify-center disabled:opacity-60" disabled={!name.trim() || saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} {initial ? 'Save changes' : 'Add piece'}
          </button>
        </div>
      </div>
    </div>, document.body)
  );
}

function ConfirmLabels({item,onSaved}:{item:ClothingItem;onSaved:()=>Promise<void>}) {
 const [saving,setSaving]=useState(false);
 const confirm=async()=>{setSaving(true);try{await api.post(`/items/${item.item_id}/confirm`);await onSaved();toast.success('Labels confirmed');}catch(e){toast.error(errorMessage(e));}finally{setSaving(false);}};
 if(item.labels_confirmed)return <p className="mt-3 text-xs text-sage">Labels confirmed by you</p>;
 return <div className="mt-3 text-xs"><p className="text-soot">{(item.recognition?.confidence??1)<0.55?'Uncertain detection — review the source photo and name.':'Review the source photo, clothing type and colour.'}</p><details className="mt-2"><summary className="cursor-pointer text-wine">Review source photo</summary><img src={item.image_url??undefined} alt={item.product_name} className="mt-2 h-36 w-full object-contain" /></details><button disabled={saving} className="mt-2 font-semibold text-wine disabled:opacity-50" onClick={()=>void confirm()}>{saving?'Saving…':'Confirm these labels'}</button></div>;
}
