import { useEffect, useMemo, useState } from 'react';
import { Palette } from 'lucide-react';
import { useApp } from '@/state/store';
import { complementaryColors } from '@/engine/ai';
import { api, errorMessage } from '@/lib/api';
import { COLOR_TABLE } from '@/data/dataset';
import type { ClothingItem } from '@/types/fashion';
import { Reveal, ScoreRing, SectionHeading, Swatch } from '@/components/divara';
import { OutfitBuilder } from '@/components/OutfitBuilder';

export default function Stylist() {
  const { wardrobe } = useApp();
  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <OutfitBuilder title="What should I wear?" />
      <ColorLab wardrobe={wardrobe} />
    </div>
  );
}

function ColorLab({ wardrobe }: { wardrobe: ClothingItem[] }) {
  const [selected, setSelected] = useState<string[]>(() => [...new Set(wardrobe.map(item => item.color))].slice(0, 3));
  const toggle = (c: string) => setSelected((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c].slice(-4)));
  const [harmony,setHarmony]=useState<number|null>(null);
  const [explanation,setExplanation]=useState('');
  const selectedKey=JSON.stringify(selected);
  useEffect(()=>{let active=true;setHarmony(null);void api.post<{score:number|null;explanation:string}>('/scoring/colour-match',{colors:JSON.parse(selectedKey)}).then(r=>{if(active){setHarmony(r.score);setExplanation(r.explanation);}}).catch(e=>{if(active)setExplanation(errorMessage(e));});return()=>{active=false;};},[selectedKey]);
  const recs = selected.length ? complementaryColors(selected[selected.length - 1]) : [];
  const usedColors = useMemo(() => {
    const colors = new Map(wardrobe.map(item => [item.color, { name: item.color, hex: item.colorHex }]));
    return [...colors.values()];
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
                    <div key={c} className="flex-1 transition-all duration-500" style={{ background: usedColors.find((x) => x.name === c)?.hex }} title={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Reveal>
        <Reveal className="lg:col-span-6" delay={140}>
          <div className="flex h-full flex-col justify-between rounded-md bg-panel p-8 text-cream">
            <div className="flex items-center gap-6">
              {harmony!==null?<ScoreRing score={harmony} size={120} label="Color harmony" dark />:<span className="font-display text-3xl">—</span>}
              <p className="font-display text-xl italic leading-snug text-cream/90">“{selected.length ? explanation : 'Pick at least one color.'}”</p>
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
            <p className="mt-6 text-[11px] text-cream/60">Color suggestions use your saved wardrobe colors.</p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
