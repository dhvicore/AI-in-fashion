import { Flame, TrendingUp } from 'lucide-react';
import { useApp } from '@/state/store';
import { TRENDS } from '@/engine/ai';
import { GarmentArt, Marquee, Reveal, ScoreBar, SectionHeading, Swatch } from '@/components/divara';

export default function Trends() {
  const { go, wardrobe } = useApp();

  return (
    <div className="page-enter">
      <div className="mx-auto max-w-[1200px] px-5 pt-10 md:px-10">
        <SectionHeading kicker="Trend intelligence" title="What’s trending?" />
      </div>
      <Marquee items={TRENDS.map((t) => `${t.name} +${t.growthPct}%`)} />
      <div className="mx-auto max-w-[1200px] space-y-10 px-5 py-14 md:px-10">
        {TRENDS.map((t, i) => {
          const matching = wardrobe.filter((w) => t.categories.includes(w.category)).slice(0, 4);
          const flip = i % 2 === 1;
          return (
            <Reveal key={t.id}>
              <article className={`grid grid-cols-1 overflow-hidden rounded-md border border-charcoal/15 bg-cream lg:grid-cols-12 ${flip ? '' : ''}`}>
                {/* image / palette block */}
                <div className={`relative min-h-[260px] lg:col-span-5 ${flip ? 'lg:order-2' : ''}`}>
                  {t.image ? (
                    <img src={t.image} alt={t.name} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex">
                      {t.palette.map((p) => (
                        <div key={p} className="flex-1" style={{ background: p }} />
                      ))}
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex gap-2 rounded-full bg-charcoal/85 px-3 py-2 backdrop-blur-sm">
                    {t.palette.map((p) => (
                      <span key={p} className="h-5 w-5 rounded-full border border-cream/30" style={{ background: p }} />
                    ))}
                  </div>
                </div>

                {/* content */}
                <div className="p-8 lg:col-span-4 lg:p-10">
                  <div className="flex items-center gap-3">
                    <p className="label-caps text-soot/50">{t.season}</p>
                    <span className="flex items-center gap-1 rounded-full bg-wine px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cream">
                      <Flame size={11} /> Trend score {t.trendScore}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{t.name}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-soot">{t.description}</p>
                  <div className="mt-5 flex items-center gap-5 text-[12px] font-semibold">
                    <span className="flex items-center gap-1.5 text-wine"><TrendingUp size={14} /> +{t.growthPct}% this month</span>
                    <span className="text-soot/60">{t.popularity}% popularity</span>
                  </div>
                  <p className="label-caps mt-6 text-soot/50">Applies to</p>
                  <p className="mt-1 text-[13px] font-medium">{t.categories.join(' · ')}</p>
                  <button onClick={() => go('generator')} className="btn-stroke mt-7 !py-2.5">Build an outfit →</button>
                </div>

                {/* is this you */}
                <div className="border-t border-charcoal/10 bg-parchment/50 p-8 lg:col-span-3 lg:border-l lg:border-t-0 lg:p-8">
                  <p className="label-caps text-wine">Is this trend you?</p>
                  <p className="mt-4 font-display text-5xl text-wine">{t.yourCompatibility}<span className="text-2xl">%</span></p>
                  <div className="mt-4">
                    <ScoreBar label="Your compatibility" value={t.yourCompatibility} />
                  </div>
                  <p className="mt-4 text-[12.5px] leading-relaxed text-soot">“{t.compatibilityReason}”</p>
                  {matching.length > 0 && (
                    <div className="mt-5 flex -space-x-2">
                      {matching.map((m) => (
                        <div key={m.item_id} className="h-11 w-11 overflow-hidden rounded-full border-2 border-cream bg-cream" title={m.product_name}>
                          <GarmentArt item={m} className="h-full w-full" />
                        </div>
                      ))}
                      <span className="ml-4 self-center text-[10px] uppercase tracking-[0.12em] text-soot/60">from your closet</span>
                    </div>
                  )}
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
      <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 rounded-md bg-charcoal p-10 text-cream md:flex-row md:items-center">
            <p className="max-w-md font-display text-2xl leading-snug md:text-3xl">Trend timestamps come from external data — the feed API slot is ready.</p>
            <Swatch hex="#C9B083" size={10} />
            <button onClick={() => go('assistant')} className="btn-stroke !border-cream !text-cream hover:!bg-cream hover:!text-charcoal">Ask Divara what suits you →</button>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
