import { useMemo, useState } from 'react';
import { Palette, RefreshCw, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { colorHarmony, complementaryColors, generateOutfit, harmonyExplanation, scoreOutfit } from '@/engine/ai';
import { COLOR_TABLE } from '@/data/dataset';
import type { ClothingItem } from '@/types/fashion';
import { GarmentArt, Reveal, ScoreBar, ScoreRing, SectionHeading, Swatch } from '@/components/divara';

const SLOT_ORDER: [string, string][] = [['Tops', 'Top'], ['Bottoms', 'Bottom'], ['Dresses', 'Dress'], ['Shoes', 'Shoes'], ['Accessories', 'Accessory'], ['Outerwear', 'Outerwear']];

export default function Generator() {
  const { wardrobe } = useApp();
  const [seed, setSeed] = useState(42);
  const outfit = useMemo(() => generateOutfit(wardrobe, { seed }), [wardrobe, seed]);
  const score = useMemo(() => scoreOutfit(outfit), [outfit]);

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading
        kicker="Smart outfit generator"
        title="Style Me"
        right={
          <button onClick={() => setSeed(Date.now() % 100000)} className="btn-solid"><RefreshCw size={14} /> Generate another outfit</button>
        }
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* composition */}
        <Reveal className="lg:col-span-7" delay={80}>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-charcoal/15 bg-charcoal/15 sm:grid-cols-3" key={seed}>
            {SLOT_ORDER.map(([slot, label]) => {
              const item = outfit.find((i) => i.category === slot);
              if (!item) return null;
              return (
                <div key={slot + item.item_id} className="page-enter bg-cream p-6">
                  <p className="label-caps mb-4 text-wine/70">{label}</p>
                  <GarmentArt item={item} className="mx-auto w-full max-w-[150px]" />
                  <p className="mt-4 text-center font-display text-lg leading-tight">{item.product_name}</p>
                  <p className="mt-1 text-center text-[10px] uppercase tracking-[0.14em] text-soot/60">{item.color} · {item.pattern} · {item.material}</p>
                </div>
              );
            })}
            {Array.from({ length: (3 - (outfit.length % 3)) % 3 }).map((_, i) => (
              <div key={`filler-${i}`} className="hidden items-center justify-center bg-charcoal p-6 sm:flex">
                <p className="text-center font-display text-lg italic text-cream/70">Styled by Divara <span className="not-italic text-gold-soft">✦</span></p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* score */}
        <Reveal className="lg:col-span-5" delay={160}>
          <div className="card-ed flex h-full flex-col p-8">
            <div className="flex items-center gap-6">
              <ScoreRing score={score.total} size={130} label="Compatibility" />
              <div>
                <p className="font-display text-2xl leading-tight">These pieces speak the same language.</p>
                <p className="mt-2 text-[13px] text-soot">Scored across six dimensions, weighted by what matters to your Style DNA.</p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <ScoreBar label="Color Harmony" value={score.breakdown.colorHarmony} />
              <ScoreBar label="Style Compatibility" value={score.breakdown.styleCompatibility} />
              <ScoreBar label="Occasion" value={score.breakdown.occasionMatch} />
              <ScoreBar label="Weather" value={score.breakdown.weatherMatch} />
              <ScoreBar label="Trend" value={score.breakdown.trend} />
              <ScoreBar label="Versatility" value={score.breakdown.versatility} />
            </div>
          </div>
        </Reveal>
      </div>

      <ColorLab wardrobe={wardrobe} />
    </div>
  );
}

function ColorLab({ wardrobe }: { wardrobe: ClothingItem[] }) {
  const [selected, setSelected] = useState<string[]>(['Black', 'Ivory', 'Burgundy']);
  const toggle = (c: string) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c].slice(-4)));
  const harmony = colorHarmony(selected);
  const recs = selected.length ? complementaryColors(selected[selected.length - 1]) : [];
  const usedColors = useMemo(() => {
    const inWardrobe = new Set(wardrobe.map((i) => i.color));
    return COLOR_TABLE.filter((c) => inWardrobe.has(c.name));
  }, [wardrobe]);

  return (
    <div className="mt-20">
      <SectionHeading kicker="Color matching" title="Do these colors actually work?" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <Reveal className="lg:col-span-6" delay={60}>
          <div className="card-ed p-8">
            <p className="label-caps mb-4 flex items-center gap-2 text-soot/60"><Palette size={13} /> Pick colors from your closet</p>
            <div className="flex flex-wrap gap-3">
              {usedColors.map((c) => (
                <div key={c.name} className="flex flex-col items-center gap-1.5">
                  <Swatch hex={c.hex} name={c.name} size={38} selected={selected.includes(c.name)} onClick={() => toggle(c.name)} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-soot/60">{c.name}</span>
                </div>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="mt-8">
                <p className="label-caps mb-3 text-soot/60">Your combination</p>
                <div className="flex h-16 overflow-hidden rounded-md border border-charcoal/10">
                  {selected.map((c) => (
                    <div key={c} className="flex-1 transition-all duration-500" style={{ background: COLOR_TABLE.find((x) => x.name === c)?.hex }} title={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
        <Reveal className="lg:col-span-6" delay={140}>
          <div className="flex h-full flex-col justify-between rounded-md bg-charcoal p-8 text-cream">
            <div className="flex items-center gap-6">
              <ScoreRing score={harmony} size={120} label="Color harmony" dark />
              <p className="font-display text-xl italic leading-snug text-cream/90">“{selected.length ? harmonyExplanation(selected) : 'Pick at least one color.'}”</p>
            </div>
            {recs.length > 0 && (
              <div className="mt-6 border-t border-cream/15 pt-5">
                <p className="label-caps mb-3 text-gold-soft">Complementary recommendations</p>
                <div className="flex items-center gap-3">
                  {recs.map((r) => {
                    const hex = COLOR_TABLE.find((c) => c.name === r)?.hex ?? '#888';
                    return (
                      <div key={r} className="flex items-center gap-2 rounded-full border border-cream/20 py-1.5 pl-1.5 pr-4">
                        <span className="h-6 w-6 rounded-full" style={{ background: hex, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{r}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="mt-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-cream/40"><Sparkles size={12} /> Real color-theory model plugs in here later</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
