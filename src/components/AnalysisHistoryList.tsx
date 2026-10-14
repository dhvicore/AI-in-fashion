import { AssessmentHistoryList } from './AssessmentHistoryList';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, errorMessage } from '@/lib/api';
import { useApp } from '@/state/store';
import type { AnalysisEntry } from '@/types/photoAnalysis';

type HistoryPage = { entries: AnalysisEntry[]; nextCursor: string | null };

export function AnalysisHistoryList({ compact = false }: { compact?: boolean }) {
  const { setAnalyzerImage, go } = useApp();
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setLoading(true);
    setError('');
    void api.get<HistoryPage>(`/analyses?limit=${compact ? 4 : 20}`)
      .then((page) => { if (!cancelled) { setEntries(page.entries); setCursor(page.nextCursor); } })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; mounted.current = false; };
  }, [compact, attempt]);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true); setError('');
    try {
      const page = await api.get<HistoryPage>(`/analyses?cursor=${encodeURIComponent(cursor)}&limit=20`);
      if (mounted.current) { setEntries((current) => [...current, ...page.entries.filter((entry) => !current.some((row) => row.id === entry.id))]); setCursor(page.nextCursor); }
    } catch (err) { if (mounted.current) setError(errorMessage(err)); }
    finally { if (mounted.current) setLoading(false); }
  };

  return <div className="space-y-4"><AssessmentHistoryList compact={compact} />
    {error && <div role="alert" className="card-ed p-5 text-sm text-wine"><p>{error}</p><button className="btn-stroke mt-3" onClick={() => entries.length && cursor ? void loadMore() : setAttempt((value) => value + 1)}>Retry history</button></div>}
    {!loading && !error && entries.length === 0 && <div className="rounded-md border border-dashed border-charcoal/25 p-8 text-center"><p className="font-display text-xl">No photo recognitions yet.</p><p className="mt-2 text-sm text-soot">Upload or capture an outfit. Completed results will appear here and remain available when you log in again.</p><button className="btn-stroke mt-5" onClick={() => { setAnalyzerImage(null); go('analyze'); }}>Analyze an outfit →</button></div>}
    {entries.length > 0 && <p className="pt-4 text-xs text-soot">Earlier photo recognition records are kept below. Open a photo to receive an automatic score using the current rules.</p>}
    {entries.map((entry) => <article key={entry.id} className="card-ed p-5">
      <div className="flex flex-wrap items-center gap-4">
        <img src={entry.url} alt="Analyzed outfit" loading="lazy" className="h-28 w-20 shrink-0 rounded object-cover" />
        <div className="min-w-[160px] flex-1">
          <p className="label-caps text-soot">{entry.source === 'camera' ? 'Camera photo' : 'Uploaded photo'}</p>
          <p className="mt-2 text-xs text-soot">{new Date(entry.createdAt).toLocaleString()}</p>
          <p className="mt-2 text-sm">{entry.analysis.summary}</p>
        </div>
        <div className="text-center"><p className="text-xs text-soot">Recognition record</p></div>
        <button className="btn-stroke !px-3 !py-2" onClick={() => { setAnalyzerImage(entry.url, entry.source); go('analyze'); }}>Review photo →</button>
      </div>
      {!compact && <details className="mt-4 border-t border-charcoal/10 pt-3"><summary className="cursor-pointer text-sm font-semibold text-wine">Earlier recognition details</summary><div className="mt-4 space-y-3 text-sm">
        {entry.analysis.garments.length > 0 && <p><strong>Detected: </strong>{entry.analysis.garments.map((item) => `${item.color} ${item.name}`).join(', ')}</p>}
        {entry.analysis.corrections.length > 0 && <ul className="list-disc space-y-2 pl-5">{entry.analysis.corrections.map((suggestion, index) => <li key={index}>{suggestion}</li>)}</ul>}
        {entry.analysis.limitations && <p className="text-soot">{entry.analysis.limitations}</p>}
      </div></details>}
    </article>)}
    {loading && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="animate-spin" size={16} /> Loading analysis history…</p>}
    {!compact && cursor && !loading && !error && <button className="btn-stroke" onClick={() => void loadMore()}>Load older results</button>}
  </div>;
}
