import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Sparkles, TriangleAlert } from 'lucide-react';
import { useAuth } from '@/state/auth';
import { useApp } from '@/state/store';
import { errorMessage } from '@/lib/api';

type Mode = 'login' | 'register';

export default function Auth() {
  const { login, register, serverDown, retry } = useAuth();
  const { go } = useApp();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isRegister && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const input =
    'w-full rounded-sm border border-charcoal/20 bg-surface px-3.5 py-3 text-[14px] outline-none transition-colors placeholder:text-soot/35 focus:border-wine';

  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-[1fr_1.05fr]">
      {/* editorial panel */}
      <aside className="relative hidden overflow-hidden bg-panel text-cream lg:block">
        <img src="/images/hero-main.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">Divara</span>
            <span className="text-gold-soft">✦</span>
          </p>
          <div className="max-w-md">
            <p className="label-caps flex items-center gap-2 text-gold-soft">
              <Sparkles size={12} /> Your AI. Your Style. Your Diva.
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05]">
              A closet that <em className="text-gold-soft">remembers</em> you.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-cream/70">
              Your wardrobe, saved looks and style history are saved to your account.
            </p>
          </div>
        </div>
      </aside>

      {/* form */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <button onClick={() => go('landing')} className="flex w-fit items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-soot transition-colors hover:text-wine">
          <ArrowLeft size={13} /> Back to home
        </button>

        <div className="page-enter m-auto w-full max-w-[400px] py-10">
          <p className="font-display text-2xl font-bold lg:hidden">
            Divara <span className="text-gold">✦</span>
          </p>
          <h2 className="mt-4 font-display text-4xl leading-tight lg:mt-0">{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-2 text-[14px] text-soot">
            {isRegister ? 'Start a wardrobe Divara can learn from.' : 'Log in to pick up where you left off.'}
          </p>

          {/* tabs */}
          <div className="mt-8 grid grid-cols-2 border-b border-charcoal/15" role="tablist">
            {(['register', 'login'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                disabled={busy}
                onClick={() => switchMode(m)}
                className={`relative pb-3 text-[12px] font-bold uppercase tracking-[0.18em] transition-colors ${mode === m ? 'text-wine' : 'text-soot/60 hover:text-charcoal'}`}
              >
                {m === 'register' ? 'Sign up' : 'Log in'}
                <span className={`absolute inset-x-0 -bottom-px h-[2px] bg-wine transition-opacity ${mode === m ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>

          {serverDown && (
            <div className="mt-6 flex gap-3 rounded-sm border border-gold/50 bg-parchment p-4 text-[13px] text-soot">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-gold" />
              <div>
                <p className="font-semibold text-charcoal">The Divara server isn’t running.</p>
                <p className="mt-1">
                  Start it with <code className="rounded bg-surface px-1">npm run dev:all</code>, then{' '}
                  <button onClick={retry} className="font-semibold text-wine underline underline-offset-2">try again</button>.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isRegister && (
              <label className="block">
                <span className="label-caps mb-1.5 block text-soot/60">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="What should Divara call you?" className={input} />
              </label>
            )}
            <label className="block">
              <span className="label-caps mb-1.5 block text-soot/60">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" className={input} />
            </label>
            <label className="block">
              <span className="label-caps mb-1.5 block text-soot/60">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                  className={`${input} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soot/50 hover:text-charcoal"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="text-[13px] font-medium text-wine">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-solid w-full justify-center disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              {isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-soot">
            {isRegister ? 'Already have an account? ' : 'New to Divara? '}
            <button disabled={busy} onClick={() => switchMode(isRegister ? 'login' : 'register')} className="font-semibold text-wine underline-offset-2 hover:underline">
              {isRegister ? 'Log in' : 'Create one'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
