import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { useApp } from '@/state/store';
import { COLOR_TABLE, FITS, OCCASIONS, STYLES } from '@/data/dataset';
import { derivePersonality } from '@/engine/ai';
import type { UserProfile } from '@/types/fashion';
import { Chip, Reveal, SectionHeading, StyleRadar, Swatch } from '@/components/divara';

const CLIMATES = ['Hot & humid', 'Warm & dry', 'Temperate', 'Cold', 'Four seasons'];
const GOALS = ['Build a capsule wardrobe', 'Dress more sustainably', 'Experiment more', 'Look sharper at work', 'Simplify mornings', 'Follow trends smarter'];

export default function Profile() {
  const { wardrobe, profile, saveProfile, go } = useApp();
  const [form, setForm] = useState<UserProfile>(
    profile ?? { name: '', styles: ['Minimal'], colors: ['Ivory'], fits: ['Regular'], occasions: ['Casual'], climate: 'Hot & humid', goals: [] },
  );
  const [savedFlash, setSavedFlash] = useState(false);

  const personality = derivePersonality(wardrobe, profile);

  const toggle = (key: 'styles' | 'colors' | 'fits' | 'occasions' | 'goals', value: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  const submit = () => {
    saveProfile(form);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <div className="page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading kicker="Fashion profile" title="Teach Divara your taste" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* form */}
        <Reveal className="lg:col-span-7" delay={60}>
          <div className="space-y-8">
            <label className="block max-w-sm">
              <span className="label-caps mb-2 block text-soot/60">Your name</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="What should Divara call you?"
                className="w-full border-b border-charcoal/25 bg-transparent py-2 font-display text-2xl outline-none transition-colors placeholder:text-soot/35 focus:border-wine"
              />
            </label>

            <div>
              <p className="label-caps mb-3 text-soot/60">Preferred styles</p>
              <div className="flex flex-wrap gap-2">{STYLES.map((s) => <Chip key={s} label={s} active={form.styles.includes(s)} onClick={() => toggle('styles', s)} />)}</div>
            </div>

            <div>
              <p className="label-caps mb-3 text-soot/60">Favorite colors</p>
              <div className="flex flex-wrap gap-2.5">
                {COLOR_TABLE.map((c) => (
                  <Swatch key={c.name} hex={c.hex} name={c.name} size={32} selected={form.colors.includes(c.name)} onClick={() => toggle('colors', c.name)} />
                ))}
              </div>
            </div>

            <div>
              <p className="label-caps mb-3 text-soot/60">Preferred fits</p>
              <div className="flex flex-wrap gap-2">{FITS.map((s) => <Chip key={s} label={s} active={form.fits.includes(s)} onClick={() => toggle('fits', s)} />)}</div>
            </div>

            <div>
              <p className="label-caps mb-3 text-soot/60">Common occasions</p>
              <div className="flex flex-wrap gap-2">{OCCASIONS.map((s) => <Chip key={s} label={s} active={form.occasions.includes(s)} onClick={() => toggle('occasions', s)} />)}</div>
            </div>

            <div>
              <p className="label-caps mb-3 text-soot/60">Climate</p>
              <div className="flex flex-wrap gap-2">
                {CLIMATES.map((s) => <Chip key={s} label={s} active={form.climate === s} onClick={() => setForm((f) => ({ ...f, climate: s }))} />)}
              </div>
            </div>

            <div>
              <p className="label-caps mb-3 text-soot/60">Fashion goals</p>
              <div className="flex flex-wrap gap-2">{GOALS.map((s) => <Chip key={s} label={s} active={form.goals.includes(s)} onClick={() => toggle('goals', s)} />)}</div>
            </div>

            <button onClick={submit} className="btn-solid" disabled={!form.name.trim()}>
              {savedFlash ? <><Check size={14} /> Profile saved</> : <><Sparkles size={14} /> Generate my style personality</>}
            </button>
          </div>
        </Reveal>

        {/* personality result */}
        <Reveal className="lg:col-span-5" delay={140}>
          <div className="sticky top-8 rounded-md bg-charcoal p-8 text-cream">
            <p className="label-caps text-gold-soft">Your style personality</p>
            {profile ? (
              <>
                <h3 className="mt-3 font-display text-4xl text-gold-soft">“{personality.name}”</h3>
                <p className="mt-2 text-[13px] italic text-cream/70">{personality.tagline}</p>
                <div className="mt-4 [&_svg_text]:!fill-cream/70 [&_svg_circle]:!fill-gold-soft [&_svg_polygon]:!stroke-gold-soft">
                  <StyleRadar axes={personality.axes} size={280} />
                </div>
                <p className="text-center text-[11px] uppercase tracking-[0.18em] text-cream/40">Derived from your wardrobe + answers</p>
                <button onClick={() => go('stylist')} className="btn-stroke mt-6 w-full justify-center !border-cream !text-cream hover:!bg-cream hover:!text-charcoal">
                  Put it to work — style me →
                </button>
              </>
            ) : (
              <div className="mt-6 rounded-sm border border-dashed border-cream/25 p-10 text-center">
                <Sparkles size={22} className="mx-auto text-gold-soft" />
                <p className="mt-4 font-display text-xl text-cream/70">Answer a few questions and Divara will sketch your Style DNA here.</p>
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
