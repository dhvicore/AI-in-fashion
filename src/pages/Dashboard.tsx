import { ArrowRight, CloudSun, Droplets, MapPin, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { CURRENT_WEATHER, derivePersonality, scoreOutfit } from '@/engine/ai';
import { DUMMY_DATASET, HERO_ITEMS } from '@/data/dataset';
import type { ClothingItem } from '@/types/fashion';
import { GarmentArt, Reveal, ScoreBar, ScoreRing, StyleRadar, singularCategory } from '@/components/divara';

function heroAsItem(key: keyof typeof HERO_ITEMS, idx: number): ClothingItem {
  const h = HERO_ITEMS[key];
  return {
    item_id: `DV-DASH-${idx}`,
    product_name: h.product_name,
    category: h.category as ClothingItem['category'],
    subcategory: h.subcategory,
    color: h.color,
    colorHex: h.colorHex,
    pattern: h.pattern,
    style: h.style,
    season: ['Spring', 'Summer', 'Autumn'],
    occasion: ['Office', 'Date'],
    gender: 'Women',
    material: '—',
    fit: 'Regular',
    formality_score: 62,
    trend_score: 88,
    comfort_score: 82,
    versatility_score: 90,
    sustainability_score: 76,
    wear_count: 12,
    last_worn_days_ago: 1,
  };
}

const TODAYS_ITEMS = [heroAsItem('whiteShirt', 1), heroAsItem('blackTrousers', 2), heroAsItem('burgundyBag', 3), heroAsItem('blackHeels', 4)];

export default function Dashboard() {
  const { go, profile, history, wardrobe } = useApp();
  const personality = derivePersonality(wardrobe, profile);
  const score = scoreOutfit(TODAYS_ITEMS, 'Office', 'Warm');
  const firstName = profile?.name?.split(' ')[0] || 'Diva';
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const w = CURRENT_WEATHER;

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      {/* greeting */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label-caps mb-2 text-wine">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl md:text-6xl">
              {greet}, {firstName}&nbsp;<span className="text-gold">✦</span>
            </h1>
            <p className="mt-3 text-[15px] text-soot">Here’s what your style looks like today.</p>
          </div>
          <button onClick={() => go('analyze')} className="btn-solid">Analyze today’s fit <ArrowRight size={14} /></button>
        </div>
      </Reveal>

      {/* editorial grid */}
      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Style DNA */}
        <Reveal className="lg:col-span-5" delay={80}>
          <div className="card-ed h-full p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="label-caps text-soot/60">Your Style DNA</p>
                <h2 className="mt-2 font-display text-3xl text-wine">“{personality.name}”</h2>
                <p className="mt-1 text-[13px] italic text-soot/80">{personality.tagline}</p>
              </div>
              <Sparkles size={20} className="text-gold" />
            </div>
            <div className="mt-6">
              <StyleRadar axes={personality.axes} size={280} />
            </div>
            <button onClick={() => go('profile')} className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-wine underline-offset-4 hover:underline">
              Retake style profile →
            </button>
          </div>
        </Reveal>

        {/* Today's outfit */}
        <Reveal className="lg:col-span-7" delay={160}>
          <div className="card-ed relative h-full overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="relative min-h-[340px]">
                <img src="/images/outfit-today.png" alt="Today's outfit" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute left-4 top-4 rounded-full bg-cream/95 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal">Today’s outfit</div>
              </div>
              <div className="flex flex-col justify-between p-8">
                <div>
                  <div className="flex items-center gap-5">
                    <ScoreRing score={score.total} size={104} label="Style score" />
                    <div className="space-y-1.5">
                      {TODAYS_ITEMS.map((i) => (
                        <p key={i.item_id} className="text-[13px] font-medium text-ink">
                          <span className="text-soot/50">{singularCategory(i.category)} · </span>
                          {i.product_name}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <ScoreBar label="Color Harmony" value={score.breakdown.colorHarmony} />
                    <ScoreBar label="Occasion Match" value={score.breakdown.occasionMatch} />
                    <ScoreBar label="Weather Match" value={score.breakdown.weatherMatch} />
                    <ScoreBar label="Trend Score" value={score.breakdown.trend} />
                  </div>
                </div>
                <WhyThisWorks reasons={score.reasons} />
              </div>
            </div>
          </div>
        </Reveal>

        {/* weather */}
        <Reveal className="lg:col-span-4" delay={120}>
          <div className="flex h-full flex-col justify-between rounded-md bg-charcoal p-8 text-cream">
            <div>
              <div className="flex items-center justify-between">
                <p className="label-caps text-gold-soft">Weather styling</p>
                <CloudSun size={20} className="text-gold-soft" />
              </div>
              <div className="mt-5 flex items-end gap-3">
                <span className="font-display text-6xl leading-none">{w.tempC}°</span>
                <div className="pb-1">
                  <p className="flex items-center gap-1 text-[13px] font-semibold"><MapPin size={12} /> {w.city}</p>
                  <p className="flex items-center gap-1 text-[12px] text-cream/60"><Droplets size={12} /> {w.condition} · {w.humidity}%</p>
                </div>
              </div>
              <p className="mt-5 font-display text-xl italic text-cream/90">“{w.advice}”</p>
            </div>
            <div className="mt-6 space-y-2 border-t border-cream/15 pt-5">
              {w.recommended.map((r) => (
                <p key={r} className="text-[13px] text-cream/80"><span className="mr-2 text-gold-soft">✓</span>{r}</p>
              ))}
              {w.avoid.map((r) => (
                <p key={r} className="text-[13px] text-cream/45"><span className="mr-2">✕</span>{r}</p>
              ))}
            </div>
          </div>
        </Reveal>

        {/* quick gateways */}
        <Reveal className="lg:col-span-8" delay={200}>
          <div className="grid h-full grid-cols-1 gap-px overflow-hidden rounded-md border border-charcoal/15 bg-charcoal/15 sm:grid-cols-3">
            {[
              { t: 'AI Stylist', d: 'What should I wear?', p: 'stylist' as const },
              { t: 'Style Me', d: 'Generate a look', p: 'generator' as const },
              { t: 'What’s trending', d: 'Trend intelligence', p: 'trends' as const },
            ].map((g) => (
              <button key={g.t} onClick={() => go(g.p)} className="group flex flex-col items-start justify-between gap-10 bg-cream p-7 text-left transition-colors hover:bg-parchment">
                <ArrowRight size={18} className="text-soot/40 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:text-wine" />
                <div>
                  <p className="font-display text-2xl">{g.t}</p>
                  <p className="mt-1 text-[12px] text-soot/70">{g.d}</p>
                </div>
              </button>
            ))}
          </div>
        </Reveal>
      </div>

      {/* recent looks */}
      <Reveal delay={100}>
        <div className="mt-14 flex items-end justify-between">
          <h3 className="font-display text-2xl">Recently analyzed</h3>
          <button onClick={() => go('analytics')} className="text-[11px] font-bold uppercase tracking-[0.2em] text-wine underline-offset-4 hover:underline">Full history →</button>
        </div>
      </Reveal>
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {history.slice(0, 4).map((h, i) => (
          <Reveal key={h.id} delay={i * 70}>
            <div className="card-ed p-5">
              <div className="flex items-center justify-between">
                <p className="label-caps text-soot/60">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                <span className={`font-display text-xl ${h.score >= 90 ? 'text-wine' : 'text-ink'}`}>{h.score}</span>
              </div>
              <p className="mt-2 font-display text-lg leading-tight">{h.label}</p>
              <div className="mt-3 flex -space-x-2">
                {h.items.slice(0, 3).map((it) => (
                  <div key={it.item_id + h.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-cream bg-parchment">
                    <GarmentArt item={it} className="h-full w-full" />
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-10 text-center text-[11px] uppercase tracking-[0.2em] text-soot/40">Dataset: {DUMMY_DATASET.length} items · dummy source · swap-ready</p>
    </div>
  );
}

function WhyThisWorks({ reasons }: { reasons: string[] }) {
  return (
    <details className="group mt-6 border-t border-charcoal/15 pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-bold uppercase tracking-[0.18em] text-wine">
        Why this works <span className="transition-transform duration-300 group-open:rotate-45">+</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {reasons.map((r) => (
          <li key={r} className="flex gap-2 text-[13px] leading-relaxed text-soot"><span className="text-gold">✦</span>{r}</li>
        ))}
      </ul>
    </details>
  );
}
