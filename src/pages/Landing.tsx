import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, ScanFace, Shirt, Sparkles, Sun, TrendingUp, Wand2, Palette } from 'lucide-react';
import { useApp } from '@/state/store';
import { Marquee, Reveal } from '@/components/divara';

const FLOATING_LABELS = [
  { text: '92% Style Match', pos: 'left-[-8%] top-[14%]', delay: '0s' },
  { text: 'Perfect for Evening', pos: 'right-[-6%] top-[38%]', delay: '0.8s' },
  { text: 'Color Harmony: Excellent', pos: 'left-[-12%] bottom-[26%]', delay: '1.6s' },
  { text: 'Trending +18%', pos: 'right-[2%] bottom-[8%]', delay: '2.4s' },
];

const FEATURES = [
  { icon: Wand2, name: 'AI Stylist', desc: 'Occasion, weather and mood in — a complete outfit out.', page: 'stylist' as const },
  { icon: Shirt, name: 'Smart Wardrobe', desc: 'Your entire closet, catalogued and understood.', page: 'wardrobe' as const },
  { icon: ScanFace, name: 'Outfit Analyzer', desc: 'Upload a photo. Divara judges the fit, piece by piece.', page: 'analyze' as const },
  { icon: Sun, name: 'Weather Styling', desc: 'Looks that respect the forecast, not just the mood.', page: 'dashboard' as const },
  { icon: TrendingUp, name: 'Trend Intelligence', desc: 'What’s rising — and whether it’s actually you.', page: 'trends' as const },
  { icon: Palette, name: 'Style Personality', desc: 'Your Style DNA, mapped across five axes.', page: 'dashboard' as const },
];

const PIPELINE = ['Analyzing image', 'Detecting clothing', 'Analyzing colors', 'Checking compatibility', 'Checking occasion', 'Checking weather', 'Comparing trends'];

export default function Landing() {
  const { go, enter } = useApp();
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 150);
    return () => clearTimeout(t);
  }, []);

  const openApp = (page: 'dashboard' | 'stylist' | 'wardrobe' | 'analyze' | 'trends') => {
    enter();
    go(page);
  };

  return (
    <div className="min-h-screen bg-ivory">
      {/* top bar */}
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-6 md:px-12">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tracking-tight">Divara</span>
          <span className="hidden text-[10px] uppercase tracking-[0.3em] text-soot/60 sm:inline">AI Fashion Intelligence</span>
        </div>
        <nav className="hidden items-center gap-8 text-[12px] font-semibold uppercase tracking-[0.18em] text-soot md:flex">
          <a href="#features" className="transition-colors hover:text-wine">Features</a>
          <a href="#how" className="transition-colors hover:text-wine">How it thinks</a>
          <a href="#flow" className="transition-colors hover:text-wine">The demo</a>
        </nav>
        <button onClick={() => openApp('dashboard')} className="btn-stroke !px-5 !py-2.5">
          Enter Divara <ArrowRight size={14} />
        </button>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-6 pb-20 pt-6 md:px-12 lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:pt-10">
        <div className="relative z-10">
          <p className={`label-caps mb-6 flex items-center gap-2 text-wine transition-opacity duration-700 ${heroIn ? 'opacity-100' : 'opacity-0'}`}>
            <Sparkles size={13} /> Your AI. Your Style. Your Diva.
          </p>
          <h1 className="font-display text-[13vw] font-medium leading-[0.98] tracking-[-0.02em] sm:text-7xl lg:text-[5.6rem]">
            <span className={`line-mask ${heroIn ? 'is-in' : ''}`}><span>Dress Smarter.</span></span>
            <span className={`line-mask ${heroIn ? 'is-in' : ''}`}><span style={{ transitionDelay: '120ms' }}>Dress <em className="text-wine">like you.</em></span></span>
          </h1>
          <p className={`mt-7 max-w-md text-[15px] leading-relaxed text-soot transition-all delay-300 duration-700 ${heroIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            Divara uses AI to understand your wardrobe, your style and your occasion — then creates outfits that actually work for you.
          </p>
          <div className={`mt-9 flex flex-wrap gap-4 transition-all delay-500 duration-700 ${heroIn ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
            <button onClick={() => openApp('stylist')} className="btn-solid">
              Try AI Stylist <ArrowRight size={14} />
            </button>
            <button onClick={() => openApp('wardrobe')} className="btn-stroke">
              Explore My Wardrobe
            </button>
          </div>
          <div className={`mt-12 flex gap-10 border-t border-charcoal/15 pt-6 transition-all delay-700 duration-700 ${heroIn ? 'opacity-100' : 'opacity-0'}`}>
            {[['84+', 'pieces understood'], ['6', 'AI style engines'], ['94', 'best outfit score']].map(([n, l]) => (
              <div key={l}>
                <p className="font-display text-3xl">{n}</p>
                <p className="label-caps mt-1 text-soot/60">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* hero collage */}
        <div className="relative mx-auto w-full max-w-[440px] lg:max-w-none">
          <div className="relative ml-auto w-[78%]">
            <div className="overflow-hidden rounded-t-[160px] border border-charcoal/10 shadow-[0_30px_60px_-30px_rgba(23,19,13,0.35)]">
              <img src="/images/hero-main.png" alt="Editorial look in burgundy and ivory" className="aspect-[2/3] w-full object-cover" />
            </div>
          </div>
          <div className="anim-floaty absolute bottom-[6%] left-0 w-[44%] overflow-hidden rounded-md border-4 border-cream shadow-[0_24px_50px_-20px_rgba(23,19,13,0.4)]" style={{ animationDelay: '1.2s' }}>
            <img src="/images/hero-detail.png" alt="Burgundy handbag and heels still life" className="aspect-[2/3] w-full object-cover" />
          </div>
          {FLOATING_LABELS.map((l) => (
            <div
              key={l.text}
              className={`anim-floaty absolute ${l.pos} z-10 hidden items-center gap-2 rounded-full border border-charcoal/10 bg-cream/95 px-4 py-2 shadow-[0_10px_30px_-12px_rgba(23,19,13,0.35)] backdrop-blur-sm sm:flex`}
              style={{ animationDelay: l.delay }}
            >
              <span className="relative flex h-2 w-2">
                <span className="anim-pulse-ring absolute inline-flex h-full w-full rounded-full bg-wine" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-wine" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-charcoal">{l.text}</span>
            </div>
          ))}
        </div>
      </section>

      <Marquee items={['AI Stylist', 'Smart Wardrobe', 'Outfit Analyzer', 'Weather Styling', 'Trend Intelligence', 'Style Personality']} />

      {/* feature gateways */}
      <section id="features" className="mx-auto max-w-[1440px] px-6 py-24 md:px-12">
        <Reveal>
          <p className="label-caps mb-3 text-wine">Six engines, one closet</p>
          <h2 className="max-w-2xl font-display text-4xl leading-tight md:text-5xl">Everything a stylist does. None of the appointment.</h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-1 border-t border-charcoal/15 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.name} delay={i * 70}>
              <button
                onClick={() => openApp(f.page)}
                className="group flex h-full w-full flex-col items-start border-b border-charcoal/15 p-8 text-left transition-colors duration-300 hover:bg-cream sm:border-r lg:[&:nth-child(3n)]:border-r-0"
              >
                <div className="flex w-full items-start justify-between">
                  <f.icon size={22} strokeWidth={1.5} className="text-wine" />
                  <ArrowUpRight size={18} className="text-soot/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-wine" />
                </div>
                <p className="mt-10 font-display text-2xl">{f.name}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-soot">{f.desc}</p>
                <span className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-soot/50">0{i + 1}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* how it thinks — dark editorial */}
      <section id="how" className="bg-charcoal text-cream">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-14 px-6 py-24 md:px-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="label-caps mb-3 text-gold-soft">Inside the machine</p>
              <h2 className="font-display text-4xl leading-tight md:text-5xl">How Divara thinks about a single outfit.</h2>
              <p className="mt-6 max-w-md text-[15px] leading-relaxed text-cream/70">
                Every photo goes through a seven-stage reasoning pipeline — the same shape a real computer-vision and recommendation model will plug into later.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative mt-10 overflow-hidden rounded-md border border-cream/15">
                <img src="/images/outfit-before.png" alt="Outfit under analysis" className="aspect-[3/2] w-full object-cover opacity-90" />
                <div className="anim-scanline absolute left-0 h-[3px] w-full bg-gold-soft/90 shadow-[0_0_24px_4px_rgba(201,176,131,0.55)]" />
                <div className="absolute left-[8%] top-[16%] rounded-sm border border-gold-soft/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gold-soft">Top · detected</div>
                <div className="absolute bottom-[14%] right-[10%] rounded-sm border border-gold-soft/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gold-soft">Shoes · mismatch</div>
              </div>
            </Reveal>
          </div>
          <ol className="flex flex-col justify-center">
            {PIPELINE.map((step, i) => (
              <Reveal key={step} delay={i * 90}>
                <li className="group flex items-baseline gap-6 border-b border-cream/15 py-5">
                  <span className="font-display text-sm text-gold-soft">0{i + 1}</span>
                  <span className="font-display text-2xl transition-transform duration-300 group-hover:translate-x-2 md:text-3xl">{step}…</span>
                  <span className="ml-auto h-px w-0 bg-gold-soft transition-all duration-500 group-hover:w-16" />
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* demo flow */}
      <section id="flow" className="mx-auto max-w-[1440px] px-6 py-24 md:px-12">
        <Reveal>
          <p className="label-caps mb-3 text-wine">The hero moment</p>
          <h2 className="max-w-3xl font-display text-4xl leading-tight md:text-5xl">From “judge my fit” to a 94/100 — in one flow.</h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-charcoal/15 bg-charcoal/15 sm:grid-cols-3 lg:grid-cols-6">
          {['Upload photo', 'AI detects pieces', 'Mismatches flagged', 'Why explained', 'Fix My Outfit', 'Before 72 → After 94'].map((s, i) => (
            <Reveal key={s} delay={i * 60}>
              <div className="flex h-full flex-col justify-between gap-8 bg-ivory p-6">
                <span className="font-display text-3xl text-wine/30">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[13px] font-semibold leading-snug">{s}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-14 flex flex-col items-start justify-between gap-8 rounded-md bg-wine p-10 text-cream md:flex-row md:items-center">
            <div>
              <p className="font-display text-3xl md:text-4xl">Your closet is already smart.</p>
              <p className="mt-2 text-cream/75">Time its stylist caught up.</p>
            </div>
            <button onClick={() => openApp('analyze')} className="btn-stroke !border-cream !text-cream hover:!bg-cream hover:!text-wine">
              Let Divara judge your fit <ArrowRight size={14} />
            </button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-charcoal/15">
        <div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-4 px-6 py-10 text-[12px] text-soot/70 md:flex-row md:items-center md:px-12">
          <span className="font-display text-xl text-charcoal">Divara</span>
          <p>Your AI. Your Style. Your Diva.</p>
          <p className="uppercase tracking-[0.18em]">Prototype · dummy dataset · ML-ready architecture</p>
        </div>
      </footer>
    </div>
  );
}
