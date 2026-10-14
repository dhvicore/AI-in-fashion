import type { ClothingItem } from '@/types/fashion';
import { DUMMY_DATASET } from './dataset';

// ------------------------------------------------------------------
// Data abstraction layer.
//
// The UI NEVER imports the dummy dataset directly — it always goes
// through a FashionDataProvider. To connect the real dataset later:
//
//   1. CSV/JSON  → implement CsvDataProvider (parse + map columns to
//      the ClothingItem schema in src/types/fashion.ts)
//   2. REST API  → implement RestDataProvider (fetch + map)
//   3. Database  → back RestDataProvider with your DB endpoints
//   4. ML model  → swap src/engine/ai.ts scoring for API calls
//
// Missing attributes should surface as nulls/placeholders — the UI
// already renders sensible null states for absent fields.
// ------------------------------------------------------------------

export interface ItemQuery {
  category?: string; // 'All' or a category name
  color?: string;
  style?: string;
  season?: string;
  occasion?: string;
  pattern?: string;
  material?: string;
  search?: string;
}

export interface FashionDataProvider {
  readonly sourceName: string;
  listItems(query?: ItemQuery): Promise<ClothingItem[]>;
  getItem(id: string): Promise<ClothingItem | undefined>;
  facets(): Promise<Record<'categories' | 'colors' | 'styles' | 'seasons' | 'occasions' | 'patterns' | 'materials', string[]>>;
}

export function matches(item: ClothingItem, q: ItemQuery): boolean {
  if (q.category && q.category !== 'All' && item.category !== q.category) return false;
  if (q.color && q.color !== 'All' && item.color !== q.color) return false;
  if (q.style && q.style !== 'All' && item.style !== q.style) return false;
  if (q.season && q.season !== 'All' && !item.season.includes(q.season)) return false;
  if (q.occasion && q.occasion !== 'All' && !item.occasion.includes(q.occasion)) return false;
  if (q.pattern && q.pattern !== 'All' && item.pattern !== q.pattern) return false;
  if (q.material && q.material !== 'All' && item.material !== q.material) return false;
  if (q.search) {
    const hay = `${item.product_name} ${item.category} ${item.subcategory} ${item.color} ${item.style} ${item.pattern} ${item.material} ${item.occasion.join(' ')}`.toLowerCase();
    const terms = q.search.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((t) => hay.includes(t))) return false;
  }
  return true;
}

export class DummyDataProvider implements FashionDataProvider {
  readonly sourceName = 'Dummy dataset (generated)';
  private items = DUMMY_DATASET;

  async listItems(query: ItemQuery = {}): Promise<ClothingItem[]> {
    // simulate async source (API/DB later)
    await new Promise((r) => setTimeout(r, 60));
    return this.items.filter((i) => matches(i, query));
  }

  async getItem(id: string): Promise<ClothingItem | undefined> {
    return this.items.find((i) => i.item_id === id);
  }

  async facets() {
    const uniq = (fn: (i: ClothingItem) => string | string[]) =>
      Array.from(new Set(this.items.flatMap((i) => fn(i)))).sort();
    return {
      categories: uniq((i) => i.category),
      colors: uniq((i) => i.color),
      styles: uniq((i) => i.style),
      seasons: uniq((i) => i.season),
      occasions: uniq((i) => i.occasion),
      patterns: uniq((i) => i.pattern),
      materials: uniq((i) => i.material),
    };
  }
}

// ---- future providers (stubs, intentionally unimplemented) -------
export class RestDataProvider implements FashionDataProvider {
  readonly sourceName = 'REST API';
  private baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  async listItems(): Promise<ClothingItem[]> {
    throw new Error(`Wire this to ${this.baseUrl}/items when the real dataset is ready.`);
  }
  async getItem(): Promise<ClothingItem | undefined> {
    throw new Error('Not implemented yet.');
  }
  async facets(): Promise<never> {
    throw new Error('Not implemented yet.');
  }
}

// The single provider instance used across the app
export const fashionData: FashionDataProvider = new DummyDataProvider();
