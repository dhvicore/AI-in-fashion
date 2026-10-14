# Divara — AI Fashion Intelligence

Divara is a web app that works as a personal AI stylist. It analyzes outfits, suggests better combinations from your own wardrobe, checks colors, and tracks your style over time.

> **Status:** accounts, the digital wardrobe (with photo uploads), profile, favorites, saved looks and outfit history are stored in a real database through the backend in `server/`. Uploaded and camera photos are analyzed by the installed local Ollama vision model for visible clothing, an estimated styling score, and suggestions. Other styling pages still use the mock engine.

## Features

- **Accounts**: sign up, log in and log out; your session is remembered for 7 days.
- **Digital wardrobe**: every uploaded or camera photo is saved to your account; analysis adds its detected pieces. Review or edit details, or add clothing manually when recognition cannot identify it. The 85 sample clothes appear alongside your own pieces, labeled Sample, with separate filters.
- **Laundry status**: mark personal pieces Clean or In laundry; unavailable pieces are excluded from new outfit suggestions and new calendar plans. Status is saved to your account.
- **Outfit calendar**: plan a look for a date, reuse a saved look, and record it as worn. Plans persist in your account; wearing a planned look increments real-piece wear counts once.
- **Delete and undo**: move personal pieces or source photos to Trash, undo immediately, or restore after logging in again. Deleting a photo moves its linked pieces together.
- **Outfit analyzer**: upload or capture a photo for local clothing recognition, an estimated styling score, and corrections. Completed results are saved to your account’s Analysis History and can be reopened after login.
- **Dashboard**: your real saved clothes, suggested combinations from those clothes, and recent photo analyses.
- **AI Stylist**: pick an occasion, the weather, a style and colors to get a generated outfit, with repetition detection.
- **My Closet**: digital wardrobe with search, categories, color filters, editable details, and wear tracking.
- **Style Me**: outfit generator with scores on 6 compatibility dimensions, plus a color-matching lab.
- **Trends**: editorial trend cards with a personal "is this trend you?" score.
- **Divara AI chat**, **Analytics** (color distribution, sustainability score, wear-what-you-own insights), **Saved Looks** and **Profile** setup.
- Responsive layout with a mobile bottom nav.

## Tech stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3 + shadcn/ui (Radix UI)
- Recharts for charts, lucide-react for icons
- Backend: Node + Express 5 + TypeScript, Prisma with SQLite, JWT session cookies, Multer uploads

## Getting started

Requires Node.js 20.12 or newer.

First time only (installs everything, creates `server/.env` with a secret key, and sets up the database):

```bash
npm run setup
```

Then start the website and the API together:

```bash
npm run dev:all    # website on http://localhost:3000, API on http://localhost:4000
```

Open http://localhost:3000, click **Enter Divara** and create an account.
The website sends `/api` and `/uploads` requests to the API automatically (see `vite.config.ts`).
API details are in [server/README.md](server/README.md).

Other scripts:

```bash
npm run dev          # website only
npm run dev:server   # API only
npm run build        # type-check and production build to dist/
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
  data/dataset.ts      metadata choices and unused prototype sample data
  data/provider.ts     prototype provider interface
  engine/ai.ts         rule-based outfit scoring, color matching, recommendations
  pages/Auth.tsx       login and sign-up screen
  lib/api.ts           fetch helper for the backend + image upload
  state/auth.tsx       logged-in user and session
  state/store.tsx      app state, loaded from and saved to the backend
public/images/         hero, outfit and trend images
server/                Express + Prisma backend (see server/README.md)
```

## Real wardrobe data

`src/state/store.tsx` loads the signed-in account's items and photos through
`/api/items`. Photo upload creates a saved wardrobe photo immediately; valid
local-model analysis imports the detected pieces once per account and photo.
Re-uploading the same file does not duplicate clothing. Unknown material,
pattern, and style remain marked for review rather than being invented.

The closet and outfit suggestions include the signed-in account's pieces plus
the labeled sample collection. Sample items are shared demo data and are never
saved as personal uploaded clothes. The styling engine is
rule-based; the photo analyzer uses the installed local Ollama model through
the authenticated backend.

## Roadmap

- [x] Frontend prototype with all core screens
- [x] Backend: API server, database, user accounts (register, login, sessions)
- [x] Backend: image upload
- [x] Backend: wardrobe, profile, favorites, saved outfits and history APIs
- [x] Frontend: login/sign-up screen, data saved to the backend instead of the browser
- [x] Local photo recognition adds detected clothing to the account wardrobe
- [ ] Deploy (cloud image storage, hosted Postgres)
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

## Personal outfit scoring for the local demo

The backend stores curated clothing guidance, source attribution and versioned
scoring rules. Confirm photo recognition before scoring; profiles, occasion and
weather affect the result. Photo analysis, wardrobe outfits and colour comparison
use the same backend rules. Own clean clothes are the default for suggestions;
samples are optional. See [server/SCORING.md](server/SCORING.md) for the rubric,
sources, consistency guarantees and local checks. No new model download is needed.
