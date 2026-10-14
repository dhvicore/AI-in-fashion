import { useEffect, useRef, useState } from 'react';
import { SendHorizonal, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { assistantRespond, derivePersonality } from '@/engine/ai';
import type { ClothingItem } from '@/types/fashion';
import { GarmentArt, ScoreRing } from '@/components/divara';

import { api, errorMessage } from '@/lib/api';
import type { Assessment } from '@/types/scoring';

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
  const { myItems: wardrobe, profile } = useApp();
  const personality = derivePersonality(wardrobe, profile);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'divara',
      text: wardrobe.length ? `Hi — I’m Divara. I can suggest looks from your ${wardrobe.length} saved pieces. Ask me what to wear for an occasion.` : 'Welcome! Add your clothes in My Closet or Analyze Outfit first, and I can suggest looks from your saved pieces.',
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
    void (async()=>{
      try {
        if (/color|fix/.test(msg.toLowerCase())) {
          const reply=assistantRespond(msg,wardrobe,personality);
          setMessages(m=>[...m,{role:'divara',...reply}]);
        } else {
          const text=msg.toLowerCase();
          const occasion=/wedding/.test(text)?'Wedding':/interview/.test(text)?'Interview':/office|work/.test(text)?'Office':/formal/.test(text)?'Formal':/date|dinner/.test(text)?'Date':/party/.test(text)?'Party':/travel/.test(text)?'Travel':/college/.test(text)?'College':/workout|gym/.test(text)?'Workout':/hike|outdoor/.test(text)?'Outdoor':'Casual';
          const weather=/rain/.test(text)?'Rainy':/cold/.test(text)?'Cold':/hot|heat/.test(text)?'Hot':/cool/.test(text)?'Cool':/warm/.test(text)?'Warm':'Any';
          // Dress the suggestion to the occasion so it reads right even before the
          // user has set a style profile (a wedding should pull a formal look).
          const styleForOccasion:Record<string,string|undefined>={Wedding:'Formal',Formal:'Formal',Interview:'Formal',Party:'Chic',Date:'Chic',Office:'Minimal',Workout:'Sporty'};
          const style=profile?.styles?.length?undefined:styleForOccasion[occasion];
          const context={occasion,weather,...(style?{style}:{})};
          // Draw on the sample collection too, so every occasion has a sensible
          // look to show — unless the user explicitly asks for their own closet.
          const ownOnly=/(only|just).{0,12}(my|own).{0,6}(wardrobe|closet|clothes)|my wardrobe only/.test(text);
          const reply=await api.post<{items:ClothingItem[];note:string}>('/scoring/recommendations',{context,includeSamples:!ownOnly,seed:Math.floor(Math.random()*1000000)});
          let score:number|undefined;
          // automatic:true lets the score use each piece's style affinity and fall
          // back to a sensible default, so a look always gets a number.
          if(reply.items.length){const r=await api.post<{assessment:Assessment}>('/scoring/assessments',{automatic:true,itemIds:reply.items.map(i=>i.item_id),context});score=r.assessment.score??undefined;}
          setMessages(m=>[...m,{role:'divara',text:reply.note,outfitItems:reply.items.length?reply.items:undefined,score}]);
        }
      } catch(e){setMessages(m=>[...m,{role:'divara',text:errorMessage(e)}]);}
      finally{setTyping(false);}
    })();
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
            <div className={`max-w-[85%] ${m.role === 'user' ? 'rounded-2xl rounded-br-sm bg-panel px-5 py-3.5 text-cream' : ''}`}>
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
                    <div className="flex items-center gap-4 bg-panel px-4 py-3 text-cream">
                      <ScoreRing score={m.score} size={52} dark />
                      <p className="text-[12px] text-cream/80">Personal compatibility score — saved with your preferences and outing</p>
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
          <button key={s} onClick={() => send(s)} className="shrink-0 rounded-full border border-charcoal/20 bg-surface px-4 py-1.5 text-[12px] font-medium text-soot transition-colors hover:border-wine hover:text-wine">
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-center gap-3 rounded-full border border-charcoal/20 bg-surface py-2 pl-5 pr-2 focus-within:border-wine"
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
