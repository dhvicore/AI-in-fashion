# Local demo: personal outfit scoring

`GuidanceSource` stores source titles, URLs, brief paraphrases and the research date.
`ClothingGuide` stores 32 garment types, 11 occasions, 5 weather contexts,
7 style labels, the rubric and the occasion wear-frequency table (57 versioned
rows). Startup seeds missing rows
using installed dependencies. No runtime internet access or new model is required.

Sources reviewed on 12 October 2026:
- Emily Post attire guide: https://emilypost.com/advice/attire-guide-dress-codes-from-casual-to-white-tie
- Emily Post business casual: https://emilypost.com/advice/business-casual-attire-guide
- REI layering: https://www.rei.com/learn/expert-advice/layering-basics.html
- REI hot-weather clothing: https://www.rei.com/learn/expert-advice/hot-weather-hiking.html

The numbers, style affinities, taxonomy, campus/travel/activity examples and
traditional garment options are Divara editorial choices, not scores endorsed
by these sources. Invitation, institutional dress code, local traditions,
personal comfort and confirmed fabric properties override the examples.

## Flow

1. Camera/gallery upload saves the photo in the account.
2. The installed local vision model identifies visible names and colours. It
   never supplies the current styling score. Recognition can be incorrect.
3. The user confirms each type, main colour and style. Confirmed changes refine
   linked wardrobe pieces, preserving materials, wear counts and deleted pieces.
4. The backend reads the user's profile styles (or an explicit style for this
   outing), occasion, weather and versioned database rules.
5. `OutfitAssessment` saves the confirmed snapshot, context, breakdown,
   corrections, source attribution and any real clean-clothing swap suggestions.

The current weights are style 40%, colour 30%, occasion 20%, weather 10%.
When weather is unspecified, occasion takes 30% and weather is omitted.

Style: average 100 for a main piece in a selected style, otherwise 40.
Colour: average across distinct pairs. Any pair containing a neutral scores 95;
other pairs scale continuously with the hue gap (matching and complementary hues
score highest, clashing mid-gaps lowest), so colour scores spread out instead of
snapping to a few buckets. A single colour scores 95. More than four colours
receive a five-point deduction per extra colour. Recognised shade names are
normalised to broad colour families (e.g. maroon/burgundy, denim blue/blue).
Occasion: average of each piece's wear-frequency for the occasion (0–96) from the
`frequency` table — how typically that garment is worn for that occasion, derived
from the garment-vs-occasion formality gap plus the occasion's recommended and
avoided lists (underdressing penalised more than overdressing). This replaces the
old flat 95/70/30 buckets so, for example, a gown and a blazer at a wedding score
high while sneakers and jeans score low, and everyday outfits no longer all land
on the same few totals.
Weather: average the stored garment-type suitability numbers; cold outfits
without an insulating/outer layer are capped at 45 and rainy outfits without a
rain shell at 55. These checks do not verify fabric performance or weather safety.
A missing type, supported colour, piece style or preferred style, or a partial
outfit (no dress and no top/bottom combination), produces no total score.

Fingerprint = account + sorted confirmed garment/type/colour/style multiset +
selected preferred styles + occasion + weather + rule version. It deliberately
excludes photo bytes, camera/gallery source, item order and item IDs. Different
photos get the same score only when confirmed clothing and context are the same.
This is not automatic visual identity recognition. Preferences or context may
change the result legitimately; old history stays unchanged.

`POST /api/scoring/recommendations` defaults to own clean clothes. Samples require
`includeSamples: true`. It ranks possible combinations with this same rubric.
`POST /api/scoring/assessments` accepts owned item IDs/known samples or an owned
photo analysis with confirmed garments. It calculates scores server-side and
ignores caller-supplied numeric scores. It cannot access another user's items.
`GET /api/scoring/knowledge` exposes the stored guide; assessment list/detail
endpoints are account-scoped. Saved swap suggestions describe availability at
creation time; users should check current laundry status when reopening history.

Earlier `OutfitAnalysis` records remain immutable recognition archives. Their
old model opinions are not displayed as current scores or used by this rubric.
For a rule change, create a new version instead of modifying historical snapshots.

## Checks (installed dependencies only)

From `server/`:
- `npm run typecheck`
- `node --env-file=.env --import tsx scripts/check-context-scoring.mjs`
- `node --env-file=.env --import tsx scripts/check-analysis-history.mjs` (installed Ollama required)

The context checks use disposable local accounts and fixture recognition records:
cross-photo and wardrobe identity, weather/occasion/profile changes, ownership,
clean clothes, review persistence, invalid/partial inputs, restart/returning login.
The history check uses actual local vision on the bundled sample photos.

## Automatic photo scoring

The Analyze page sends `automatic: true` with a saved analysis ID. The backend uses cached recognition, canonical colours and stored garment-type style affinities. Saved profile styles apply; without a profile, the default is Casual. No garment detail confirmation is required and inferred style affinities do not overwrite a wardrobe piece’s actual style. Photo mode assesses visible main garments; unsupported types/colours or no main garment remain unscored rather than inventing data. Automatic results use a separate `-auto-v4` rule version and fingerprint, persist in assessment history, and reuse the same result for the same detected clothes and context. Manual wardrobe assessments keep their existing confirmation rules.


Recommendation selection filters discouraged occasion types before ranking. The College preset excludes skirts, dresses, shorts, tanks and gowns for this project. Cold looks need a warm layer and covered lower-body pieces; rainy looks require a rain shell; hot looks exclude heavy layers. Explicit palette choices require at least one matching colour. Stored garment affinities fill unknown styles without changing wardrobe records; confirmed styles take precedence. Suitable looks are ranked by score, colour coverage and owned-piece preference, then sampled with exponential weights. Saved account assessments and request exclusions prevent repeat looks until the suitable inventory is exhausted. Insufficient inventory produces an explanation rather than fabricated clothing.


Variety update: main-clothing signatures (top + bottom, or a one-piece outfit) from saved assessments are excluded before choosing a new look; merely swapping shoes does not count as a fresh main outfit. Recently used pieces receive a ranking penalty. Once all suitable main combinations are used, the endpoint returns no outfit with `exhausted: true`; it never silently restarts the cycle. The UI disables regeneration and offers explicit sample exploration or adding clothes. Samples remain opt-in and labelled. Scores are unchanged by diversity ranking.
