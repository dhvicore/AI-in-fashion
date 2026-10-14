# Divara API server

Express + TypeScript backend for Divara: accounts, sessions, image uploads, and each user's
wardrobe, profile, favorites, saved outfits and outfit history.
Data is stored with Prisma (SQLite locally).

## Setup

The easiest way is from the project root: `npm run setup` once, then `npm run dev:all`.

To set up the server on its own, from the `server/` folder:

```bash
npm install
node scripts/init-env.mjs   # creates .env with a random JWT_SECRET
npm run db:migrate          # creates the local SQLite database
npm run dev                 # http://localhost:4000
```

After someone changes `prisma/schema.prisma` and adds a migration, run `npm run db:migrate` again.

`npm run db:studio` opens a browser view of the database.

## API

All request and response bodies are JSON unless noted. Errors look like `{ "error": "message" }`.
Logging in sets an httpOnly `divara_session` cookie (valid for 7 days); requests from the browser
must be sent with credentials (`fetch(url, { credentials: 'include' })`).

### Auth

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` (password 8+ chars) | `201 { user }` and logs in; `409` if email is taken |
| POST | `/api/auth/login` | `{ email, password }` | `200 { user }`; `401` on wrong email or password |
| POST | `/api/auth/logout` | none | `204`, clears the cookie |
| GET | `/api/auth/me` | none | `200 { user }` if logged in, otherwise `401` |

Register and login allow 20 attempts per 15 minutes per IP.

### Uploads (login required)

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/uploads` | `multipart/form-data` with `image` and optional `source` (`photo` or `camera`) | `201 { upload: { id, url, mimeType, size, createdAt } }` |
| GET | `/api/uploads` | none | `200 { uploads: [...] }`, newest first |
| DELETE | `/api/uploads/:id` | none | `204`; `404` if it isn't yours; `409` while wardrobe pieces use the image |

Images must be JPEG, PNG or WebP and at most 5 MB. The type is checked from the file contents,
not the file name. Saved images are served at the returned `url` (`/uploads/<random-name>`).

### Wardrobe (login required)

Items use the same field names as `ClothingItem` in `src/types/fashion.ts`
(`product_name`, `category`, `color`, `colorHex`, `season`, `occasion`, ..., plus `image_url`).

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/items` | none | `200 { items: [...], photos: [...] }` |
| POST | `/api/items` | item fields; `image_url` must be one of your uploads | `201 { item }` |
| PATCH | `/api/items/:id` | any item fields | `200 { item }` |
| POST | `/api/items/:id/wear` | none | `200 { item }`, adds 1 to `wear_count` |
| DELETE | `/api/items/:id` | none | `204` |

### Profile, favorites, outfits, history (login required)

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/api/profile` | none | `200 { profile }` (`null` until saved) |
| PUT | `/api/profile` | `{ name, styles, colors, fits, occasions, climate, goals }` | `200 { profile }` |
| GET | `/api/favorites` | none | `200 { favorites: [itemId, ...] }` |
| PUT | `/api/favorites/:itemId` | none | `204` |
| DELETE | `/api/favorites/:itemId` | none | `204` |
| GET | `/api/outfits` | none | `200 { outfits: [...] }` |
| POST | `/api/outfits` | `{ name, occasion?, source, score, items }` | `201 { outfit }` |
| DELETE | `/api/outfits/:id` | none | `204` |
| GET | `/api/history` | none | `200 { history: [...] }`, newest first |
| POST | `/api/history` | `{ label, occasion, score, feedback, items, image? }` | `201 { entry }` |

## Project structure

```
prisma/schema.prisma   database models (User, Upload, ClothingItem, Profile, Favorite, SavedOutfit, HistoryEntry)
prisma/migrations/     database migrations — commit these
src/index.ts           starts the server
src/app.ts             middleware and routes
src/env.ts             environment variables
src/auth/              password hashing, sessions, validation schemas
src/middleware/        requireAuth
src/routes/            API routes (auth, uploads, items, profile, favorites, outfits + history)
scripts/init-env.mjs   creates .env for first-time setup
src/lib/               database client, errors, image type detection
```

## Camera, uploads and saved accounts

The photo page uploads through `/api/uploads`, then calls `/api/analyses` to
recognize the clothing and return an estimated styling score and suggestions.
The saved-photo gallery is hidden; existing files are retained. Camera capture uses the browser's camera permission and stops the
stream when the dialog closes. Local development requires both servers:
`npm run dev:all` from the project root. Analysis requires the already installed
Ollama service at `127.0.0.1:11434` and `qwen3-vl:4b` (or `OLLAMA_MODEL`).
Start the existing service with `brew services start ollama`. No downloads are
triggered by the application. A photo may take 1–3 minutes to analyze. Incomplete
model answers produce a retry message, never fabricated clothing or scores.
Only the owner of an uploaded image can request its analysis. Completed results
are cached in SQLite so reopening the same result does not repeat inference.

Accounts use SQLite and password hashes. Session cookies last seven days, and a
persistent secret in `server/.env` keeps them valid across API restarts. Server
configuration and uploads resolve from the server directory regardless of the
terminal's working directory.

To verify signup, returning login, session restoration and photo persistence
across an API restart, run from `server/`:

```bash
node --env-file=.env --import tsx scripts/check-account-uploads.mjs
```

The check creates and cleans up its own test account and temporary photos.

## Saved photo analysis history

`POST /api/analyses` accepts `{ url, source? }` (`source` is `photo` or `camera`).
After the local model returns a valid result, the API saves it with the source
photo in SQLite before confirming success. Reopening the same upload reuses its
saved analysis and does not create a duplicate entry.

`GET /api/analyses?limit=20&cursor=...` returns `{ entries, nextCursor }` with
newest completed analyses first. `GET /api/analyses/:id` returns `{ entry }`.
Each entry contains its photo URL, date, source, detected clothing, score,
summary, corrections, and limitations. All endpoints require login and restrict
results to the signed-in account. Earlier analyses remain available.

The API validates the final model answer. Malformed JSON, truncated answers,
out-of-range scores, empty garment names, and missing suggestions are rejected.
Photos without detected clothing receive no score or clothing corrections.
Styling scores remain subjective estimates; validation does not make the model
infallible at recognizing garments.

Run the validation and real local-model persistence checks from `server/`:

```bash
node --import tsx --test src/vision/analyze.test.ts
node --env-file=.env --import tsx scripts/check-analysis-history.mjs
```

The integration check uses two sample photos, including an entry tagged as a
camera upload. It checks returning login after an API restart, saved result
retrieval, pagination, and account isolation, then removes its temporary data.
It requires the existing local Ollama service and does not download anything.

## Consistent results for identical uploads

Analysis identity is the SHA-256 hash of the uploaded image bytes plus the
account ID. Re-uploading the identical file (including a different filename or
camera/photo source label) reuses the first valid stored analysis: score,
clothing, summary, and corrections all remain unchanged. The database enforces
one canonical result per account and hash. Concurrent requests share the same
inference and save operation. New inference uses temperature 0 and a fixed seed.

Existing duplicate records are reconciled to the oldest valid saved result.
Original raw records remain in the database as aliases; history lists the
canonical entry once, and old result links resolve to it. This is exact file
matching; a new capture, crop, or differently encoded image can be analyzed as a
new input. No results are shared between accounts.

Regression check (no model inference or downloads):

```bash
node --env-file=.env --import tsx scripts/check-analysis-consistency.mjs
```

## Photos in the real digital wardrobe

Every upload registers a `WardrobePhoto` immediately. `GET /api/items` returns
owned pieces and unique source photos, including photos awaiting recognition
or manual details. The local model's valid detected garments are imported as
`ClothingItem` records using the original photo URL. Each piece can be reviewed,
edited, favorited, worn, or removed. Material, pattern, and style start as
`Unknown`; they require user review. Original outfit photos remain attached as source images. The closet renders
cartoon garment illustrations from each piece’s category and color; these are
illustrations rather than extracted garment crops.

Photo identity uses account ID and file hash. Import is transactional and runs
once per photo, including under concurrent requests. Repeat analysis does not
recreate deleted pieces. Existing account uploads and completed analyses are
reconciled when loading the wardrobe. Photos with no detected clothing remain
saved for review without fake garments. A manual piece can use that photo.

Regression checks use temporary accounts and clean up their data:

```bash
node --env-file=.env --import tsx scripts/check-photo-wardrobe.mjs
# From the project root:
server/node_modules/.bin/tsx --tsconfig tsconfig.app.json server/scripts/check-real-wardrobe.ts
```

These checks verify camera source retention, photo persistence, garment import,
deduplication, editing, wear tracking, ownership, and empty/real outfit generation.
They do not download anything or run model inference.

The frontend also includes the 85 original sample garments, marked `Sample`,
with Everything/My clothes/Samples filters. These are kept separate from owned
database records; editing and wear tracking apply to personal pieces only.
Favorites accept known sample IDs as well as the user's own item IDs. An
imported photo with all its pieces removed is hidden from the closet, while
its import marker prevents repeated analysis from recreating those pieces.

## Outfit calendar and recoverable wardrobe deletion

`GET /api/calendar?month=YYYY-MM` returns the signed-in account's plans.
`PUT /api/calendar/YYYY-MM-DD` accepts `{ label, occasion, itemIds }` for up to
12 owned or known sample pieces, saving one plan per date. Item snapshots are
resolved by the server. Invalid dates and other users' items are rejected.
`POST /api/calendar/:id/worn` accepts `{ timezone }`, rejects future dates, and
records wear once even when a request is repeated. It increments only owned,
active pieces; samples never accrue real wear. A worn record cannot be edited.
Calendar records remain snapshots when a wardrobe piece is removed.

`DELETE /api/items/:id` now moves a piece to Trash. `POST /api/items/:id/restore`
restores it. `DELETE /api/wardrobe-photos/:id` moves a source photo and its
active linked pieces to Trash; `POST /api/wardrobe-photos/:id/restore` restores
that group, preserving pieces deleted independently beforehand.
`GET /api/wardrobe-photos/trash` lists recoverable photos and pieces. All routes
require ownership. Files are retained and there is no automatic purge.
These actions remove photos from the closet; saved analysis history is retained.
A deleted photo cannot be re-uploaded or analyzed until it is restored.

Run the calendar/recovery integration check from `server/`:

```bash
node --env-file=.env --import tsx scripts/check-calendar-undo.mjs
```

It uses disposable accounts and checks saved plans, valid dates, future-wear
prevention, wear-count idempotence, photo/piece recovery, independent deletions,
returning login/API restart persistence, and account isolation. No downloads
or model inference are needed.

## Laundry availability

Personal `ClothingItem` records have `laundryStatus` (default `clean`). The API
returns `laundry_status`; `PATCH /api/items/:id` accepts `clean` or `in-laundry`.
It validates ownership and ignores fields omitted from partial edits, preserving
material, pattern, fit, seasons, occasions, and scores. Trash recovery preserves
laundry status. Samples have no account-specific laundry status.

New outfit generation excludes pieces in laundry. New calendar plans reject
these pieces; existing plans remain saved and display their current laundry
availability. Historical worn records are retained. Marking a piece Clean makes
it available again and does not change wear counts.

The calendar integration check verifies status validation, persistence after
returning login/API restart, ownership, Trash recovery, and preservation of
unrelated item details. `scripts/check-real-wardrobe.ts` verifies laundry
exclusion across multiple generator seeds and availability after washing.
