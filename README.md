# Divara — AI Fashion Intelligence

Divara is a web app that works as a personal AI stylist. It analyzes outfits, suggests better combinations from your own wardrobe, checks colors, and tracks your style over time.

> **Status:** frontend prototype. All "AI" output is currently simulated by a mock engine, and data is a generated dummy wardrobe. Backend and real model integration are in progress.

## Features

- **Analyze My Outfit**: upload or take a photo, get per-piece detection, a compatibility score, mismatch warnings and suggested swaps, then **Fix My Outfit** to see the before/after score.
- **Dashboard**: Style DNA radar, today's outfit with a score breakdown and "why this works", weather-based styling.
- **AI Stylist**: pick an occasion, the weather, a style and colors to get a generated outfit, with repetition detection.
- **My Closet**: digital wardrobe with search, category chips and filters (color, style, season, occasion, pattern, material).
- **Style Me**: outfit generator with scores on 6 compatibility dimensions, plus a color-matching lab.
- **Trends**: editorial trend cards with a personal "is this trend you?" score.
- **Divara AI chat**, **Analytics** (color distribution, sustainability score, wear-what-you-own insights), **Saved Looks** and **Profile** setup.
- Responsive layout with a mobile bottom nav.

## Tech stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3 + shadcn/ui (Radix UI)
- Recharts for charts, lucide-react for icons

## Getting started

Requires Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # type-check and production build to dist/
npm run preview    # serve the production build
npm run lint
```

## Project structure

```
src/
  App.tsx              navigation, page routing, mobile bottom nav
  pages/               one file per screen (Landing, Dashboard, Analyze, Stylist, ...)
  components/divara.tsx  shared Divara UI pieces
  components/ui/       shadcn/ui base components
  types/fashion.ts     ClothingItem schema and scoring types
  data/dataset.ts      generated dummy wardrobe
  data/provider.ts     FashionDataProvider data-access layer
  engine/ai.ts         mock AI: outfit scoring, color matching, recommendations
  state/store.tsx      global app state (persisted to localStorage)
public/images/         hero, outfit and trend images
```

## Connecting real data

The UI never reads the dummy dataset directly. Everything goes through the `FashionDataProvider` interface in `src/data/provider.ts`:

```ts
interface FashionDataProvider {
  listItems(query?: ItemQuery): Promise<ClothingItem[]>;
  getItem(id: string): Promise<ClothingItem | undefined>;
  facets(): Promise<Record<string, string[]>>;
}
```

To switch to the real dataset, implement a `RestDataProvider` (backend API) or a `CsvDataProvider` that maps records to the `ClothingItem` schema in `src/types/fashion.ts`, then swap it in for `DummyDataProvider`. To use real models, replace the mock scoring in `src/engine/ai.ts` with API calls.

## Roadmap

- [x] Frontend prototype with all core screens
- [ ] Backend: API server, database, wardrobe CRUD, image upload, user accounts
- [ ] Connect the frontend to the backend through `RestDataProvider`
- [ ] Replace the mock AI engine with real models
- [ ] Better animations and UI polish (page transitions, loading states, dark mode)

## Team

| Member | Responsibilities |
|---|---|
| Dhvani Tandel | Frontend prototype, data model, mock AI engine, integration |
| Srishtee Varule | Backend |
| Krishhma Vira | Animations and UI polish |

## Acknowledgements

The initial frontend was prototyped with the help of Kimi AI (Moonshot AI), then reviewed and extended by the team.
