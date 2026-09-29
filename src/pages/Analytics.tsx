import { useMemo } from 'react';
import { Leaf, Recycle } from 'lucide-react';
import { useApp } from '@/state/store';
import { wardrobeAnalytics } from '@/engine/ai';
import { GarmentArt, ItemCard, Reveal, ScoreRing, SectionHeading, Swatch } from '@/components/divara';

export default function Analytics() {
  const { wardrobe, history, go } = useApp();
  const a = useMemo(() => wardrobeAnalytics(wardrobe), [wardrobe]);
  const avgScore = Math.round(history.reduce((s, h) => s + h.score, 0) / (history.length || 1));

  const colorEntries = [...a.colorCount.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
  const maxColor = colorEntries[0]?.[1] ?? 1;
  const diversity = Math.round((a.colorCount.size * a.catCount.size * 4.2) / 1) > 100 ? 100 : Math.round(a.colorCount.size * a.catCount.size * 4.2);

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading kicker="Wardrobe analytics" title="Your closet, quantified" />

      {/* stat tiles */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-charcoal/15 bg-charcoal/15 sm:grid-cols-4">
        {[
          { label: 'Total items', value: String(a.totalItems) },
          { label: 'Most used category', value: a.mostUsedCategory?.[0] ?? '—' },
          { label: 'Wardrobe diversity', value: `${diversity}%` },
          { label: 'Avg outfit score', value: String(avgScore) },
        ].map((s, i) => (
          <Reveal key={s.label} delay={i * 60}>
            <div className="flex h-full flex-col justify-between gap-6 bg-cream p-6">
              <p className="label-caps text-soot/60">{s.label}</p>
              <p className="font-display text-3xl md:text-4xl">{s.value}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* color distribution */}
        <Reveal className="lg:col-span-5" delay={80}>
          <div className="card-ed h-full p-8">
            <p className="label-caps mb-1 text-soot/60">Color distribution</p>
            <p className="mb-6 flex items-center gap-2 text-[13px] text-soot">
              Most used:
              <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
                <Swatch hex={wardrobe.find((w) => w.color === a.mostUsedColor?.[0])?.colorHex ?? '#888'} size={14} />
                {a.mostUsedColor?.[0]} ({a.mostUsedColor?.[1]})
              </span>
            </p>
            <div className="space-y-3.5">
              {colorEntries.map(([name, count]) => (
                <div key={name} className="flex items-center gap-3">
                  <Swatch hex={wardrobe.find((w) => w.color === name)?.colorHex ?? '#888'} size={18} name={name} />
                  <span className="w-20 text-[12px] font-semibold">{name}</span>
                  <div className="h-[6px] flex-1 bg-charcoal/10">
                    <div className="h-full bg-charcoal/70" style={{ width: `${(count / maxColor) * 100}%` }} />
                  </div>
                  <span className="w-7 text-right font-display text-sm text-soot">{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 border-t border-charcoal/10 pt-4 font-display text-lg italic text-soot/80">“{a.insights[0]}”</p>
          </div>
        </Reveal>

        {/* insights + most worn */}
        <Reveal className="lg:col-span-4" delay={140}>
          <div className="flex h-full flex-col gap-6">
            <div className="rounded-md bg-charcoal p-8 text-cream">
              <p className="label-caps text-gold-soft">AI insights</p>
              <ul className="mt-4 space-y-3">
                {a.insights.slice(1).map((ins) => (
                  <li key={ins} className="flex gap-2 text-[13.5px] leading-relaxed text-cream/85"><span className="text-gold-soft">✦</span>{ins}</li>
                ))}
              </ul>
            </div>
            {a.mostWorn && (
              <div className="card-ed flex items-center gap-4 p-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-parchment"><GarmentArt item={a.mostWorn} className="h-full w-full" /></div>
                <div>
                  <p className="label-caps text-soot/60">Most worn item</p>
                  <p className="mt-1 font-display text-lg leading-tight">{a.mostWorn.product_name}</p>
                  <p className="mt-0.5 text-[12px] text-soot/70">{a.mostWorn.wear_count} wears · last worn {a.mostWorn.last_worn_days_ago}d ago</p>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {/* sustainability */}
        <Reveal className="lg:col-span-3" delay={200}>
          <div className="flex h-full flex-col justify-between rounded-md border border-sage/40 bg-sage/15 p-8">
            <div>
              <p className="label-caps flex items-center gap-2 text-olive" style={{ color: '#5A6248' }}><Leaf size={13} /> Sustainability</p>
              <div className="mt-4"><ScoreRing score={a.sustainability} size={130} label="Score" /></div>
              <p className="mt-4 text-[13px] leading-relaxed text-soot">How sustainable is your wardrobe? Based on materials, versatility and wear frequency.</p>
            </div>
            <div className="mt-5 space-y-1.5 text-[12px] text-soot">
              <p>✓ {wardrobe.filter((i) => i.versatility_score > 70).length} versatile pieces</p>
              <p>✓ {wardrobe.filter((i) => i.wear_count > 10).length} frequently worn items</p>
              <p>⚠ {a.unused.length} unused pieces</p>
              <p>✦ ~{a.combos.toLocaleString()} potential combinations</p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* wear what you own */}
      <div className="mt-16">
        <SectionHeading kicker="Wear what you own" title="Sleeping beauties in your closet" />
        <p className="-mt-4 mb-8 max-w-xl text-[14px] text-soot">These pieces haven’t been worn in 60+ days. Divara suggests reusing what you own before buying new.</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
          {a.unused.slice(0, 5).map((item, i) => (
            <Reveal key={item.item_id} delay={i * 60}>
              <ItemCard item={item} compact />
            </Reveal>
          ))}
          {a.unused.length === 0 && <p className="col-span-full text-[14px] text-soot">Nothing is gathering dust — impressive.</p>}
        </div>
      </div>

      {/* outfit history */}
      <div className="mt-16">
        <SectionHeading kicker="Outfit history" title="Your style timeline" />
        <div className="relative ml-3 border-l border-charcoal/15 pl-8">
          {history.map((h, i) => (
            <Reveal key={h.id} delay={i * 60}>
              <div className="relative mb-8">
                <span className="absolute -left-[38px] top-2 h-2.5 w-2.5 rounded-full border-2 border-ivory bg-wine" />
                <div className="card-ed flex flex-wrap items-center gap-5 p-5">
                  {h.image ? (
                    <img src={h.image} alt={h.label} className="h-20 w-16 rounded-sm object-cover" />
                  ) : (
                    <div className="flex h-20 w-16 items-center justify-center rounded-sm bg-parchment">
                      <GarmentArt item={h.items[0]} className="h-16 w-14" />
                    </div>
                  )}
                  <div className="min-w-[160px] flex-1">
                    <p className="label-caps text-soot/50">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {h.occasion}</p>
                    <p className="mt-1 font-display text-xl">{h.label}</p>
                    <p className="mt-1 max-w-md text-[12.5px] text-soot">{h.feedback}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className={`font-display text-3xl ${h.score >= 90 ? 'text-wine' : 'text-ink'}`}>{h.score}<span className="text-sm text-soot/40">/100</span></span>
                    <button onClick={() => go('analyze')} className="btn-stroke !px-4 !py-2">Reopen →</button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-soot/40"><Recycle size={12} /> Repetition detection runs against this timeline before every new outfit</p>
      </div>
    </div>
  );
}
