import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RotateCcw } from 'lucide-react';
import { useApp } from '@/state/store';
import { PhotoUpload } from '@/components/PhotoUpload';
import { AssessmentCard } from '@/components/AssessmentCard';
import { api, errorMessage } from '@/lib/api';
import type { AnalysisEntry, PhotoAnalysis } from '@/types/photoAnalysis';
import type { Assessment, ClothingKnowledge } from '@/types/scoring';

export default function Analyze() {
 const { analyzerImage, analyzerSource, setAnalyzerImage, go, refreshWardrobe, profile } = useApp();
 const [knowledge, setKnowledge] = useState<ClothingKnowledge>();
 const [result, setResult] = useState<PhotoAnalysis | null>(null);
 const [analysisId, setAnalysisId] = useState('');
 const [assessment, setAssessment] = useState<Assessment>();
 const [reused, setReused] = useState(false);
 const [occasion, setOccasion] = useState('Casual');
 const [weather, setWeather] = useState('Any');
 const [style, setStyle] = useState('');
 const [loading, setLoading] = useState(false);
 const [scoring, setScoring] = useState(false);
 const [error, setError] = useState('');
 const [attempt, setAttempt] = useState(0);
 useEffect(() => { let active = true; void api.get<ClothingKnowledge>('/scoring/knowledge').then(k => { if (active) setKnowledge(k); }).catch(() => {}); return () => { active = false; }; }, []);
 useEffect(() => {
  setResult(null); setAssessment(undefined); setAnalysisId(''); setError('');
  if (!analyzerImage) { setLoading(false); return; }
  const controller = new AbortController(); let cancelled = false;
  const timeout = setTimeout(() => controller.abort(), 370_000); setLoading(true);
  void api.post<{ analysis: PhotoAnalysis; entry: AnalysisEntry }>('/analyses', { url: analyzerImage, source: analyzerSource }, controller.signal)
   .then(({ analysis, entry }) => { if (!cancelled) { setResult(analysis); setAnalysisId(entry.id); void refreshWardrobe().catch(e => toast.error(errorMessage(e))); } })
   .catch(e => { if (!cancelled) setError(errorMessage(e)); })
   .finally(() => { clearTimeout(timeout); if (!cancelled) setLoading(false); });
  return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
 }, [analyzerImage, analyzerSource, attempt, refreshWardrobe]);
 useEffect(() => {
  if (!analysisId || !result?.garments.length) { setScoring(false); return; }
  const controller = new AbortController(); let cancelled = false;
  setScoring(true); setAssessment(undefined); setError('');
  void api.post<{ assessment: Assessment; reused: boolean }>('/scoring/assessments', { analysisId, automatic: true, context: { occasion, weather, ...(style ? { style } : {}) } }, controller.signal)
   .then(r => { if (!cancelled) { setAssessment(r.assessment); setReused(r.reused); } })
   .catch(e => { if (!cancelled) setError(errorMessage(e)); })
   .finally(() => { if (!cancelled) setScoring(false); });
  return () => { cancelled = true; controller.abort(); };
 }, [analysisId, result, occasion, weather, style]);
 return <div className="page-enter mx-auto max-w-[1000px] px-5 pb-24 pt-10 md:px-10">
  <div className="mb-3 flex items-center justify-between gap-3"><p className="label-caps text-wine">Outfit analyzer</p><button className="btn-stroke !px-3 !py-2" onClick={() => go('analysis-history')}>Analysis history →</button></div>
  <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-4xl md:text-5xl">{analyzerImage ? 'Your outfit analysis' : 'Let Divara judge your fit.'}</h1>{analyzerImage && <button className="btn-stroke" onClick={() => setAnalyzerImage(null)}><RotateCcw size={14} />Choose another photo</button>}</div>
  <p className="mt-3 text-sm text-soot">Upload a photo or use your camera. Get your outfit score and suggestions automatically.</p>
  {knowledge && <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold text-wine">Optional: change style, occasion or weather</summary><div className="card-ed mt-3 grid gap-4 p-4 sm:grid-cols-3">
   <label>Occasion<select aria-label="Analysis occasion" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={occasion} onChange={e => setOccasion(e.target.value)}>{knowledge.occasions.map(o => <option key={o.key}>{o.key}</option>)}</select></label>
   <label>Weather<select aria-label="Analysis weather" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={weather} onChange={e => setWeather(e.target.value)}><option value="Any">Unspecified</option>{knowledge.weather.map(w => <option key={w.key}>{w.key}</option>)}</select></label>
   <label>Style<select aria-label="Analysis preferred style" className="mt-2 w-full rounded border border-charcoal/20 bg-surface p-2" value={style} onChange={e => setStyle(e.target.value)}><option value="">{profile?.styles.length ? `My profile (${profile.styles.join(', ')})` : 'Everyday casual'}</option>{knowledge.styles.map(s => <option key={s}>{s}</option>)}</select></label>
  </div></details>}
  {!analyzerImage ? <PhotoUpload onUploaded={setAnalyzerImage} /> : <div className="mt-8 grid items-start gap-7 md:grid-cols-2">
   <img src={analyzerImage} alt="Outfit being analyzed" className="max-h-[70vh] w-full rounded-md bg-surface object-contain" />
   <div aria-live="polite" className="space-y-5">
    {(loading || scoring) && <div role="status" className="card-ed p-6"><p className="flex items-center gap-2"><Loader2 size={18} className="animate-spin" />{loading ? 'Analyzing your outfit…' : 'Calculating your score…'}</p>{loading && <p className="mt-3 text-sm text-soot">The local model may take 1–3 minutes for a new photo.</p>}</div>}
    {error && <div role="alert" className="card-ed p-5 text-wine"><p>{error}</p><button className="btn-stroke mt-3" onClick={() => setAttempt(n => n + 1)}>Retry analysis</button></div>}
    {assessment && <AssessmentCard assessment={assessment} reused={reused} compact />}
    {result && <><p className="text-sm leading-relaxed">{result.summary}</p><div className="flex flex-wrap gap-2">{result.garments.map((g, i) => <span key={i} className="rounded-full border border-charcoal/15 bg-surface px-3 py-1 text-xs">{g.color} {g.name}</span>)}</div>{!result.garments.length && <p className="text-sm text-soot">No clothing was recognised. Try a clear photo showing your outfit.</p>}<button className="text-sm font-semibold text-wine" onClick={() => go('wardrobe')}>View clothes in My Closet →</button></>}
   </div>
  </div>}
 </div>;
}
