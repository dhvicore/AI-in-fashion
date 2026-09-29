import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ClothingItem, HistoryEntry, Outfit, UserProfile } from '@/types/fashion';
import { DUMMY_DATASET } from '@/data/dataset';

export type PageId =
  | 'landing'
  | 'dashboard'
  | 'wardrobe'
  | 'stylist'
  | 'analyze'
  | 'generator'
  | 'trends'
  | 'assistant'
  | 'analytics'
  | 'favorites'
  | 'profile';

interface AppState {
  page: PageId;
  go: (p: PageId) => void;
  entered: boolean;
  enter: () => void;

  wardrobe: ClothingItem[];
  addItem: (i: ClothingItem) => void;
  profile: UserProfile | null;
  saveProfile: (p: UserProfile) => void;

  favorites: string[]; // item ids
  savedOutfits: Outfit[];
  toggleFavorite: (id: string) => void;
  saveOutfit: (o: Outfit) => void;

  history: HistoryEntry[];
  addHistory: (h: HistoryEntry) => void;

  analyzerImage: string | null;
  setAnalyzerImage: (url: string | null) => void;
}

const Ctx = createContext<AppState | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — prototype ignores */
  }
}

const SEED_HISTORY: HistoryEntry[] = [
  { id: 'h1', date: offsetDate(6), label: 'Office Look', occasion: 'Office', score: 91, feedback: 'Tailored and tonal — the charcoal blazer carried this.', items: pickFew(3), image: '/images/outfit-today.png' },
  { id: 'h2', date: offsetDate(5), label: 'Casual Look', occasion: 'Casual', score: 84, feedback: 'Good base; sneakers pulled focus slightly.', items: pickFew(3) },
  { id: 'h3', date: offsetDate(4), label: 'Dinner Look', occasion: 'Date', score: 96, feedback: 'Silk + burgundy — effortlessly elegant.', items: pickFew(3), image: '/images/outfit-after.png' },
  { id: 'h4', date: offsetDate(2), label: 'College Look', occasion: 'College', score: 88, feedback: 'Comfortable, current, zero effort showing.', items: pickFew(3) },
];

function offsetDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}
function pickFew(n: number): ClothingItem[] {
  return DUMMY_DATASET.filter((_, i) => i % 9 === 0).slice(0, n);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<PageId>('landing');
  const [entered, setEntered] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(() => load('divara:profile', null));
  const [favorites, setFavorites] = useState<string[]>(() => load('divara:favorites', []));
  const [savedOutfits, setSavedOutfits] = useState<Outfit[]>(() => load('divara:savedOutfits', []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => load('divara:history', SEED_HISTORY));
  const [addedItems, setAddedItems] = useState<ClothingItem[]>(() => load('divara:addedItems', []));
  const [analyzerImage, setAnalyzerImage] = useState<string | null>(null);

  useEffect(() => persist('divara:profile', profile), [profile]);
  useEffect(() => persist('divara:favorites', favorites), [favorites]);
  useEffect(() => persist('divara:savedOutfits', savedOutfits), [savedOutfits]);
  useEffect(() => persist('divara:history', history), [history]);
  useEffect(() => persist('divara:addedItems', addedItems), [addedItems]);

  const value = useMemo<AppState>(
    () => ({
      page,
      go: (p) => {
        setPage(p);
        window.scrollTo({ top: 0 });
      },
      entered,
      enter: () => setEntered(true),
      wardrobe: [...addedItems, ...DUMMY_DATASET],
      addItem: (i) => setAddedItems((s) => [i, ...s]),
      profile,
      saveProfile: setProfile,
      favorites,
      savedOutfits,
      toggleFavorite: (id) => setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
      saveOutfit: (o) => setSavedOutfits((s) => [o, ...s].slice(0, 24)),
      history,
      addHistory: (h) => setHistory((s) => [h, ...s].slice(0, 30)),
      analyzerImage,
      setAnalyzerImage,
    }),
    [page, entered, profile, favorites, savedOutfits, history, analyzerImage, addedItems],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
