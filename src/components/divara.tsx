import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ClothingItem } from '@/types/fashion';
import { useApp } from '@/state/store';
import { Heart, Sparkles, Wand2 } from 'lucide-react';

// ---------------- helpers ----------------

export const SINGULAR: Record<string, string> = {
  Tops: 'Top', Bottoms: 'Bottom', Dresses: 'Dress', Shoes: 'Shoe', Accessories: 'Accessory', Outerwear: 'Outerwear',
};
export const singularCategory = (c: string) => SINGULAR[c] ?? c;

// ---------------- reveal on scroll ----------------

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in');
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ---------------- circular score ring ----------------

export function ScoreRing({ score, size = 120, label, dark = false }: { score: number; size?: number; label?: string; dark?: boolean }) {
  const stroke = size / 12;
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(score), 120);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? 'rgba(251,248,241,0.16)' : 'rgba(23,19,13,0.1)'} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={dark ? '#C9B083' : '#6E1E3C'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display ${size >= 110 ? 'text-3xl' : 'text-xl'} leading-none`}>{shown}</span>
        {label && <span className={`label-caps mt-1 ${dark ? 'text-cream/60' : 'text-soot/70'}`} style={{ fontSize: 9 }}>{label}</span>}
      </div>
    </div>
  );
}

// ---------------- score bar ----------------

export function ScoreBar({ label, value, dark = false }: { label: string; value: number; dark?: boolean }) {
  const [w, setW] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setW(value);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={ref}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className={`text-[12px] font-medium ${dark ? 'text-cream/75' : 'text-soot'}`}>{label}</span>
        <span className={`font-display text-sm ${dark ? 'text-gold-soft' : 'text-wine'}`}>{value}%</span>
      </div>
      <div className={`h-[3px] w-full ${dark ? 'bg-cream/15' : 'bg-charcoal/10'}`}>
        <div className={`h-full ${dark ? 'bg-gold-soft' : 'bg-wine'}`} style={{ width: `${w}%`, transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

// ---------------- radar (style DNA) ----------------

export function StyleRadar({ axes, size = 260 }: { axes: { label: string; value: number }[]; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 52;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const;
  };
  const ring = (v: number) => axes.map((_, i) => pt(i, v).join(',')).join(' ');
  const shape = axes.map((a, i) => pt(i, a.value / 100).join(',')).join(' ');
  return (
    <svg width={size} height={size} className="mx-auto">
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="rgba(23,19,13,0.1)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(23,19,13,0.1)" strokeWidth="1" />;
      })}
      <polygon points={shape} fill="rgba(110,30,60,0.16)" stroke="#6E1E3C" strokeWidth="1.6" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.value / 100);
        const [lx, ly] = pt(i, 1.19);
        return (
          <g key={a.label}>
            <circle cx={x} cy={y} r="3" fill="#6E1E3C" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-soot" style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {a.label}
            </text>
            <text x={lx} y={ly + 12} textAnchor="middle" dominantBaseline="middle" className="fill-wine" style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>
              {a.value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- color swatch ----------------

export function Swatch({ hex, name, size = 28, selected = false, onClick }: { hex: string; name?: string; size?: number; selected?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={name ?? hex}
      onClick={onClick}
      className={`group relative rounded-full transition-transform duration-300 ${onClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
      style={{
        width: size,
        height: size,
        background: hex,
        boxShadow: `inset 0 0 0 1px rgba(23,19,13,0.12)${selected ? ', 0 0 0 2px #F5F1E8, 0 0 0 4px #6E1E3C' : ''}`,
      }}
    />
  );
}

// ---------------- garment illustration ----------------

export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (pct > 0 ? (255 - c) * pct : c * pct))));
  return `#${((f(r) << 16) | (f(g) << 8) | f(b)).toString(16).padStart(6, '0')}`;
}

export function GarmentArt({ item, className = '' }: { item: ClothingItem; className?: string }) {
  const base = item.colorHex;
  const dark = shade(base, -0.22);
  const light = shade(base, 0.28);
  const pid = `pat-${item.item_id}`;
  const patterned = item.pattern !== 'Solid';

  const patternDef = (
    <defs>
      <pattern id={`${pid}-stripes`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
        <rect width="14" height="14" fill={base} />
        <rect width="6" height="14" fill={light} opacity="0.8" />
      </pattern>
      <pattern id={`${pid}-dots`} width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill={base} />
        <circle cx="4" cy="4" r="2.2" fill={light} />
        <circle cx="12" cy="12" r="2.2" fill={light} />
      </pattern>
      <pattern id={`${pid}-checks`} width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill={base} />
        <rect width="10" height="10" fill={light} opacity="0.65" />
        <rect x="10" y="10" width="10" height="10" fill={light} opacity="0.65" />
      </pattern>
      <pattern id={`${pid}-tex`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={base} />
        <path d="M0 8 L8 0" stroke={dark} strokeWidth="0.8" opacity="0.35" />
      </pattern>
    </defs>
  );

  const fill =
    item.pattern === 'Striped' ? `url(#${pid}-stripes)` :
    item.pattern === 'Dotted' ? `url(#${pid}-dots)` :
    item.pattern === 'Checked' ? `url(#${pid}-checks)` :
    item.pattern === 'Textured' || item.pattern === 'Ribbed' ? `url(#${pid}-tex)` : base;

  const stroke = dark;
  const sw = 2.4;
  let shape: ReactNode = null;
  const sub = item.subcategory;

  switch (item.category) {
    case 'Tops':
      shape = (
        <g>
          <path d="M70 52 L46 66 L34 104 L58 112 L62 96 L62 188 L138 188 L138 96 L142 112 L166 104 L154 66 L130 52 Q100 68 70 52 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M78 54 Q100 66 122 54" fill="none" stroke={stroke} strokeWidth={sw} />
          {item.fit === 'Oversized' && <path d="M62 150 L138 150" stroke={stroke} strokeWidth={1.4} opacity="0.5" />}
        </g>
      );
      break;
    case 'Bottoms':
      shape = /Skirt/i.test(sub) ? (
        <g>
          <path d="M72 56 L128 56 L150 176 Q100 190 50 176 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="72" y="52" width="56" height="10" fill={dark} />
        </g>
      ) : /Shorts/i.test(sub) ? (
        <g>
          <path d="M64 60 L136 60 L142 130 L106 130 L100 92 L94 130 L58 130 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="64" y="56" width="72" height="9" fill={dark} />
        </g>
      ) : (
        <g>
          <path d="M66 52 L134 52 L142 190 L108 190 L100 96 L92 190 L58 190 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="66" y="48" width="68" height="9" fill={dark} />
        </g>
      );
      break;
    case 'Dresses':
      shape = (
        <g>
          <path d="M78 40 Q100 52 122 40 L132 92 L152 184 Q100 202 48 184 L68 92 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M68 92 L132 92" stroke={stroke} strokeWidth={sw} />
          <path d="M78 40 L74 30 M122 40 L126 30" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </g>
      );
      break;
    case 'Shoes':
      shape = /Heel|Stiletto|Slingback/i.test(sub) ? (
        <g>
          <path d="M48 120 Q90 116 118 96 L128 96 L150 128 Q154 136 146 136 L52 136 Q44 136 48 120 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M138 136 L146 168 L154 168 L150 134" fill={dark} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      ) : /Boot/i.test(sub) ? (
        <g>
          <path d="M84 44 L126 44 L126 110 L152 124 Q160 130 154 138 L84 138 Q76 138 76 130 L76 52 Q76 44 84 44 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="76" y="138" width="80" height="10" fill={dark} />
        </g>
      ) : (
        <g>
          <path d="M40 116 Q70 116 92 96 Q98 90 106 96 L128 112 Q150 120 160 128 Q166 134 158 138 L48 138 Q38 138 40 116 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M42 126 L162 126" stroke={stroke} strokeWidth={1.6} opacity="0.6" />
          <rect x="40" y="138" width="122" height="9" rx="4" fill={dark} />
          <path d="M96 100 L112 112 M90 108 L104 118" stroke={light} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
      break;
    case 'Accessories':
      shape = /Handbag|Tote|Clutch|Crossbody/i.test(sub) ? (
        <g>
          <path d="M72 92 Q100 40 128 92" fill="none" stroke={stroke} strokeWidth={sw} />
          <rect x="56" y="92" width="88" height="72" rx="10" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="92" y="118" width="16" height="12" rx="2" fill={dark} />
        </g>
      ) : /Scarf/i.test(sub) ? (
        <g>
          <path d="M60 60 Q100 44 140 60 L132 96 Q100 82 68 96 Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M88 92 L80 170 L104 170 L100 90" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      ) : /Belt/i.test(sub) ? (
        <g>
          <rect x="36" y="96" width="128" height="22" rx="10" fill={fill} stroke={stroke} strokeWidth={sw} />
          <rect x="88" y="90" width="26" height="34" rx="5" fill="none" stroke={dark} strokeWidth={4} />
        </g>
      ) : /Sunglasses/i.test(sub) ? (
        <g>
          <circle cx="76" cy="104" r="24" fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx="128" cy="104" r="24" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M100 104 Q102 96 104 104 M52 100 L36 92 M152 100 L168 92" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="100" cy="112" r="34" fill="none" stroke={stroke} strokeWidth={sw + 1} />
          <circle cx="100" cy="112" r="34" fill={fill} opacity="0.35" />
          <circle cx="100" cy="66" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx="132" cy="80" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx="132" cy="144" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx="100" cy="158" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx="68" cy="144" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
          <circle cx="68" cy="80" r="7" fill={fill} stroke={stroke} strokeWidth={2} />
        </g>
      );
      break;
    case 'Outerwear':
    default:
      shape = (
        <g>
          <path d="M70 44 L44 58 L34 100 L56 108 L60 92 L60 190 L140 190 L140 92 L144 108 L166 100 L156 58 L130 44 Q100 60 70 44 Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M100 62 L100 190" stroke={stroke} strokeWidth={sw} />
          <path d="M78 48 L100 62 L122 48" fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <rect x="72" y="120" width="18" height="24" fill={dark} opacity="0.55" />
          <rect x="110" y="120" width="18" height="24" fill={dark} opacity="0.55" />
        </g>
      );
  }

  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label={item.product_name}>
      {patterned && patternDef}
      {shape}
    </svg>
  );
}

// ---------------- item card ----------------

export function ItemCard({ item, onAnalyze, compact = false }: { item: ClothingItem; onAnalyze?: (i: ClothingItem) => void; compact?: boolean }) {
  const { favorites, toggleFavorite, go } = useApp();
  const fav = favorites.includes(item.item_id);
  return (
    <div className="group relative">
      <div className="card-ed relative overflow-hidden transition-transform duration-500 group-hover:-translate-y-1.5">
        <div className="bg-parchment/60 p-5">
          <GarmentArt item={item} className="mx-auto w-full max-w-[170px] transition-transform duration-500 group-hover:scale-[1.04]" />
        </div>
        {/* hover actions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 bg-charcoal/90 px-4 py-3 opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
          <div className="flex items-center justify-between">
            <button onClick={() => go('generator')} className="label-caps text-cream/90 transition-colors hover:text-gold-soft">Use in outfit →</button>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(item.item_id); }}
                className="text-cream/80 transition-colors hover:text-gold-soft"
                aria-label="Favorite"
              >
                <Heart size={15} fill={fav ? '#C9B083' : 'none'} stroke={fav ? '#C9B083' : 'currentColor'} />
              </button>
              {onAnalyze && (
                <button onClick={(e) => { e.stopPropagation(); onAnalyze(item); }} className="text-cream/80 transition-colors hover:text-gold-soft" aria-label="Analyze">
                  <Wand2 size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
        {item.wear_count === 0 && (
          <span className="absolute left-3 top-3 bg-wine px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-cream">Never worn</span>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <p className={`font-display ${compact ? 'text-[15px]' : 'text-lg'} leading-tight`}>{item.product_name}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-soot/70">
            {item.subcategory} · {item.style}
          </p>
        </div>
        <Swatch hex={item.colorHex} name={item.color} size={16} />
      </div>
      {!compact && (
        <p className="mt-1 text-[11px] text-soot/60">
          {item.material} · {item.season.join('/')}
        </p>
      )}
    </div>
  );
}

// ---------------- chip ----------------

export function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold tracking-wide transition-all duration-300 ${
        active ? 'border-wine bg-wine text-cream' : 'border-charcoal/25 bg-transparent text-soot hover:border-charcoal/60 hover:text-charcoal'
      }`}
    >
      {label}
    </button>
  );
}

// ---------------- section heading ----------------

export function SectionHeading({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <Reveal>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps mb-2 flex items-center gap-2 text-wine">
            <Sparkles size={12} /> {kicker}
          </p>
          <h2 className="font-display text-3xl leading-tight md:text-4xl">{title}</h2>
        </div>
        {right}
      </div>
    </Reveal>
  );
}

// ---------------- marquee ----------------

export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y border-charcoal/15 bg-charcoal py-3">
      <div className="anim-marquee flex w-max items-center gap-8 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-8 text-[12px] font-semibold uppercase tracking-[0.28em] text-cream/80">
            {t} <span className="text-gold-soft">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
