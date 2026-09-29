import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, ImagePlus, RotateCcw, Sparkles, TriangleAlert, Upload, X } from 'lucide-react';
import { useApp } from '@/state/store';
import { runOutfitAnalysis } from '@/engine/ai';
import type { AnalysisResult } from '@/types/fashion';
import { GarmentArt, Reveal, ScoreBar, ScoreRing, singularCategory } from '@/components/divara';

type Stage = 'upload' | 'scanning' | 'results' | 'fixed';

const SCAN_STEPS = [
  'Analyzing image…',
  'Detecting clothing…',
  'Analyzing colors…',
  'Checking compatibility…',
  'Checking occasion…',
  'Checking weather…',
  'Comparing trends…',
];

const BOX_TAGS = [
  { label: 'Top · White Shirt', cls: 'left-[18%] top-[12%] w-[38%] h-[26%]' },
  { label: 'Bottom · Black Jeans', cls: 'left-[24%] top-[40%] w-[30%] h-[30%]' },
  { label: 'Shoes · Red Sneakers', cls: 'left-[20%] top-[74%] w-[36%] h-[18%]' },
  { label: 'Outerwear · Blazer', cls: 'left-[56%] top-[16%] w-[30%] h-[42%]' },
];

export default function Analyze() {
  const { wardrobe, analyzerImage, setAnalyzerImage, addHistory, saveOutfit, go } = useApp();
  const [stage, setStage] = useState<Stage>('upload');
  const [stepIdx, setStepIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startScan = useCallback(() => {
    setResult(null);
    setSaved(false);
    setStepIdx(0);
    setStage('scanning');
  }, []);

  const onFile = (f?: File | null) => {
    if (!f || !/^image\/(jpeg|png)$/.test(f.type)) return;
    const url = URL.createObjectURL(f);
    setAnalyzerImage(url);
    startScan();
  };

  useEffect(() => {
    if (stage !== 'scanning') return;
    if (stepIdx >= SCAN_STEPS.length) {
      setResult(runOutfitAnalysis(wardrobe));
      setStage('results');
      return;
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), stepIdx === 0 ? 1100 : 850);
    return () => clearTimeout(t);
  }, [stage, stepIdx, wardrobe]);

  const img = analyzerImage ?? '/images/outfit-before.png';

  const fixScoreDelta = useMemo(() => (result ? result.fixedScore.total - result.score.total : 0), [result]);

  const wearThis = () => {
    if (!result) return;
    addHistory({
      id: `h-${Date.now()}`,
      date: new Date().toISOString(),
      label: 'AI-Fixed Look',
      occasion: 'Casual',
      score: result.fixedScore.total,
      feedback: `Divara swapped ${result.changedSlots.join(' & ').toLowerCase()} — +${fixScoreDelta} style score.`,
      items: result.fixedOutfitItems,
      image: '/images/outfit-after.png',
    });
    saveOutfit({
      outfit_id: `o-${Date.now()}`,
      name: 'The Corrected Look',
      items: result.fixedOutfitItems,
      score: result.fixedScore,
      occasion: 'Casual',
      createdAt: new Date().toISOString(),
      source: 'analyzer',
    });
    setSaved(true);
  };

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      {/* ---------- UPLOAD ---------- */}
      {stage === 'upload' && (
        <>
          <Reveal>
            <p className="label-caps mb-2 text-wine">Outfit Analyzer</p>
            <h1 className="max-w-2xl font-display text-4xl leading-tight md:text-6xl">Let Divara judge your fit.</h1>
            <p className="mt-4 max-w-lg text-[15px] text-soot">Upload your outfit and let AI find what works — and what doesn’t.</p>
          </Reveal>
          <Reveal delay={120}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files?.[0]); }}
              onClick={() => inputRef.current?.click()}
              className={`group mt-10 flex min-h-[380px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-10 text-center transition-all duration-300 ${
                dragging ? 'border-wine bg-blush/40' : 'border-charcoal/25 bg-cream hover:border-wine/60 hover:bg-cream/70'
              }`}
            >
              <input ref={inputRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-wine text-cream transition-transform duration-300 group-hover:scale-110">
                  <Upload size={28} />
                </div>
                <span className="anim-pulse-ring absolute inset-0 rounded-full border-2 border-wine/50" />
              </div>
              <p className="mt-6 font-display text-2xl">Drop your outfit photo here</p>
              <p className="mt-2 text-[13px] text-soot/70">or click to browse · JPG / PNG · camera supported on mobile</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <span className="btn-stroke !py-2.5"><ImagePlus size={14} /> Upload image</span>
                <span className="btn-stroke !py-2.5"><Camera size={14} /> Use camera</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <button
              onClick={() => { setAnalyzerImage(null); startScan(); }}
              className="mt-6 text-[12px] font-bold uppercase tracking-[0.18em] text-wine underline-offset-4 hover:underline"
            >
              No photo handy? Use a sample outfit →
            </button>
          </Reveal>
        </>
      )}

      {/* ---------- SCANNING ---------- */}
      {stage === 'scanning' && (
        <div className="mx-auto max-w-3xl">
          <p className="label-caps mb-6 flex items-center gap-2 text-wine"><Sparkles size={13} className="animate-spin" style={{ animationDuration: '3s' }} /> Divara AI is looking…</p>
          <div className="relative overflow-hidden rounded-md border border-charcoal/15 bg-charcoal">
            <img src={img} alt="Outfit being analyzed" className="max-h-[62vh] w-full object-contain opacity-95" />
            <div className="anim-scanline absolute left-0 h-[3px] w-full bg-gold-soft shadow-[0_0_28px_6px_rgba(201,176,131,0.6)]" />
            {BOX_TAGS.map((b, i) => (
              <div
                key={b.label}
                className={`absolute ${b.cls} rounded-sm border-2 border-gold-soft/90 transition-all duration-700 ${stepIdx > i + 1 ? 'opacity-100' : 'opacity-0'}`}
                style={{ boxShadow: '0 0 0 4000px rgba(23,19,13,0.18)' }}
              >
                <span className="absolute -top-6 left-0 whitespace-nowrap rounded-sm bg-charcoal px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gold-soft">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-2.5">
            {SCAN_STEPS.map((s, i) => (
              <div key={s} className={`flex items-center gap-3 text-[13px] font-semibold transition-all duration-500 ${i < stepIdx ? 'text-charcoal' : i === stepIdx ? 'text-wine' : 'text-soot/35'}`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${i < stepIdx ? 'border-wine bg-wine text-cream' : i === stepIdx ? 'border-wine' : 'border-charcoal/25'}`}>
                  {i < stepIdx ? <Check size={11} /> : i === stepIdx ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-wine" /> : null}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- RESULTS ---------- */}
      {stage === 'results' && result && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-caps mb-2 text-wine">Your outfit breakdown</p>
              <h1 className="font-display text-4xl md:text-5xl">The verdict is in.</h1>
            </div>
            <button onClick={() => setStage('upload')} className="btn-stroke !py-2.5"><RotateCcw size={13} /> Analyze another</button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* image + detected pieces */}
            <div className="lg:col-span-5">
              <div className="card-ed overflow-hidden">
                <div className="relative bg-charcoal">
                  <img src={img} alt="Analyzed outfit" className="max-h-[420px] w-full object-contain" />
                  {BOX_TAGS.map((b) => (
                    <div key={b.label} className={`absolute ${b.cls} rounded-sm border border-gold-soft/70`}>
                      <span className="absolute -top-5 left-0 whitespace-nowrap bg-charcoal/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-gold-soft">{b.label}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3 p-6">
                  {result.pieces.map((p) => (
                    <div key={p.item.item_id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-parchment"><GarmentArt item={p.item} className="h-full w-full" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{p.item.product_name}</p>
                        <p className="text-[11px] text-soot/70">{singularCategory(p.item.category)} · {p.item.color} · {p.item.style}</p>
                      </div>
                      <span className={`font-display text-lg ${p.match >= 80 ? 'text-charcoal' : p.match >= 70 ? 'text-gold' : 'text-wine'}`}>{p.match}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* score + mismatches */}
            <div className="lg:col-span-7">
              <div className="card-ed flex flex-wrap items-center gap-8 p-8">
                <ScoreRing score={result.score.total} size={140} label="Overall" />
                <div className="min-w-[220px] flex-1 space-y-3">
                  <ScoreBar label="Color Harmony" value={result.score.breakdown.colorHarmony} />
                  <ScoreBar label="Style Compatibility" value={result.score.breakdown.styleCompatibility} />
                  <ScoreBar label="Occasion Match" value={result.score.breakdown.occasionMatch} />
                  <ScoreBar label="Trend Score" value={result.score.breakdown.trend} />
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {result.mismatches.map((mm) => {
                  const current = result.pieces.find((p) => p.item.item_id === mm.currentItemId)?.item;
                  const recommended = [...wardrobe, ...result.fixedOutfitItems].find((i) => i.item_id === mm.recommendedItemId);
                  return (
                    <div key={mm.id} className="overflow-hidden rounded-md border border-wine/25 bg-cream">
                      <div className="flex items-center gap-2 border-b border-wine/15 bg-blush/40 px-6 py-3">
                        <TriangleAlert size={14} className="text-wine" />
                        <span className="label-caps text-wine">Potential mismatch — {mm.title}</span>
                      </div>
                      <div className="p-6">
                        <p className="max-w-xl text-[14px] leading-relaxed text-soot">“{mm.explanation}”</p>
                        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          {current && <SwapCard item={current} tag="Current" tone="bad" />}
                          <ArrowRight size={20} className="mx-auto text-wine" />
                          {recommended && <SwapCard item={recommended} tag="Recommended" tone="good" />}
                        </div>
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-charcoal px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-soft">
                          <Sparkles size={12} /> +{mm.improvement} style score
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* keep / replace / try */}
              <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-charcoal/15 bg-charcoal/15">
                <div className="bg-cream p-5">
                  <p className="label-caps mb-2 text-sage">Keep</p>
                  <p className="text-[13px] font-semibold">White Shirt <Check size={13} className="inline text-sage" /></p>
                  <p className="text-[13px] font-semibold">Black Jeans <Check size={13} className="inline text-sage" /></p>
                </div>
                <div className="bg-cream p-5">
                  <p className="label-caps mb-2 text-wine">Replace</p>
                  <p className="text-[13px] font-semibold">Red Sneakers <X size={13} className="inline text-wine" /></p>
                  <p className="text-[13px] font-semibold">Grey Blazer <X size={13} className="inline text-wine" /></p>
                </div>
                <div className="bg-cream p-5">
                  <p className="label-caps mb-2 text-gold">Try</p>
                  <p className="text-[13px] font-semibold">White Sneakers</p>
                  <p className="text-[13px] font-semibold">Relaxed Outerwear</p>
                </div>
              </div>

              <button onClick={() => setStage('fixed')} className="btn-solid mt-8 w-full justify-center !py-4 !text-[13px]">
                <Sparkles size={15} /> Fix My Outfit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- FIXED ---------- */}
      {stage === 'fixed' && result && (
        <div>
          <p className="label-caps mb-2 text-wine">Fix My Outfit</p>
          <h1 className="font-display text-4xl md:text-5xl">Same closet. <em className="text-wine">Better outfit.</em></h1>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* before */}
            <div className="overflow-hidden rounded-md border border-charcoal/15 bg-cream">
              <div className="flex items-center justify-between border-b border-charcoal/10 px-6 py-3">
                <span className="label-caps text-soot/60">Before</span>
                <span className="font-display text-2xl text-soot/70">{result.score.total}<span className="text-sm text-soot/40">/100</span></span>
              </div>
              <img src={img} alt="Before outfit" className="max-h-[380px] w-full object-contain bg-parchment/50" />
              <div className="space-y-1.5 p-6">
                {result.pieces.map((p) => (
                  <p key={p.item.item_id} className={`text-[13px] ${result.mismatches.some((m) => m.currentItemId === p.item.item_id) ? 'font-semibold text-wine line-through decoration-wine/50' : 'text-soot'}`}>
                    {p.item.product_name}
                  </p>
                ))}
              </div>
            </div>
            {/* after */}
            <div className="overflow-hidden rounded-md border-2 border-wine bg-cream shadow-[0_24px_60px_-24px_rgba(110,30,60,0.45)]">
              <div className="flex items-center justify-between border-b border-wine/15 bg-wine px-6 py-3 text-cream">
                <span className="label-caps text-gold-soft">After · AI recommended</span>
                <span className="font-display text-2xl">{result.fixedScore.total}<span className="text-sm text-cream/60">/100</span></span>
              </div>
              <img src="/images/outfit-after.png" alt="Fixed outfit" className="max-h-[380px] w-full object-contain bg-parchment/50" />
              <div className="space-y-1.5 p-6">
                {result.fixedOutfitItems.map((it) => (
                  <p key={it.item_id} className={`text-[13px] ${result.mismatches.some((m) => m.recommendedItemId === it.item_id) ? 'font-semibold text-wine' : 'text-soot'}`}>
                    {it.product_name}
                    {result.mismatches.some((m) => m.recommendedItemId === it.item_id) && <span className="ml-2 rounded-full bg-blush px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-wine">changed</span>}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="card-ed mt-6 flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="space-y-1.5">
              <p className="label-caps text-soot/60">What changed</p>
              <p className="text-[14px] font-semibold">Shoes → changed · Outerwear → changed · Color harmony → improved</p>
              <p className="text-[13px] text-soot">+{fixScoreDelta} style score · saved to your outfit history</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={wearThis} disabled={saved} className="btn-solid">
                {saved ? <><Check size={14} /> Saved to your looks</> : 'Wear This Instead'}
              </button>
              <button onClick={() => go('wardrobe')} className="btn-stroke">Shop my closet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SwapCard({ item, tag, tone }: { item: import('@/types/fashion').ClothingItem; tag: string; tone: 'bad' | 'good' }) {
  return (
    <div className={`rounded-md border p-3 ${tone === 'bad' ? 'border-charcoal/15 bg-parchment/50' : 'border-wine/30 bg-blush/30'}`}>
      <p className={`label-caps mb-2 ${tone === 'bad' ? 'text-soot/60' : 'text-wine'}`}>{tag}</p>
      <div className="mx-auto h-20 w-20"><GarmentArt item={item} className="h-full w-full" /></div>
      <p className="mt-2 text-center text-[12px] font-semibold leading-tight">{item.product_name}</p>
      <p className="text-center text-[10px] uppercase tracking-[0.12em] text-soot/60">{item.color} · {item.style}</p>
    </div>
  );
}
