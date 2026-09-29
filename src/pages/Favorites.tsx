import { Heart } from 'lucide-react';
import { useApp } from '@/state/store';
import { GarmentArt, ItemCard, Reveal, ScoreRing, SectionHeading } from '@/components/divara';

export default function Favorites() {
  const { wardrobe, favorites, savedOutfits, go } = useApp();
  const favItems = wardrobe.filter((i) => favorites.includes(i.item_id));

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading kicker="Favorites" title="My Saved Looks" />

      {savedOutfits.length > 0 && (
        <>
          <p className="label-caps mb-5 text-soot/60">AI outfits you kept</p>
          <div className="mb-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {savedOutfits.map((o, i) => (
              <Reveal key={o.outfit_id} delay={i * 70}>
                <div className="card-ed overflow-hidden">
                  <div className="grid grid-cols-4 gap-px bg-charcoal/10">
                    {o.items.slice(0, 4).map((it) => (
                      <div key={it.item_id} className="bg-parchment/60 p-2">
                        <GarmentArt item={it} className="mx-auto w-full max-w-[70px]" />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <div>
                      <p className="font-display text-lg">{o.name}</p>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-soot/60">{o.occasion ?? 'Any occasion'} · via {o.source}</p>
                    </div>
                    <ScoreRing score={o.score.total} size={56} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </>
      )}

      <p className="label-caps mb-5 text-soot/60">Pieces you love</p>
      {favItems.length > 0 ? (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {favItems.map((item, i) => (
            <Reveal key={item.item_id} delay={Math.min(i, 8) * 50}>
              <div className={i % 3 === 1 ? 'sm:mt-10' : ''}>
                <ItemCard item={item} compact={i % 2 === 0} />
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-charcoal/25 p-20 text-center">
          <Heart size={26} className="mx-auto text-wine/50" />
          <p className="mt-4 font-display text-2xl text-soot/70">Nothing saved yet.</p>
          <p className="mt-2 text-[13px] text-soot/50">Tap the heart on any piece in your closet — or let the AI build you a look worth keeping.</p>
          <button onClick={() => go('wardrobe')} className="btn-stroke mt-6 !py-2.5">Browse my wardrobe →</button>
        </div>
      )}
    </div>
  );
}
