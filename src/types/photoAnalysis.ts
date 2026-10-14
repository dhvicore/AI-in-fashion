export type PhotoSource = 'photo' | 'camera';
export interface PhotoAnalysis {
  garments: { name: string; color: string }[];
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
