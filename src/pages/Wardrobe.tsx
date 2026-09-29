import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApp } from '@/state/store';
import { fashionData, matches, type ItemQuery } from '@/data/provider';
import { COLOR_TABLE, FITS, OCCASIONS, SEASONS, STYLES } from '@/data/dataset';
import type { Category, ClothingItem } from '@/types/fashion';
import { Chip, ItemCard, Reveal, SectionHeading } from '@/components/divara';

const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories', 'Outerwear'];

export default function Wardrobe() {
  const { wardrobe, addItem, go, setAnalyzerImage } = useApp();
  const [query, setQuery] = useState<ItemQuery>({ category: 'All' });
  const [facets, setFacets] = useState<Record<string, string[]>>({});
  const [adding, setAdding] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fashionData.facets().then((f) => setFacets(f as Record<string, string[]>));
  }, []);

  const items = useMemo(() => wardrobe.filter((i) => matches(i, query)), [wardrobe, query]);

  const set = (patch: Partial<ItemQuery>) => setQuery((q) => ({ ...q, ...patch }));
  const activeFilterCount = ['color', 'style', 'season', 'occasion', 'pattern', 'material'].filter((k) => (query as Record<string, string | undefined>)[k]).length;

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading
        kicker="Digital wardrobe"
        title="My Closet"
        right={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-soot/50" />
              <input
                value={query.search ?? ''}
                onChange={(e) => set({ search: e.target.value || undefined })}
                placeholder='Try "black formal" or "white tops summer"'
                className="w-64 rounded-full border border-charcoal/20 bg-cream py-2 pl-9 pr-4 text-[13px] outline-none transition-colors placeholder:text-soot/40 focus:border-wine"
              />
            </div>
            <button onClick={() => setShowFilters((s) => !s)} className={`btn-stroke !px-4 !py-2 ${activeFilterCount ? '!border-wine !text-wine' : ''}`}>
              <SlidersHorizontal size={13} /> Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </button>
          </div>
        }
      />

      <Reveal delay={60}>
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={(query.category ?? 'All') === c} onClick={() => set({ category: c })} />
          ))}
        </div>
      </Reveal>

      {showFilters && (
        <Reveal>
          <div className="card-ed mb-8 grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ['Color', 'color', facets.colors],
                ['Style', 'style', facets.styles],
                ['Season', 'season', facets.seasons],
                ['Occasion', 'occasion', facets.occasions],
                ['Pattern', 'pattern', facets.patterns],
                ['Material', 'material', facets.materials],
              ] as [string, keyof ItemQuery, string[]][]
            ).map(([label, key, options]) => (
              <label key={key} className="block">
                <span className="label-caps mb-1.5 block text-soot/60">{label}</span>
                <select
                  value={(query[key] as string) ?? ''}
                  onChange={(e) => set({ [key]: e.target.value || undefined } as Partial<ItemQuery>)}
                  className="w-full rounded-sm border border-charcoal/20 bg-ivory px-2 py-2 text-[12px] outline-none focus:border-wine"
                >
                  <option value="">All</option>
                  {(options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
            {activeFilterCount > 0 && (
              <button onClick={() => setQuery({ category: query.category, search: query.search })} className="col-span-full flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-wine">
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        </Reveal>
      )}

      <p className="mb-6 text-[12px] uppercase tracking-[0.18em] text-soot/50">{items.length} pieces · source: dummy dataset</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        <div>
          <button
            onClick={() => setAdding(true)}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed border-charcoal/25 text-soot/60 transition-all hover:border-wine hover:text-wine"
          >
            <Plus size={26} />
            <span className="label-caps">Add to wardrobe</span>
          </button>
        </div>
        {items.map((item, i) => (
          <Reveal key={item.item_id} delay={Math.min(i, 8) * 40}>
            <ItemCard
              item={item}
              onAnalyze={() => {
                setAnalyzerImage(null);
                go('analyze');
              }}
            />
          </Reveal>
        ))}
        {items.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-charcoal/25 p-16 text-center">
            <p className="font-display text-2xl text-soot/60">Nothing in your closet matches that.</p>
            <p className="mt-2 text-[13px] text-soot/50">Loosen a filter or two — or add the piece you’re dreaming of.</p>
          </div>
        )}
      </div>

      {adding && <AddItemPanel onClose={() => setAdding(false)} onAdd={(i) => { addItem(i); setAdding(false); }} />}
    </div>
  );
}

function AddItemPanel({ onClose, onAdd }: { onClose: () => void; onAdd: (i: ClothingItem) => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Tops');
  const [subcategory, setSubcategory] = useState('Shirt');
  const [color, setColor] = useState('Ivory');
  const [style, setStyle] = useState('Minimal');
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const colorDef = COLOR_TABLE.find((c) => c.name === color) ?? COLOR_TABLE[0];

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      item_id: `DV-USER-${Date.now()}`,
      product_name: name.trim(),
      category,
      subcategory,
      color: colorDef.name,
      colorHex: colorDef.hex,
      pattern: 'Solid',
      style,
      season: [...SEASONS].slice(0, 2),
      occasion: [OCCASIONS[6]],
      gender: 'Women',
      material: 'Cotton',
      fit: FITS[1],
      formality_score: 50,
      trend_score: 70,
      comfort_score: 80,
      versatility_score: 70,
      sustainability_score: 60,
      wear_count: 0,
      last_worn_days_ago: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-charcoal/50 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-md bg-ivory p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h3 className="font-display text-2xl">Add to wardrobe</h3>
          <button onClick={onClose} className="text-soot/60 hover:text-charcoal"><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-4">
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-charcoal/30 py-4 text-[12px] font-semibold text-soot/70 hover:border-wine hover:text-wine">
            <Plus size={14} /> {photo ? 'Photo attached ✓' : 'Upload item photo (optional)'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0]?.name ?? null)} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name — e.g. Ivory Silk Blouse" className="w-full rounded-sm border border-charcoal/20 bg-cream px-3 py-2.5 text-[13px] outline-none focus:border-wine" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded-sm border border-charcoal/20 bg-cream px-2 py-2.5 text-[13px] outline-none focus:border-wine">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Subcategory</span>
              <input value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full rounded-sm border border-charcoal/20 bg-cream px-2 py-2.5 text-[13px] outline-none focus:border-wine" />
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Color</span>
              <select value={color} onChange={(e) => setColor(e.target.value)} className="w-full rounded-sm border border-charcoal/20 bg-cream px-2 py-2.5 text-[13px] outline-none focus:border-wine">
                {COLOR_TABLE.map((c) => <option key={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-1 block text-soot/60">Style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-sm border border-charcoal/20 bg-cream px-2 py-2.5 text-[13px] outline-none focus:border-wine">
                {STYLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <button onClick={submit} className="btn-solid w-full justify-center" disabled={!name.trim()}>Add piece</button>
        </div>
      </div>
    </div>
  );
}
