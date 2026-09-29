// ------------------------------------------------------------------
// Divara — core domain types
// These mirror the attribute schema of the real fashion dataset
// (category / color / pattern / style / season / occasion / material /
// fit / scores), so a real CSV/JSON/API source can be dropped in
// without touching the UI.
// ------------------------------------------------------------------

export type Category =
  | 'Tops'
  | 'Bottoms'
  | 'Dresses'
  | 'Shoes'
  | 'Accessories'
  | 'Outerwear';

export interface ClothingItem {
  item_id: string;
  product_name: string;
  category: Category;
  subcategory: string;
  color: string;
  colorHex: string;
  pattern: string;
  style: string;
  season: string[];
  occasion: string[];
  gender: string;
  material: string;
  fit: string;
  formality_score: number; // 0-100
  trend_score: number; // 0-100
  comfort_score: number; // 0-100
  versatility_score: number; // 0-100
  sustainability_score: number; // 0-100
  wear_count: number;
  last_worn_days_ago: number | null; // null = never worn
}

export interface ScoreBreakdown {
  colorHarmony: number;
  styleCompatibility: number;
  occasionMatch: number;
  weatherMatch: number;
  trend: number;
  versatility: number;
}

export interface OutfitScore {
  total: number;
  breakdown: ScoreBreakdown;
  reasons: string[];
}

export interface Outfit {
  outfit_id: string;
  name: string;
  items: ClothingItem[];
  score: OutfitScore;
  occasion?: string;
  createdAt: string; // ISO
  source: 'analyzer' | 'stylist' | 'generator' | 'assistant';
}

export interface Mismatch {
  id: string;
  kind: 'color' | 'occasion' | 'weather' | 'style';
  title: string;
  explanation: string;
  currentItemId: string;
  recommendedItemId: string;
  improvement: number; // style-score delta
}

export interface DetectedPiece {
  item: ClothingItem;
  match: number; // estimated compatibility %
}

export interface AnalysisResult {
  imageLabel: string;
  pieces: DetectedPiece[];
  score: OutfitScore;
  mismatches: Mismatch[];
  fixedOutfitItems: ClothingItem[];
  fixedScore: OutfitScore;
  changedSlots: string[];
}

export interface Trend {
  id: string;
  name: string;
  description: string;
  trendScore: number;
  growthPct: number;
  popularity: number;
  season: string;
  categories: Category[];
  palette: string[]; // hex swatches
  yourCompatibility: number;
  compatibilityReason: string;
  image?: string;
}

export interface StylePersonality {
  name: string;
  tagline: string;
  axes: { label: string; value: number }[];
}

export interface UserProfile {
  name: string;
  styles: string[];
  colors: string[];
  fits: string[];
  occasions: string[];
  climate: string;
  goals: string[];
}

export interface HistoryEntry {
  id: string;
  date: string; // ISO
  label: string;
  occasion: string;
  score: number;
  feedback: string;
  items: ClothingItem[];
  image?: string;
}

export interface WeatherInfo {
  city: string;
  tempC: number;
  condition: string;
  humidity: number;
  advice: string;
  recommended: string[];
  avoid: string[];
}
