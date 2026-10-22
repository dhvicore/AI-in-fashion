import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { ClothingItem, HistoryEntry, Outfit, UserProfile, WardrobePhoto } from '@/types/fashion';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/state/auth';
import type { PhotoSource } from '@/types/photoAnalysis';

export type PageId =
  | 'landing'
  | 'dashboard'
  | 'calendar'
  | 'wardrobe'
  | 'stylist'
  | 'analyze'
  | 'analysis-history'
  | 'trends'
  | 'assistant'
  | 'analytics'
  | 'favorites'
  | 'profile';

// What the "Add to wardrobe" form sends; the server fills ids, wear stats and defaults.
export type NewItem = Omit<ClothingItem, 'item_id' | 'wear_count' | 'last_worn_days_ago' | 'owned'>;

interface AppState {
  page: PageId;
  go: (p: PageId) => void;
  entered: boolean;
  enter: () => void;

  // true while the signed-in user's data is loading from the server
  loadingData: boolean;

  wardrobe: ClothingItem[]; // saved account pieces plus clearly labeled samples
  myItems: ClothingItem[];
  wardrobePhotos: WardrobePhoto[];
  refreshWardrobe: () => Promise<void>;
  updateItem: (id: string, item: NewItem) => Promise<void>;
  addItem: (i: NewItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setLaundryStatus: (id: string, status: 'clean' | 'in-laundry') => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  profile: UserProfile | null;
  saveProfile: (p: UserProfile) => Promise<void>;

  favorites: string[]; // item ids
  savedOutfits: Outfit[];
  toggleFavorite: (id: string) => void;
  saveOutfit: (o: Outfit) => void;

  history: HistoryEntry[];
  addHistory: (h: HistoryEntry) => void;

  analyzerImage: string | null;
  analyzerSource: PhotoSource;
  setAnalyzerImage: (url: string | null, source?: PhotoSource) => void;
}

const Ctx = createContext<AppState | null>(null);

// Everything saved in the user's account, tagged with whose it is.
interface UserData {
  userId: string;
  myItems: ClothingItem[];
  sampleItems: ClothingItem[];
  wardrobePhotos: WardrobePhoto[];
  profile: UserProfile | null;
  favorites: string[];
  savedOutfits: Outfit[];
  history: HistoryEntry[];
}

const emptyData = (userId: string): UserData => ({ userId, myItems: [], sampleItems: [], wardrobePhotos: [], profile: null, favorites: [], savedOutfits: [], history: [] });
const NO_DATA = emptyData('');

function reportError(action: string) {
  return (err: unknown) => toast.error(`Couldn’t ${action}`, { description: errorMessage(err) });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [page, setPage] = useState<PageId>('landing');
  const [entered, setEntered] = useState(false);
  const [data, setData] = useState<UserData | null>(null);
  const [analyzerPhoto, setAnalyzerPhoto] = useState<{ userId: string; url: string | null; source: PhotoSource } | null>(null);

  // Only show data that belongs to the signed-in user; after logout or an
  // account switch the old user's data is ignored until the new data loads.
  const userId = user?.id;
  const analyzerImage = analyzerPhoto?.userId === userId ? analyzerPhoto?.url ?? null : null;
  const analyzerSource = analyzerPhoto?.userId === userId ? analyzerPhoto?.source ?? 'photo' : 'photo';
  const setAnalyzerImage = useCallback((url: string | null, source: PhotoSource = 'photo') => {
    setAnalyzerPhoto({ userId: userId ?? '', url, source });
  }, [userId]);
  const current = data && data.userId === userId ? data : null;
  const loadingData = Boolean(userId) && !current;
  const { myItems, sampleItems = [], wardrobePhotos = [], profile, favorites, savedOutfits, history } = current ?? NO_DATA;

  // Apply a change to the current user's data (no-op if they logged out meanwhile).
  const update = useCallback(
    (fn: (d: UserData) => Partial<UserData>) => setData((d) => (d && d.userId === userId ? { ...d, ...fn(d) } : d)),
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([
      api.get<{ items: ClothingItem[]; photos: WardrobePhoto[] }>('/items'),
      api.get<{ profile: UserProfile | null }>('/profile'),
      api.get<{ favorites: string[] }>('/favorites'),
      api.get<{ outfits: Outfit[] }>('/outfits'),
      api.get<{ history: HistoryEntry[] }>('/history'),
      api.get<{ items: ClothingItem[] }>('/items/samples'),
    ])
      .then(([items, prof, favs, outfits, hist, samples]) => {
        if (cancelled) return;
        setData({
          userId,
          myItems: items.items,
          sampleItems: samples.items,
          wardrobePhotos: items.photos,
          profile: prof.profile,
          favorites: favs.favorites,
          savedOutfits: outfits.outfits,
          history: hist.history,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setData(emptyData(userId));
        reportError('load your wardrobe')(err);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const refreshWardrobe = useCallback(async () => {
    const result = await api.get<{ items: ClothingItem[]; photos: WardrobePhoto[] }>('/items');
    update(() => ({ myItems: result.items, wardrobePhotos: result.photos }));
  }, [update]);

  const toggleFavorite = useCallback(
    (id: string) => {
      const isFav = favorites.includes(id);
      // update the UI right away, undo if the server says no
      const without = (f: string[]) => f.filter((x) => x !== id);
      update((d) => ({ favorites: isFav ? without(d.favorites) : [id, ...d.favorites] }));
      const req = isFav ? api.delete(`/favorites/${encodeURIComponent(id)}`) : api.put(`/favorites/${encodeURIComponent(id)}`);
      req.catch((err) => {
        update((d) => ({ favorites: isFav ? [id, ...d.favorites] : without(d.favorites) }));
        reportError('update favorites')(err);
      });
    },
    [favorites, update],
  );

  const value = useMemo<AppState>(
    () => ({
      page,
      go: (p) => {
        if (p === 'landing') window.history.replaceState(null, '', '/welcome');
        else if (window.location.pathname === '/welcome') window.history.replaceState(null, '', '/');
        setPage(p);
        window.scrollTo({ top: 0 });
      },
      entered,
      enter: () => setEntered(true),
      loadingData,
      wardrobe: [...myItems, ...sampleItems],
      wardrobePhotos,
      refreshWardrobe,
      updateItem: async (id, input) => {
        const { item } = await api.patch<{ item: ClothingItem }>(`/items/${id}`, input);
        update((d) => ({ myItems: d.myItems.map((i) => i.item_id === id ? item : i) }));
      },
      myItems,
      addItem: async (input) => {
        const { item } = await api.post<{ item: ClothingItem }>('/items', input);
        update((d) => ({ myItems: [item, ...d.myItems] }));
      },
      deleteItem: async (id) => {
        await api.delete(`/items/${id}`);
        update((d) => ({ myItems: d.myItems.filter((i) => i.item_id !== id) }));
      },
      setLaundryStatus: async (id, status) => {
        const {item} = await api.patch<{item: ClothingItem}>(`/items/${id}`, {laundry_status: status});
        update(d => ({myItems:d.myItems.map(i => i.item_id === id ? item : i)}));
      },
      restoreItem: async (id) => {
        await api.post(`/items/${id}/restore`);
        await refreshWardrobe();
      },
      profile,
      saveProfile: async (p) => {
        const { profile: saved } = await api.put<{ profile: UserProfile }>('/profile', p);
        update(() => ({ profile: saved }));
      },
      favorites,
      savedOutfits,
      toggleFavorite,
      saveOutfit: (o) => {
        // show it immediately under a temporary id, then swap in the saved copy
        const tempId = o.outfit_id;
        update((d) => ({ savedOutfits: [o, ...d.savedOutfits] }));
        api
          .post<{ outfit: Outfit }>('/outfits', { name: o.name, occasion: o.occasion, source: o.source, score: o.score, items: o.items })
          .then(({ outfit }) => update((d) => ({ savedOutfits: d.savedOutfits.map((x) => (x.outfit_id === tempId ? outfit : x)) })))
          .catch((err) => {
            update((d) => ({ savedOutfits: d.savedOutfits.filter((x) => x.outfit_id !== tempId) }));
            reportError('save this outfit')(err);
          });
      },
      history,
      addHistory: (h) => {
        const tempId = h.id;
        update((d) => ({ history: [h, ...d.history] }));
        api
          .post<{ entry: HistoryEntry }>('/history', { label: h.label, occasion: h.occasion, score: h.score, feedback: h.feedback, items: h.items, image: h.image })
          .then(({ entry }) => update((d) => ({ history: d.history.map((x) => (x.id === tempId ? entry : x)) })))
          .catch((err) => {
            update((d) => ({ history: d.history.filter((x) => x.id !== tempId) }));
            reportError('save to your history')(err);
          });
      },
      analyzerImage,
      analyzerSource,
      setAnalyzerImage,
    }),
    [page, entered, loadingData, myItems, sampleItems, wardrobePhotos, refreshWardrobe, profile, favorites, savedOutfits, toggleFavorite, history, analyzerImage, analyzerSource, setAnalyzerImage, update],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
