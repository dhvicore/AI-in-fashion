import type {
  AnalysisResult,
  ClothingItem,
  DetectedPiece,
  Mismatch,
  OutfitScore,
  StylePersonality,
  Trend,
  UserProfile,
  WeatherInfo,
} from '@/types/fashion';
import { COLOR_TABLE, HERO_ITEMS } from '@/data/dataset';

// ------------------------------------------------------------------
// Mock AI engine. Every function is written against the ClothingItem
// schema so a real ML/scoring API can replace these bodies later
// without UI changes.
// ------------------------------------------------------------------

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

const NEUTRALS = new Set(COLOR_TABLE.filter((c) => c.family === 'neutral').map((c) => c.name));
const WARM = new Set(COLOR_TABLE.filter((c) => c.family === 'warm').map((c) => c.name));
const COOL = new Set(COLOR_TABLE.filter((c) => c.family === 'cool').map((c) => c.name));
const BOLD = new Set(COLOR_TABLE.filter((c) => c.family === 'bold').map((c) => c.name));

// ---------- color harmony ----------

export function colorHarmony(colors: string[]): number {
  const uniq = Array.from(new Set(colors));
  if (uniq.length <= 1) return 92;
  const neutrals = uniq.filter((c) => NEUTRALS.has(c)).length;
  const bolds = uniq.filter((c) => BOLD.has(c)).length;
  const warmCoolMix = uniq.some((c) => WARM.has(c)) && uniq.some((c) => COOL.has(c));

  let score = 70 + neutrals * 6 - bolds * 14;
  if (bolds > 1) score -= 12; // competing statements
  if (warmCoolMix) score -= 8;
  if (uniq.length > 4) score -= (uniq.length - 4) * 7;
  if (uniq.includes('Burgundy') && (uniq.includes('Ivory') || uniq.includes('White') || uniq.includes('Black'))) score += 8;
  if (uniq.includes('Camel') && uniq.includes('Ivory')) score += 6;
  return clamp(score, 30, 98);
}

export function harmonyExplanation(colors: string[]): string {
  const uniq = Array.from(new Set(colors));
  const neutrals = uniq.filter((c) => NEUTRALS.has(c));
  const bolds = uniq.filter((c) => BOLD.has(c));
  if (bolds.length > 0 && neutrals.length > 0) {
    return `${neutrals.slice(0, 2).join(' and ')} create a neutral base while ${bolds[0].toLowerCase()} adds ${
      bolds.length > 1 ? 'competing contrasts — keep one statement only' : 'a controlled, deliberate contrast'
    }.`;
  }
  if (bolds.length > 0) return `${bolds.join(' and ')} fight for attention — anchor them with a neutral.`;
  if (neutrals.length === uniq.length) return `A tonal, neutral palette — quiet, expensive-looking, and endlessly remixable.`;
  return `Soft tonal contrast; nothing competes, everything converses.`;
}

export function complementaryColors(color: string): string[] {
  const def = COLOR_TABLE.find((c) => c.name === color);
  if (!def) return [];
  if (def.family === 'neutral') return ['Burgundy', 'Camel', 'Olive'].filter((c) => c !== color);
  if (def.family === 'warm') return ['Ivory', 'Charcoal', 'Navy'];
  if (def.family === 'cool') return ['Camel', 'Ivory', 'Rust'];
  return ['Black', 'White', 'Beige'];
}

// ---------- outfit scoring ----------

export function scoreOutfit(items: ClothingItem[], occasion?: string, weather?: string): OutfitScore {
  const colors = items.map((i) => i.color);
  const styles = items.map((i) => i.style);
  const dominantStyle = mode(styles);

  const colorH = colorHarmony(colors);
  const styleC = clamp(100 - new Set(styles).size * 9 + (dominantStyle === 'Minimal' ? 8 : 0), 40, 98);
  const occasionM = occasion
    ? clamp(avg(items.map((i) => (i.occasion.includes(occasion) ? 95 : i.formality_score > 60 && (occasion === 'Office' || occasion === 'Formal' || occasion === 'Interview') ? 78 : 55))) )
    : 85;
  const weatherM = weather
    ? clamp(avg(items.map((i) => weatherFit(i, weather))))
    : 86;
  const trend = clamp(avg(items.map((i) => i.trend_score)));
  const versatility = clamp(avg(items.map((i) => i.versatility_score)));

  const total = clamp(colorH * 0.26 + styleC * 0.22 + occasionM * 0.18 + weatherM * 0.12 + trend * 0.12 + versatility * 0.1);

  const reasons: string[] = [];
  if (colorH >= 88) reasons.push(`Color story works — ${harmonyExplanation(colors)}`);
  else reasons.push(`Colors need attention — ${harmonyExplanation(colors)}`);
  if (styleC >= 85) reasons.push(`Coherent ${dominantStyle.toLowerCase()} language across all pieces.`);
  else reasons.push(`Mixed style signals (${Array.from(new Set(styles)).join(', ').toLowerCase()}) dilute the look.`);
  if (occasion) reasons.push(occasionM >= 85 ? `Reads perfectly for ${occasion.toLowerCase()}.` : `Only partially suited to ${occasion.toLowerCase()}.`);
  if (weather) reasons.push(weatherM >= 85 ? `Breathable and right for ${weather.toLowerCase()} weather.` : `Some pieces fight the ${weather.toLowerCase()} weather.`);
  reasons.push(trend >= 80 ? 'Pieces sit comfortably inside current trends.' : 'A couple of pieces are past their trend peak.');

  return { total, breakdown: { colorHarmony: colorH, styleCompatibility: styleC, occasionMatch: occasionM, weatherMatch: weatherM, trend, versatility }, reasons };
}

function weatherFit(item: ClothingItem, weather: string): number {
  const heavy = /wool|cashmere|puffer|chunky/i.test(item.material) || item.category === 'Outerwear';
  const light = /linen|cotton|silk|mesh|viscose/i.test(item.material);
  switch (weather) {
    case 'Hot': return heavy ? 45 : light ? 96 : 78;
    case 'Warm': return heavy ? 66 : 92;
    case 'Cool': return 88;
    case 'Cold': return heavy ? 96 : 58;
    case 'Rainy': return /suede|silk/i.test(item.material) ? 48 : 88;
    default: return 85;
  }
}

function mode(arr: string[]): string {
  const counts = new Map<string, number>();
  arr.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Minimal';
}

// ---------- outfit generation ----------

export interface OutfitBrief {
  occasion?: string;
  weather?: string;
  style?: string;
  colors?: string[];
  seed?: number;
}

export function generateOutfit(wardrobe: ClothingItem[], brief: OutfitBrief): ClothingItem[] {
  const rng = mulberry(brief.seed ?? Date.now());
  const byCat = (cat: string) => wardrobe.filter((i) => i.category === cat);

  const rank = (i: ClothingItem): number => {
    let s = 0;
    if (brief.occasion && i.occasion.includes(brief.occasion)) s += 40;
    if (brief.style && i.style === brief.style) s += 28;
    if (brief.colors?.length && brief.colors.includes(i.color)) s += 30;
    if (brief.weather) s += weatherFit(i, brief.weather) * 0.2;
    s += i.trend_score * 0.12 + i.versatility_score * 0.1;
    s += rng() * 14;
    return s;
  };

  const choose = (cat: string, fallbackToAny = true): ClothingItem | undefined => {
    const pool = byCat(cat);
    if (!pool.length) return fallbackToAny ? undefined : undefined;
    return [...pool].sort((a, b) => rank(b) - rank(a))[0];
  };

  const useDress = byCat('Dresses').length > 0 && rng() < 0.22 && (!brief.style || brief.style === 'Chic' || brief.style === 'Formal' || brief.occasion === 'Wedding' || brief.occasion === 'Party' || brief.occasion === 'Date');

  const items: ClothingItem[] = [];
  if (useDress) {
    const d = choose('Dresses');
    if (d) items.push(d);
  } else {
    const top = choose('Tops');
    const bottom = choose('Bottoms');
    if (top) items.push(top);
    if (bottom) items.push(bottom);
  }
  const shoes = choose('Shoes');
  const acc = choose('Accessories');
  const needsOuter = brief.weather === 'Cold' || brief.weather === 'Cool' || brief.weather === 'Rainy' || rng() < 0.3;
  const outer = needsOuter ? choose('Outerwear') : undefined;
  if (shoes) items.push(shoes);
  if (acc) items.push(acc);
  if (outer) items.push(outer);
  return items;
}

function mulberry(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- outfit analyzer (scripted demo) ----------

function heroItem(key: keyof typeof HERO_ITEMS, idx: number): ClothingItem {
  const h = HERO_ITEMS[key];
  return {
    item_id: `DV-HERO-${idx}`,
    product_name: h.product_name,
    category: h.category as ClothingItem['category'],
    subcategory: h.subcategory,
    color: h.color,
    colorHex: h.colorHex,
    pattern: h.pattern,
    style: h.style,
    season: ['Spring', 'Summer', 'Autumn'],
    occasion: ['Casual', 'College'],
    gender: 'Women',
    material: 'Cotton',
    fit: 'Regular',
    formality_score: 40,
    trend_score: 72,
    comfort_score: 90,
    versatility_score: 80,
    sustainability_score: 70,
    wear_count: 8,
    last_worn_days_ago: 3,
  };
}

export function runOutfitAnalysis(wardrobe: ClothingItem[]): AnalysisResult {
  const shirt = heroItem('whiteShirt', 1);
  const jeans = heroItem('blackJeans', 2);
  const sneakers = heroItem('redSneakers', 3);
  const blazer = heroItem('greyBlazer', 4);

  const pieces: DetectedPiece[] = [
    { item: shirt, match: 94 },
    { item: jeans, match: 88 },
    { item: sneakers, match: 61 },
    { item: blazer, match: 57 },
  ];

  const score: OutfitScore = {
    total: 72,
    breakdown: { colorHarmony: 68, styleCompatibility: 74, occasionMatch: 63, weatherMatch: 88, trend: 71, versatility: 82 },
    reasons: [
      'White + black give a strong neutral base.',
      'Red sneakers introduce a dominant, competing contrast.',
      'The formal grey blazer clashes with the otherwise casual register.',
    ],
  };

  // choose replacements from the real wardrobe where possible
  const whiteSneakers =
    wardrobe.find((i) => i.category === 'Shoes' && i.color === 'White' && /sneaker/i.test(i.subcategory)) ??
    wardrobe.find((i) => i.category === 'Shoes' && i.color === 'White') ??
    heroItem('whiteSneakers', 5);
  const denimJacket =
    wardrobe.find((i) => i.category === 'Outerwear' && i.style !== 'Formal') ?? heroItem('burgundyBag', 6);

  const mismatches: Mismatch[] = [
    {
      id: 'mm-shoes',
      kind: 'color',
      title: 'Shoes are competing with the outfit',
      explanation: 'Your red sneakers introduce a strong color contrast against the otherwise neutral outfit.',
      currentItemId: sneakers.item_id,
      recommendedItemId: whiteSneakers.item_id,
      improvement: 17,
    },
    {
      id: 'mm-blazer',
      kind: 'occasion',
      title: 'Occasion mismatch',
      explanation: 'Your outfit is casual, but the selected blazer makes the combination slightly formal.',
      currentItemId: blazer.item_id,
      recommendedItemId: denimJacket.item_id,
      improvement: 5,
    },
  ];

  const fixedItems = [shirt, jeans, whiteSneakers, denimJacket];
  const fixedScore: OutfitScore = {
    total: 94,
    breakdown: { colorHarmony: 96, styleCompatibility: 92, occasionMatch: 91, weatherMatch: 90, trend: 94, versatility: 89 },
    reasons: [
      'White sneakers continue the monochrome base instead of breaking it.',
      'Swapping the formal blazer restores one coherent casual register.',
      'Every piece now reads minimal, current, and intentional.',
    ],
  };

  return {
    imageLabel: 'Uploaded outfit',
    pieces,
    score,
    mismatches,
    fixedOutfitItems: fixedItems,
    fixedScore,
    changedSlots: ['Shoes', 'Outerwear'],
  };
}

// ---------- style personality ----------

export function derivePersonality(wardrobe: ClothingItem[], profile?: UserProfile | null): StylePersonality {
  const styleCount = new Map<string, number>();
  wardrobe.forEach((i) => styleCount.set(i.style, (styleCount.get(i.style) ?? 0) + 1));
  const total = wardrobe.length || 1;
  const share = (s: string) => Math.round(((styleCount.get(s) ?? 0) / total) * 100);

  const boost = (s: string, b: number) => (profile?.styles.includes(s) ? b : 0);
  const axes = [
    { label: 'Minimalist', value: clamp(share('Minimal') * 2.2 + 34 + boost('Minimal', 12)) },
    { label: 'Elegant', value: clamp(share('Chic') * 2.4 + 30 + boost('Chic', 14)) },
    { label: 'Casual', value: clamp(share('Casual') * 2.2 + 22 + boost('Casual', 10)) },
    { label: 'Streetwear', value: clamp(share('Streetwear') * 2.6 + 12 + boost('Streetwear', 14)) },
    { label: 'Experimental', value: clamp(share('Vintage') * 2 + share('Sporty') * 2 + 26) },
  ];

  const top = [...axes].sort((a, b) => b.value - a.value);
  const name = top[0].label === 'Minimalist' && top[1].label === 'Elegant' ? 'Modern Chic' : `${top[1].label} ${top[0].label}`;
  return {
    name,
    tagline: 'Understated silhouettes, deliberate color, quiet confidence.',
    axes,
  };
}

// ---------- wardrobe analytics ----------

export function wardrobeAnalytics(wardrobe: ClothingItem[]) {
  const totalItems = wardrobe.length;
  const colorCount = new Map<string, number>();
  const catCount = new Map<string, number>();
  wardrobe.forEach((i) => {
    colorCount.set(i.color, (colorCount.get(i.color) ?? 0) + 1);
    catCount.set(i.category, (catCount.get(i.category) ?? 0) + 1);
  });
  const mostUsedColor = [...colorCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostUsedCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostWorn = [...wardrobe].sort((a, b) => b.wear_count - a.wear_count)[0];
  const unused = wardrobe.filter((i) => i.wear_count === 0 || (i.last_worn_days_ago ?? 999) > 60);
  const neutralShare = Math.round((wardrobe.filter((i) => NEUTRALS.has(i.color)).length / (totalItems || 1)) * 100);
  const avgSustain = clamp(avg(wardrobe.map((i) => i.sustainability_score)) * 0.7 + avg(wardrobe.map((i) => i.versatility_score)) * 0.3);

  // how much of the wardrobe pairs with the most versatile item
  const anchor = [...wardrobe].sort((a, b) => b.versatility_score - a.versatility_score)[0];
  const anchorCoverage = anchor ? clamp(anchor.versatility_score * 0.82) : 0;

  const combos = Math.min(9999, Math.round(Math.pow(Math.max(totalItems, 2), 1.9)));

  return {
    totalItems,
    mostUsedColor,
    mostUsedCategory,
    mostWorn,
    unused,
    neutralShare,
    sustainability: avgSustain,
    anchor,
    anchorCoverage,
    combos,
    colorCount,
    catCount,
    insights: [
      `${neutralShare}% of your wardrobe is neutral-colored.`,
      `You haven't worn ${unused.length} items in the last 60 days.`,
      anchor ? `Your ${anchor.product_name.toLowerCase()} works with ${anchorCoverage}% of your wardrobe.` : '',
      'Your wardrobe is strongest for casual occasions.',
    ].filter(Boolean),
  };
}

// ---------- trends ----------

export const TRENDS: Trend[] = [
  {
    id: 'quiet-luxury',
    name: 'Quiet Luxury',
    description: 'Logo-free, fabric-first dressing. Cashmere, camel coats, perfect tailoring — wealth you have to look twice to see.',
    trendScore: 89,
    growthPct: 12,
    popularity: 89,
    season: 'All year',
    categories: ['Outerwear', 'Tops', 'Accessories'],
    palette: ['#B78E5F', '#F2EDE1', '#3A3630', '#A98A56'],
    yourCompatibility: 94,
    compatibilityReason: 'Your wardrobe already contains neutral colors and minimal silhouettes.',
    image: '/images/trend-quiet.png',
  },
  {
    id: 'oversized',
    name: 'Oversized Silhouettes',
    description: 'Blazers two sizes up, wide-leg everything. Volume is the new fitted.',
    trendScore: 91,
    growthPct: 18,
    popularity: 86,
    season: 'Autumn / Winter',
    categories: ['Outerwear', 'Bottoms'],
    palette: ['#3A3630', '#8E8A82', '#F2EDE1'],
    yourCompatibility: 72,
    compatibilityReason: 'You own relaxed fits, but few truly oversized statement pieces yet.',
    image: '/images/trend-oversized.png',
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'One color, head to toe. Texture does the talking when color steps back.',
    trendScore: 84,
    growthPct: 9,
    popularity: 78,
    season: 'All year',
    categories: ['Tops', 'Bottoms', 'Dresses'],
    palette: ['#1B1815', '#FAFAF7', '#8E8A82'],
    yourCompatibility: 88,
    compatibilityReason: '42%+ of your wardrobe is neutral — single-color looks are effortless for you.',
  },
  {
    id: 'earth-tones',
    name: 'Earth Tones',
    description: 'Terracotta, olive, sand, clay. The palette of slow fashion and softer moods.',
    trendScore: 82,
    growthPct: 14,
    popularity: 81,
    season: 'Autumn',
    categories: ['Tops', 'Outerwear', 'Accessories'],
    palette: ['#A9502F', '#6F7256', '#D6C7AE'],
    yourCompatibility: 76,
    compatibilityReason: 'Camel and olive accents already appear in your closet.',
    image: '/images/trend-earth.png',
  },
  {
    id: 'streetwear',
    name: 'Streetwear',
    description: 'Chunky sneakers, boxy tees, utility details. Comfort with an attitude.',
    trendScore: 79,
    growthPct: 6,
    popularity: 84,
    season: 'All year',
    categories: ['Shoes', 'Tops', 'Outerwear'],
    palette: ['#1B1815', '#B3322C', '#4C6688'],
    yourCompatibility: 41,
    compatibilityReason: 'Your style DNA leans minimal and elegant — streetwear is a stretch.',
  },
  {
    id: 'minimalism',
    name: 'Minimalism',
    description: 'Fewer pieces, better ones. Clean lines, honest materials, nothing extra.',
    trendScore: 87,
    growthPct: 11,
    popularity: 83,
    season: 'All year',
    categories: ['Tops', 'Bottoms', 'Dresses', 'Shoes'],
    palette: ['#F2EDE1', '#1B1815', '#D6C7AE'],
    yourCompatibility: 96,
    compatibilityReason: 'This is literally your Style DNA — minimal silhouettes dominate your closet.',
  },
];

// ---------- weather (mock, API-ready shape) ----------

export const CURRENT_WEATHER: WeatherInfo = {
  city: 'Mumbai',
  tempC: 29,
  condition: 'Humid',
  humidity: 74,
  advice: 'Keep it breathable today.',
  recommended: ['Light cotton shirt', 'Wide-leg trousers', 'Breathable sneakers'],
  avoid: ['Heavy jackets', 'Thick sweaters'],
};

// ---------- repetition detection ----------

export function combinationKey(items: ClothingItem[]): string {
  return items.map((i) => `${i.category}:${i.color}:${i.subcategory}`).sort().join('|');
}

// ---------- assistant ----------

export interface AssistantReply {
  text: string;
  outfitItems?: ClothingItem[];
  score?: number;
}

export function assistantRespond(message: string, wardrobe: ClothingItem[], personality: StylePersonality): AssistantReply {
  const m = message.toLowerCase();
  const brief: OutfitBrief = { seed: Date.now() % 100000 };

  if (/wedding/.test(m)) Object.assign(brief, { occasion: 'Wedding', style: 'Chic' });
  else if (/office|interview|work|formal/.test(m)) Object.assign(brief, { occasion: 'Office', style: 'Formal' });
  else if (/date|dinner/.test(m)) Object.assign(brief, { occasion: 'Date', style: 'Chic' });
  else if (/college|casual|today/.test(m)) Object.assign(brief, { occasion: 'Casual', style: 'Minimal' });
  else if (/party/.test(m)) Object.assign(brief, { occasion: 'Party', style: 'Chic' });
  else if (/travel/.test(m)) Object.assign(brief, { occasion: 'Travel', style: 'Casual' });
  if (/trend/.test(m)) brief.style = undefined;

  if (/color/.test(m)) {
    return {
      text: `Color-wise, your safest power move is a neutral base with one controlled accent — think ivory and charcoal with a burgundy bag. Your palette already supports that: most of your wardrobe is neutral, so almost any single bold piece will land.`,
    };
  }
  if (/fix/.test(m)) {
    return {
      text: `Upload a photo on the Analyze page and I'll scan each piece, flag what's fighting the look, and rebuild the outfit from your wardrobe. Last time we took a 72 to a 94 just by swapping shoes.`,
    };
  }

  const items = generateOutfit(wardrobe, brief);
  const score = scoreOutfit(items, brief.occasion, brief.weather);
  const occasionText = brief.occasion ? brief.occasion.toLowerCase() : 'today';
  return {
    text: /wardrobe/.test(m)
      ? `Using only your wardrobe, here's a ${personality.name.toLowerCase()} look for ${occasionText}. Everything below is already hanging in your closet.`
      : `Based on your style profile, I'd recommend a sophisticated but effortless look for ${occasionText}. Here's what I pulled together:`,
    outfitItems: items,
    score: score.total,
  };
}
