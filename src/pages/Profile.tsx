import { useState } from 'react';
import { Check, Loader2, LogOut, Sparkles, Shirt, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '@/state/store';
import { useAuth } from '@/state/auth';
import { errorMessage } from '@/lib/api';
import { COLOR_TABLE, FITS, OCCASIONS, STYLES } from '@/data/dataset';
import { derivePersonality } from '@/engine/ai';
import type { UserProfile } from '@/types/fashion';
import { Chip, Reveal, SectionHeading, StyleRadar, Swatch } from '@/components/divara';

const CLIMATES = ['Hot & humid', 'Warm & dry', 'Temperate', 'Cold', 'Four seasons'];
const GOALS = ['Build a capsule wardrobe', 'Dress more sustainably', 'Experiment more', 'Look sharper at work', 'Simplify mornings', 'Follow trends smarter'];

export default function Profile() {
  const { wardrobe, profile, saveProfile, go } = useApp();
  const { user, logout } = useAuth();
  const [form, setForm] = useState<UserProfile>(
    profile ?? { name: user?.name ?? '', styles: ['Minimal'], colors: ['Ivory'], fits: ['Regular'], occasions: ['Casual'], climate: 'Hot & humid', goals: [] },
  );
  const [savedFlash, setSavedFlash] = useState(false);
  const [saving, setSaving] = useState(false);

  const personality = derivePersonality(wardrobe, profile);

  const toggle = (key: 'styles' | 'colors' | 'fits' | 'occasions' | 'goals', value: string) =>
    setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  const submit = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } catch (err) {
      toast.error('Couldn’t save your profile', { description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await logout();
    go('landing');
  };

  return (
    <div className="profile-editorial page-enter mx-auto max-w-[1200px] px-5 pb-24 pt-10 md:px-10">
      <SectionHeading kicker="Fashion profile" title="Teach Divara your taste" />

      <section className="profile-muse mb-10">
        <div className="relative z-10 max-w-lg">
          <p className="label-caps text-wine">Your style, in motion</p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">A little more <em className="text-wine">you.</em></h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-soot">Choose the colours, moods and moments you love. Build a wardrobe that moves with your life.</p>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Selected style preview">{form.styles.map(style => <span key={style} className="profile-style-tag">{style}</span>)}</div>
          <button type="button" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-wine" onClick={() => go('landing')}>See the animated Divara welcome page <ArrowUpRight size={16} /></button>
        </div>
        <div className="profile-muse-art" aria-hidden="true">
          <div className="profile-muse-orbit" /><span className="profile-muse-star">✦</span>
          <div className="profile-clothing-card"><Shirt size={85} strokeWidth={1} /><span>Your everyday muse</span></div>
          <div className="profile-colour-card">{(form.colors.length ? form.colors : ['Ivory', 'Burgundy', 'Beige']).slice(0, 4).map((name, index) => <span key={name} style={{background:COLOR_TABLE.find(c => c.name === name)?.hex ?? '#6e1e3c',animationDelay:`${index * .25}s`}} />)}<em>Your palette</em></div>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* form */}
        <Reveal className="lg:col-span-7" delay={60}>
          <div className="card-ed space-y-8 p-6 md:p-8">
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

            <button onClick={submit} className="btn-solid disabled:opacity-60" disabled={!form.name.trim() || saving}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : savedFlash ? <><Check size={14} /> Profile saved</> : <><Sparkles size={14} /> Generate my style personality</>}
            </button>

            {user && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-charcoal/15 pt-6">
                <div>
                  <p className="label-caps text-soot/60">Signed in as</p>
                  <p className="mt-1 text-[14px] font-semibold">{user.email}</p>
                  <p className="text-[12px] text-soot/60">Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
                <button onClick={signOut} className="btn-stroke !py-2.5"><LogOut size={13} /> Log out</button>
              </div>
            )}
          </div>
        </Reveal>

        {/* personality result */}
        <Reveal className="lg:col-span-5" delay={140}>
          <div
            className="profile-personality sticky top-8 rounded-md bg-panel p-8 text-cream"
            onPointerMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              const px = (e.clientX - r.left) / r.width;
              const py = (e.clientY - r.top) / r.height;
              el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
              el.style.setProperty('--rx', `${(0.5 - py) * 10}deg`);
              el.style.setProperty('--mx', `${px * 100}%`);
              el.style.setProperty('--my', `${py * 100}%`);
            }}
            onPointerLeave={(e) => {
              const el = e.currentTarget;
              el.style.setProperty('--ry', '0deg');
              el.style.setProperty('--rx', '0deg');
              el.style.setProperty('--my', '-20%');
            }}
          >
            <div className="persona-stars" aria-hidden="true" />
            <div className="persona-glow" aria-hidden="true" />
            <p className="label-caps text-gold-soft">Your style personality</p>
            {profile ? (
              <>
                <h3 className="mt-3 font-display text-4xl text-gold-soft">“{personality.name}”</h3>
                <p className="mt-2 text-[13px] italic text-cream/70">{personality.tagline}</p>
                <div className="persona-radar mt-4 [&_svg_text]:!fill-cream/70 [&_svg_circle]:!fill-gold-soft [&_svg_polygon]:!stroke-gold-soft">
                  <StyleRadar axes={personality.axes} size={280} />
                </div>
                <p className="text-center text-[11px] uppercase tracking-[0.18em] text-cream/40">Derived from your wardrobe + answers</p>
                <button onClick={() => go('stylist')} className="btn-stroke mt-6 w-full justify-center !border-cream !text-cream hover:!bg-surface hover:!text-charcoal">
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
