import type { Category, ClothingItem } from '@/types/fashion';

// ------------------------------------------------------------------
// Dummy fashion dataset — deterministic (seeded) so every reload of
// the prototype shows the same wardrobe. Replace `DummyDataProvider`
// with a CSV/REST/DB provider later; the UI only talks to the
// provider interface, never to this file directly.
// ------------------------------------------------------------------

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260902);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const pickN = <T,>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;

export interface ColorDef {
  name: string;
  hex: string;
  family: 'neutral' | 'warm' | 'cool' | 'bold';
}

export const COLOR_TABLE: ColorDef[] = [
  { name: 'Ivory', hex: '#F2EDE1', family: 'neutral' },
  { name: 'White', hex: '#FAFAF7', family: 'neutral' },
  { name: 'Black', hex: '#1B1815', family: 'neutral' },
  { name: 'Charcoal', hex: '#3A3630', family: 'neutral' },
  { name: 'Grey', hex: '#8E8A82', family: 'neutral' },
  { name: 'Beige', hex: '#D6C7AE', family: 'neutral' },
  { name: 'Camel', hex: '#B78E5F', family: 'warm' },
  { name: 'Burgundy', hex: '#6E1E3C', family: 'warm' },
  { name: 'Rust', hex: '#A9502F', family: 'warm' },
  { name: 'Blush', hex: '#E4C6BC', family: 'warm' },
  { name: 'Olive', hex: '#6F7256', family: 'cool' },
  { name: 'Sage', hex: '#9AA28C', family: 'cool' },
  { name: 'Navy', hex: '#232F4B', family: 'cool' },
  { name: 'Denim Blue', hex: '#4C6688', family: 'cool' },
  { name: 'Sky', hex: '#A9C1D4', family: 'cool' },
  { name: 'Red', hex: '#B3322C', family: 'bold' },
  { name: 'Mustard', hex: '#C99A2C', family: 'bold' },
  { name: 'Emerald', hex: '#2F5D46', family: 'bold' },
];

export const STYLES = ['Minimal', 'Casual', 'Chic', 'Streetwear', 'Formal', 'Sporty', 'Vintage'] as const;
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export const OCCASIONS = ['College', 'Office', 'Date', 'Party', 'Wedding', 'Travel', 'Casual', 'Formal', 'Interview'] as const;
export const PATTERNS = ['Solid', 'Striped', 'Checked', 'Dotted', 'Textured', 'Ribbed'] as const;
export const FITS = ['Slim', 'Regular', 'Oversized', 'Relaxed', 'Tailored'] as const;

interface CategorySpec {
  category: Category;
  subcategories: [string, string[]][]; // [subcategory, name modifiers]
  materials: string[];
  warm?: boolean;
}

const SPECS: CategorySpec[] = [
  {
    category: 'Tops',
    subcategories: [
      ['Shirt', ['Oxford', 'Poplin', 'Linen', 'Flannel']],
      ['Blouse', ['Silk', 'Satin', 'Ruffled', 'Wrap']],
      ['T-Shirt', ['Crewneck', 'V-Neck', 'Boxy', 'Ribbed']],
      ['Knit Top', ['Ribbed', 'Fine-Gauge', 'Cropped']],
      ['Sweater', ['Cashmere', 'Merino', 'Chunky', 'Turtleneck']],
      ['Tank Top', ['Ribbed', 'Silk-Trim', 'Sport']],
    ],
    materials: ['Cotton', 'Silk', 'Linen', 'Cashmere', 'Merino Wool', 'Viscose'],
  },
  {
    category: 'Bottoms',
    subcategories: [
      ['Trousers', ['Wide-Leg', 'Pleated', 'Tailored', 'Cropped']],
      ['Jeans', ['Straight', 'Slim', 'Wide-Leg', 'Mom']],
      ['Skirt', ['Pleated Midi', 'Satin Slip', 'A-Line', 'Pencil']],
      ['Shorts', ['Tailored', 'Denim', 'Linen']],
    ],
    materials: ['Wool Blend', 'Denim', 'Cotton Twill', 'Linen', 'Satin'],
  },
  {
    category: 'Dresses',
    subcategories: [
      ['Midi Dress', ['Silk Slip', 'Wrap', 'Smocked', 'Knit']],
      ['Maxi Dress', ['Flowy', 'Tiered', 'Halter']],
      ['Mini Dress', ['Bodycon', 'A-Line', 'Blazer']],
      ['Gown', ['Satin', 'Chiffon']],
    ],
    materials: ['Silk', 'Satin', 'Chiffon', 'Knit', 'Crepe'],
  },
  {
    category: 'Shoes',
    subcategories: [
      ['Sneakers', ['Leather', 'Canvas', 'Chunky', 'Retro Runner']],
      ['Heels', ['Stiletto', 'Block-Heel', 'Kitten-Heel', 'Slingback']],
      ['Loafers', ['Leather', 'Suede', 'Chunky']],
      ['Boots', ['Chelsea', 'Knee-High', 'Ankle']],
      ['Sandals', ['Strappy', 'Slide', 'Platform']],
    ],
    materials: ['Leather', 'Suede', 'Canvas', 'Mesh', 'Rubber'],
  },
  {
    category: 'Accessories',
    subcategories: [
      ['Handbag', ['Shoulder', 'Tote', 'Clutch', 'Crossbody']],
      ['Belt', ['Leather', 'Chain', 'Woven']],
      ['Scarf', ['Silk', 'Wool', 'Printed']],
      ['Jewelry', ['Gold Hoops', 'Pearl', 'Layered Chain']],
      ['Sunglasses', ['Cat-Eye', 'Aviator', 'Round']],
    ],
    materials: ['Leather', 'Silk', 'Wool', 'Acetate'],
  },
  {
    category: 'Outerwear',
    subcategories: [
      ['Blazer', ['Oversized', 'Tailored', 'Double-Breasted']],
      ['Coat', ['Wool Overcoat', 'Trench', 'Camel Wrap']],
      ['Jacket', ['Denim', 'Leather', 'Bomber', 'Puffer']],
      ['Cardigan', ['Chunky Knit', 'Longline']],
    ],
    materials: ['Wool', 'Cashmere Blend', 'Denim', 'Leather', 'Nylon'],
  },
];

// Wardrobe skews neutral + minimal to match the demo persona
const COLOR_WEIGHTS: [string, number][] = [
  ['Ivory', 9], ['White', 9], ['Black', 10], ['Charcoal', 7], ['Grey', 6],
  ['Beige', 7], ['Camel', 5], ['Burgundy', 5], ['Rust', 2], ['Blush', 4],
  ['Olive', 3], ['Sage', 3], ['Navy', 5], ['Denim Blue', 4], ['Sky', 2],
  ['Red', 2], ['Mustard', 1], ['Emerald', 2],
];

function weightedColor(): ColorDef {
  const total = COLOR_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [name, w] of COLOR_WEIGHTS) {
    r -= w;
    if (r <= 0) return COLOR_TABLE.find((c) => c.name === name)!;
  }
  return COLOR_TABLE[0];
}

const OCC_BY_CATEGORY: Record<Category, string[]> = {
  Tops: ['College', 'Office', 'Casual', 'Date', 'Travel'],
  Bottoms: ['College', 'Office', 'Casual', 'Travel', 'Date'],
  Dresses: ['Date', 'Party', 'Wedding', 'Formal', 'Casual'],
  Shoes: ['Casual', 'Office', 'Party', 'Formal', 'Travel'],
  Accessories: ['Party', 'Date', 'Wedding', 'Office', 'Casual'],
  Outerwear: ['Office', 'Travel', 'Casual', 'Formal', 'Interview'],
};

const ITEM_COUNTS: Record<Category, number> = {
  Tops: 20,
  Bottoms: 14,
  Dresses: 10,
  Shoes: 14,
  Accessories: 14,
  Outerwear: 12,
};

const STYLE_BY_SUB: [RegExp, string][] = [
  [/Blazer|Overcoat|Trench|Pencil|Tailored|Gown|Oxford/i, 'Formal'],
  [/Sneaker|Hoodie|Chunky|Bomber|Denim|Retro/i, 'Streetwear'],
  [/Silk|Satin|Slip|Cashmere|Pearl|Kitten|Slingback|Clutch/i, 'Chic'],
  [/Sport|Mesh|Runner/i, 'Sporty'],
  [/Flannel|Mom|Vintage|Printed|Round/i, 'Vintage'],
];

function styleFor(sub: string, name: string): string {
  for (const [re, s] of STYLE_BY_SUB) if (re.test(sub) || re.test(name)) return s;
  return pick(['Minimal', 'Minimal', 'Casual', 'Casual', 'Chic'] as unknown as string[]);
}

export function buildDummyDataset(): ClothingItem[] {
  const items: ClothingItem[] = [];
  let seq = 1;

  for (const spec of SPECS) {
    const count = ITEM_COUNTS[spec.category];
    for (let i = 0; i < count; i++) {
      const [sub, mods] = pick(spec.subcategories);
      const mod = pick(mods);
      const color = weightedColor();
      const pattern =
        rnd() < 0.68 ? 'Solid' : pick(PATTERNS.filter((p) => p !== 'Solid') as unknown as string[]);
      const style = styleFor(sub, mod);
      const formality =
        style === 'Formal' ? int(72, 96) : style === 'Chic' ? int(55, 85) : style === 'Streetwear' || style === 'Sporty' ? int(8, 38) : int(25, 68);
      const seasonPool = spec.category === 'Outerwear' ? ['Autumn', 'Winter'] : spec.category === 'Dresses' ? ['Spring', 'Summer'] : [...SEASONS];
      const seasons = pickN(seasonPool as string[], int(2, Math.min(4, seasonPool.length)));
      const occasions = pickN(OCC_BY_CATEGORY[spec.category], int(1, 3));
      const material =
        spec.category === 'Accessories'
          ? /Jewelry/.test(sub) ? 'Gold-Plated'
          : /Scarf/.test(sub) ? pick(['Silk', 'Wool'])
          : /Sunglasses/.test(sub) ? 'Acetate'
          : /Belt/.test(sub) ? pick(['Leather', 'Woven Fabric'])
          : 'Leather'
          : pick(spec.materials);
      const sustainabilityBase =
        material.includes('Wool') || material.includes('Cotton') || material === 'Linen' || material === 'Silk' ? int(68, 94) : int(38, 74);
      const versatile = color.family === 'neutral' ? int(66, 98) : int(34, 82);
      const worn = rnd();

      items.push({
        item_id: `DV-${String(seq++).padStart(4, '0')}`,
        product_name: `${color.name} ${mod} ${sub}`,
        category: spec.category,
        subcategory: sub,
        color: color.name,
        colorHex: color.hex,
        pattern,
        style,
        season: seasons,
        occasion: occasions,
        gender: 'Women',
        material,
        fit: pick(FITS as unknown as string[]),
        formality_score: formality,
        trend_score: int(35, 97),
        comfort_score: int(45, 98),
        versatility_score: versatile,
        sustainability_score: sustainabilityBase,
        wear_count: worn < 0.22 ? 0 : int(1, 34),
        last_worn_days_ago: worn < 0.22 ? null : int(0, 120),
      });
    }
  }
  // guarantee the canonical demo pieces exist
  if (!items.some((i) => i.category === 'Shoes' && i.color === 'White' && /Sneaker/i.test(i.subcategory))) {
    items.push({
      item_id: 'DV-0000',
      product_name: 'White Leather Sneakers',
      category: 'Shoes',
      subcategory: 'Sneakers',
      color: 'White',
      colorHex: '#FAFAF7',
      pattern: 'Solid',
      style: 'Minimal',
      season: ['Spring', 'Summer', 'Autumn'],
      occasion: ['Casual', 'College', 'Travel'],
      gender: 'Women',
      material: 'Leather',
      fit: 'Regular',
      formality_score: 30,
      trend_score: 92,
      comfort_score: 95,
      versatility_score: 96,
      sustainability_score: 64,
      wear_count: 21,
      last_worn_days_ago: 2,
    });
  }
  return items;
}

export const DUMMY_DATASET = buildDummyDataset();

// Named hero items used by the scripted demo flows (analyzer, dashboard)
export const HERO_ITEMS = {
  whiteShirt: { product_name: 'White Poplin Shirt', category: 'Tops', subcategory: 'Shirt', color: 'White', colorHex: '#FAFAF7', pattern: 'Solid', style: 'Minimal' },
  blackJeans: { product_name: 'Black Straight Jeans', category: 'Bottoms', subcategory: 'Jeans', color: 'Black', colorHex: '#1B1815', pattern: 'Solid', style: 'Casual' },
  redSneakers: { product_name: 'Red Chunky Sneakers', category: 'Shoes', subcategory: 'Sneakers', color: 'Red', colorHex: '#B3322C', pattern: 'Solid', style: 'Streetwear' },
  whiteSneakers: { product_name: 'White Leather Sneakers', category: 'Shoes', subcategory: 'Sneakers', color: 'White', colorHex: '#FAFAF7', pattern: 'Solid', style: 'Minimal' },
  greyBlazer: { product_name: 'Grey Tailored Blazer', category: 'Outerwear', subcategory: 'Blazer', color: 'Grey', colorHex: '#8E8A82', pattern: 'Solid', style: 'Formal' },
  burgundyBag: { product_name: 'Burgundy Shoulder Handbag', category: 'Accessories', subcategory: 'Handbag', color: 'Burgundy', colorHex: '#6E1E3C', pattern: 'Solid', style: 'Chic' },
  blackHeels: { product_name: 'Black Slingback Heels', category: 'Shoes', subcategory: 'Heels', color: 'Black', colorHex: '#1B1815', pattern: 'Solid', style: 'Chic' },
  blackTrousers: { product_name: 'Black Wide-Leg Trousers', category: 'Bottoms', subcategory: 'Trousers', color: 'Black', colorHex: '#1B1815', pattern: 'Solid', style: 'Minimal' },
} as const;
