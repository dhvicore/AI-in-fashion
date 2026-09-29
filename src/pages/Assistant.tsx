import { useEffect, useRef, useState } from 'react';
import { SendHorizonal, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { assistantRespond, derivePersonality } from '@/engine/ai';
import type { ClothingItem } from '@/types/fashion';
import { GarmentArt, ScoreRing } from '@/components/divara';

interface Msg {
  role: 'user' | 'divara';
  text: string;
  outfitItems?: ClothingItem[];
  score?: number;
}

const SUGGESTED = [
  'What should I wear today?',
  'Fix my outfit',
  'Does this color suit my outfit?',
  'What should I wear for a wedding?',
  'Show me something trendy.',
  'Use only my wardrobe.',
];

export default function Assistant() {
  const { wardrobe, profile } = useApp();
  const personality = derivePersonality(wardrobe, profile);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'divara',
      text: `Hi — I’m Divara, your AI stylist. I know your ${wardrobe.length}-piece wardrobe and your ${personality.name.toLowerCase()} style DNA. Ask me what to wear, or challenge me with an occasion.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const send = (text: string) => {
    const msg = text.trim();
    if (!msg || typing) return;
    setMessages((m) => [...m, { role: 'user', text: msg }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      const reply = assistantRespond(msg, wardrobe, personality);
      setMessages((m) => [...m, { role: 'divara', ...reply }]);
      setTyping(false);
    }, 1100);
  };

  return (
    <div className="page-enter mx-auto flex h-[calc(100dvh-64px)] max-w-[860px] flex-col px-5 pb-6 pt-8 md:px-8 lg:h-[calc(100dvh-0px)]">
      <div className="flex items-center justify-between border-b border-charcoal/15 pb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-wine font-display text-lg text-cream">
            D
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ivory bg-sage" />
          </div>
          <div>
            <h1 className="font-display text-2xl leading-none">Divara AI</h1>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-soot/60">Your conversational stylist</p>
          </div>
        </div>
        <Sparkles size={18} className="text-gold" />
      </div>

      <div className="no-scrollbar flex-1 space-y-6 overflow-y-auto py-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${m.role === 'user' ? 'rounded-2xl rounded-br-sm bg-charcoal px-5 py-3.5 text-cream' : ''}`}>
              {m.role === 'divara' && <p className="label-caps mb-1.5 text-wine">Divara</p>}
              <p className={`text-[14px] leading-relaxed ${m.role === 'user' ? '' : 'text-ink'}`}>{m.text}</p>
              {m.outfitItems && (
                <div className="card-ed mt-4 overflow-hidden">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {m.outfitItems.map((it) => (
                      <div key={it.item_id} className="border-b border-r border-charcoal/10 p-3 last:border-r-0">
                        <GarmentArt item={it} className="mx-auto w-full max-w-[80px]" />
                        <p className="mt-1.5 text-center text-[11px] font-semibold leading-tight">{it.product_name}</p>
                      </div>
                    ))}
                  </div>
                  {m.score != null && (
                    <div className="flex items-center gap-4 bg-charcoal px-4 py-3 text-cream">
                      <ScoreRing score={m.score} size={52} dark />
                      <p className="text-[12px] text-cream/80">AI outfit score — built entirely from your wardrobe</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-2 text-soot/60">
            <span className="label-caps text-wine">Divara</span>
            <span className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-pulse rounded-full bg-wine/60" style={{ animationDelay: `${d * 0.2}s` }} />
              ))}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-3">
        {SUGGESTED.map((s) => (
          <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-charcoal/20 bg-cream px-4 py-1.5 text-[12px] font-medium text-soot transition-colors hover:border-wine hover:text-wine">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-3 rounded-full border border-charcoal/20 bg-cream py-2 pl-5 pr-2 focus-within:border-wine"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Divara anything about your style…"
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-soot/40"
        />
        <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-wine text-cream transition-colors hover:bg-wine-deep" aria-label="Send">
          <SendHorizonal size={16} />
        </button>
      </form>
    </div>
  );
}
