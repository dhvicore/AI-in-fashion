import { AnalysisHistoryList } from '@/components/AnalysisHistoryList';
export default function AnalysisHistory() {
  return <div className="page-enter mx-auto max-w-[1000px] px-5 pb-24 pt-10 md:px-10">
    <p className="label-caps mb-2 text-wine">Saved to your account</p>
    <h1 className="font-display text-4xl md:text-5xl">Analysis history</h1>
    <p className="mb-8 mt-3 text-sm text-soot">Your saved camera and photo analyses, outfit scores and suggestions. Open a photo to analyze it again automatically.</p>
    <AnalysisHistoryList />
  </div>;
}
