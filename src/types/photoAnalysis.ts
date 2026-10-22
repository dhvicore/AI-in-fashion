export type PhotoSource = 'photo' | 'camera';
export interface PhotoAnalysis {
  garments: { name: string; color: string; garmentKey?: string; bbox?: number[] | null; confidence?: number }[];
  score: number | null;
  summary: string;
  corrections: string[];
  limitations: string;
}
export interface AnalysisEntry {
  id: string;
  url: string;
  createdAt: string;
  source: PhotoSource;
  analysis: PhotoAnalysis;
}
