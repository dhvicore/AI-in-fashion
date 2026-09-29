import { useMemo, useState } from 'react';
import { CloudSun, Droplets, RefreshCw, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { COLOR_TABLE, OCCASIONS, STYLES } from '@/data/dataset';
import { CURRENT_WEATHER, combinationKey, generateOutfit, scoreOutfit, type OutfitBrief } from '@/engine/ai';
import type { ClothingItem } from '@/types/fashion';
import { Chip, GarmentArt, Reveal, ScoreRing, Swatch } from '@/components/divara';

const WEATHERS = ['Auto-detect', 'Hot', 'Warm', 'Cool', 'Cold', 'Rainy'];
const SLOT_ORDER = ['Tops', 'Dresses', 'Bottoms', 'Shoes', 'Accessories', 'Outerwear'];
const SLOT_LABEL: Record<string, string> = { Tops: 'Top', Dresses: 'Dress', Bottoms: 'Bottom', Shoes: 'Shoes', Accessories: 'Accessory', Outerwear: 'Outerwear' };

export default function Stylist() {
  const { wardrobe, history } = useApp();
  const [occasion, setOccasion] = useState<string>('Date');
  const [weather, setWeather] = useState<string>('Auto-detect');
  const [style, setStyle] = useState<string>('Chic');
  const [colors, setColors] = useState<string[]>([]);
  const [seed, setSeed] = useState(7);
  const [generated, setGenerated] = useState<ClothingItem[] | null>(null);
  const [thinking, setThinking] = useState(false);

  const brief: OutfitBrief = useMemo(
    () => ({
      occasion,
      weather: weather === 'Auto-detect' ? undefined : weather,
      style,
      colors: colors.length ? colors : undefined,
      seed,
    }),
    [occasion, weather, style, colors, seed],
  );

  const generate = () => {
    setThinking(true);
    setGenerated(null);
    setTimeout(() => {
      setGenerated(generateOutfit(wardrobe, brief));
      setThinking(false);
    }, 900);
  };

  const score = generated ? scoreOutfit(generated, occasion, weather === 'Auto-detect' ? undefined : weather) : null;
  const repeated = generated ? history.some((h) => combinationKey(h.items) === combinationKey(generated)) : false;
  const w = CURRENT_WEATHER;

  const toggleColor = (c: string) => setColors((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c].slice(-4)));

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <Reveal>
        <p className="label-caps mb-2 text-wine">AI Stylist</p>
        <h1 className="font-display text-4xl leading-tight md:text-6xl">What should I wear?</h1>
        <p className="mt-4 max-w-lg text-[15px] text-soot">Tell Divara the occasion, the weather and the mood — get a complete outfit back, scored and explained.</p>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* controls */}
        <Reveal className="lg:col-span-5" delay={80}>
          <div className="space-y-8">
            <div>
              <p className="label-caps mb-3 text-soot/60">Occasion</p>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => <Chip key={o} label={o} active={occasion === o} onClick={() => setOccasion(o)} />)}
              </div>
            </div>
            <div>
              <p className="label-caps mb-3 text-soot/60">Weather</p>
              <div className="flex flex-wrap gap-2">
                {WEATHERS.map((o) => <Chip key={o} label={o} active={weather === o} onClick={() => setWeather(o)} />)}
              </div>
            </div>
            <div>
              <p className="label-caps mb-3 text-soot/60">Style</p>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((o) => <Chip key={o} label={o} active={style === o} onClick={() => setStyle(o)} />)}
              </div>
            </div>
            <div>
              <p className="label-caps mb-3 text-soot/60">Color preference <span className="normal-case tracking-normal text-soot/40">(pick up to 4)</span></p>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_TABLE.map((c) => (
                  <Swatch key={c.name} hex={c.hex} name={c.name} size={30} selected={colors.includes(c.name)} onClick={() => toggleColor(c.name)} />
                ))}
              </div>
              {colors.length > 0 && <p className="mt-2 text-[12px] text-soot/70">{colors.join(' · ')}</p>}
            </div>
            <button onClick={generate} className="btn-solid w-full justify-center !py-4" disabled={thinking}>
              {thinking ? <><RefreshCw size={15} className="animate-spin" /> Styling you…</> : <><Sparkles size={15} /> Generate my outfit</>}
            </button>
          </div>
        </Reveal>

        {/* result */}
        <div className="lg:col-span-7">
          {thinking && (
            <div className="card-ed flex min-h-[420px] flex-col items-center justify-center gap-4 p-10">
              <div className="anim-shimmer h-3 w-40 rounded-full bg-charcoal/10" />
              <div className="anim-shimmer h-3 w-64 rounded-full bg-charcoal/10" style={{ animationDelay: '0.2s' }} />
              <div className="anim-shimmer h-3 w-52 rounded-full bg-charcoal/10" style={{ animationDelay: '0.4s' }} />
              <p className="label-caps mt-4 text-soot/50">Checking compatibility · occasion · weather · trends</p>
            </div>
          )}

          {!thinking && !generated && (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed border-charcoal/25 p-10 text-center">
              <Sparkles size={26} className="text-gold" />
              <p className="mt-4 max-w-xs font-display text-2xl leading-snug text-soot/70">Your outfit will appear here — chosen piece by piece from your closet.</p>
            </div>
          )}

          {!thinking && generated && score && (
            <div className="page-enter">
              {repeated && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold/50 bg-gold/10 px-5 py-3">
                  <p className="text-[13px] font-semibold text-ink">You’ve worn this combination recently — 3 days ago.</p>
                  <button onClick={() => { setSeed(Date.now() % 100000); generate(); }} className="text-[11px] font-bold uppercase tracking-[0.16em] text-wine underline-offset-4 hover:underline">
                    Try this variation instead →
                  </button>
                </div>
              )}
              <div className="card-ed overflow-hidden">
                <div className="grid grid-cols-2 sm:grid-cols-3">
                  {SLOT_ORDER.map((slot) => {
                    const item = generated.find((i) => i.category === slot);
                    if (!item) return null;
                    return (
                      <div key={slot} className="border-b border-r border-charcoal/10 p-5">
                        <p className="label-caps mb-3 text-wine/70">{SLOT_LABEL[slot]}</p>
                        <GarmentArt item={item} className="mx-auto w-full max-w-[130px]" />
                        <p className="mt-3 text-center text-[13px] font-semibold leading-tight">{item.product_name}</p>
                        <p className="text-center text-[10px] uppercase tracking-[0.12em] text-soot/60">{item.color} · {item.style}</p>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center justify-center border-b border-charcoal/10 bg-charcoal p-5 text-cream">
                    <ScoreRing score={score.total} size={110} label="AI score" dark />
                    <p className="label-caps mt-3 text-center text-gold-soft">{occasion} · {style}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="label-caps mb-3 text-soot/60">Why this works</p>
                  <ul className="space-y-2">
                    {score.reasons.map((r) => (
                      <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-soot"><span className="text-gold">✦</span>{r}</li>
                    ))}
                  </ul>
                  <button onClick={() => { setSeed(Date.now() % 100000); generate(); }} className="btn-stroke mt-6 !py-2.5">
                    <RefreshCw size={13} /> Style me again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* weather-based styling */}
      <Reveal delay={100}>
        <div className="mt-16 overflow-hidden rounded-md bg-charcoal text-cream">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
            <div className="border-b border-cream/15 p-8 md:border-b-0 md:border-r">
              <p className="label-caps text-gold-soft">Weather-based styling</p>
              <div className="mt-5 flex items-end gap-3">
                <span className="font-display text-6xl leading-none">{w.tempC}°C</span>
                <p className="pb-1 text-[13px] text-cream/70">{w.city} · {w.condition}</p>
              </div>
              <p className="mt-4 flex items-center gap-2 text-[13px] text-cream/60"><CloudSun size={14} /> Humidity {w.humidity}% <Droplets size={14} className="ml-2" /> Live API slot ready</p>
              <p className="mt-5 font-display text-2xl italic text-cream/90">“{w.advice}”</p>
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r border-cream/15 p-8">
                <p className="label-caps mb-4 text-gold-soft">Recommended</p>
                {w.recommended.map((r) => <p key={r} className="mb-2 text-[13px] text-cream/85"><span className="mr-2 text-gold-soft">✓</span>{r}</p>)}
              </div>
              <div className="p-8">
                <p className="label-caps mb-4 text-cream/40">Avoid</p>
                {w.avoid.map((r) => <p key={r} className="mb-2 text-[13px] text-cream/50"><span className="mr-2">✕</span>{r}</p>)}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
