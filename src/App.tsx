import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Heart,
  Home,
  History,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  ScanFace,
  Shirt,
  Sparkles,
  Sun,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/state/theme';
import { AuthProvider, useAuth } from '@/state/auth';
import { AppProvider, useApp, type PageId } from '@/state/store';
import Auth from '@/pages/Auth';
import Landing from '@/pages/Landing';
import Dashboard from '@/pages/Dashboard';
import Analyze from '@/pages/Analyze';
import AnalysisHistory from '@/pages/AnalysisHistory';
import Stylist from '@/pages/Stylist';
import OutfitCalendar from '@/pages/OutfitCalendar';
import Wardrobe from '@/pages/Wardrobe';
import Trends from '@/pages/Trends';
import Assistant from '@/pages/Assistant';
import Analytics from '@/pages/Analytics';
import Favorites from '@/pages/Favorites';
import Profile from '@/pages/Profile';

const NAV: { id: PageId; label: string; icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'calendar', label: 'Outfit Calendar', icon: CalendarDays },
  { id: 'wardrobe', label: 'My Wardrobe', icon: Shirt },
  { id: 'stylist', label: 'AI Stylist', icon: Sparkles },
  { id: 'analyze', label: 'Analyze Outfit', icon: ScanFace },
  { id: 'analysis-history', label: 'Analysis History', icon: History },
  { id: 'trends', label: 'Trends', icon: TrendingUp },
  { id: 'assistant', label: 'Style Assistant', icon: MessageCircle },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const MOBILE_NAV: PageId[] = ['dashboard', 'wardrobe', 'analyze', 'assistant', 'trends'];

function Shell() {
  const { page, go, entered, profile } = useApp();
  const { user, status, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);

  // first visit: landing; after "enter", land on the dashboard
  useEffect(() => {
    if ((entered || user) && page === 'landing' && window.location.pathname !== '/welcome') go('dashboard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, user]);

  if (page === 'landing' || (!entered && !user)) {
    return <Landing />;
  }

  // the app itself needs an account
  if (status === 'loading') {
    return (
      <div role="status" className="flex min-h-screen items-center justify-center gap-3 bg-ivory text-wine">
        <Loader2 size={22} className="animate-spin" aria-hidden="true" /><span>Restoring your account…</span>
      </div>
    );
  }
  if (!user) {
    return <Auth />;
  }

  const firstName = (profile?.name || user.name).split(' ')[0];
  const signOut = async () => {
    setMoreOpen(false);
    try {
      await logout();
      go('landing');
    } catch (err) {
      toast.error('Couldn’t log out', { description: errorMessage(err) });
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'analyze': return <Analyze />;
      case 'analysis-history': return <AnalysisHistory key={user?.id} />;
      case 'stylist': return <Stylist />;
      case 'calendar': return <OutfitCalendar key={user.id} />;
      case 'wardrobe': return <Wardrobe />;
      case 'trends': return <Trends />;
      case 'assistant': return <Assistant />;
      case 'analytics': return <Analytics />;
      case 'favorites': return <Favorites />;
      case 'profile': return <Profile />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="divara-shell min-h-screen bg-ivory">
      <a className="skip-content" href="#main-content">Skip to content</a>
      {/* ===== desktop sidebar ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-charcoal/15 bg-ivory lg:flex">
        <button aria-label="Open Divara landing page" onClick={() => go('landing')} className="flex items-baseline gap-2 px-7 pb-6 pt-7 text-left">
          <span className="font-display text-[26px] font-bold tracking-tight">Divara</span>
          <span className="text-gold">✦</span>
        </button>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-4">
          {NAV.map((n) => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                aria-current={active ? 'page' : undefined}
                onClick={() => go(n.id)}
                className={`group relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-[13px] font-semibold transition-all duration-200 ${
                  active ? 'bg-panel text-cream' : 'text-soot hover:bg-charcoal/5 hover:text-charcoal'
                }`}
              >
                <span className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 bg-wine transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
                <n.icon size={16} strokeWidth={active ? 2.2 : 1.7} className={active ? 'text-gold-soft' : ''} />
                {n.label}
                {active && <span className="ml-auto text-gold-soft">✦</span>}
              </button>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-charcoal/15 px-4 py-4">
          <button
            onClick={() => go('favorites')}
            className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-semibold transition-colors ${page === 'favorites' ? 'bg-panel text-cream' : 'text-soot hover:text-charcoal'}`}
          >
            <Heart size={16} strokeWidth={1.7} /> Saved Looks
          </button>
          <button
            onClick={() => go('profile')}
            className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-semibold transition-colors ${page === 'profile' ? 'bg-panel text-cream' : 'text-soot hover:text-charcoal'}`}
          >
            <UserRound size={16} strokeWidth={1.7} /> {firstName}
          </button>
          <ThemeToggle className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-semibold text-soot transition-colors hover:text-charcoal" withLabel />
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-[13px] font-semibold text-soot/70 transition-colors hover:text-wine">
            <LogOut size={16} strokeWidth={1.7} /> Log out
          </button>
        </div>
      </aside>

      {/* ===== mobile top bar ===== */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-charcoal/15 bg-ivory/90 px-5 py-3.5 backdrop-blur-md lg:hidden">
        <button aria-label="Open Divara landing page" onClick={() => go('landing')} className="font-display text-xl font-bold">Divara <span className="text-gold">✦</span></button>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="flex h-8 w-8 items-center justify-center rounded-full text-soot transition-colors hover:text-charcoal" />
          <button aria-label="Open your profile" onClick={() => go('profile')} className="flex h-8 w-8 items-center justify-center rounded-full bg-wine text-cream">
            <UserRound size={15} />
          </button>
        </div>
      </header>

      {/* ===== content ===== */}
      <main id="main-content" tabIndex={-1} className="divara-content lg:pl-[248px]">
        {renderPage()}
      </main>

      {/* ===== mobile bottom nav ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal/15 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-md items-end justify-between px-4 py-2">
          {MOBILE_NAV.slice(0, 2).map((id) => <MobileTab key={id} id={id} />)}
          {/* center analyze button */}
          <button
            onClick={() => go('analyze')}
            className={`relative -top-4 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_24px_-8px_rgba(110,30,60,0.6)] transition-transform active:scale-95 ${page === 'analyze' ? 'bg-wine-deep' : 'bg-wine'} text-cream`}
            aria-label="Analyze outfit"
            aria-current={page === 'analyze' ? 'page' : undefined}
          >
            <ScanFace size={22} />
          </button>
          {MOBILE_NAV.slice(3).map((id) => <MobileTab key={id} id={id} />)}
          <button ref={moreButton} onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 px-2 py-1 text-soot" aria-label="More" aria-haspopup="dialog" aria-expanded={moreOpen}>
            <Menu size={20} />
            <span className="text-[9px] font-bold uppercase tracking-wider">More</span>
          </button>
        </div>
      </nav>

      {/* mobile "more" sheet */}
      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto bg-ivory" onCloseAutoFocus={event => { event.preventDefault(); moreButton.current?.focus(); }}>
          <DialogTitle className="font-display text-xl">More of Divara</DialogTitle>
          <DialogDescription>Choose a section or manage your account.</DialogDescription>
            <div className="grid grid-cols-2 gap-2">
              {[...NAV.filter((n) => !MOBILE_NAV.includes(n.id)), { id: 'favorites' as PageId, label: 'Saved Looks', icon: Heart }, { id: 'profile' as PageId, label: 'Profile', icon: UserRound }].map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setMoreOpen(false); go(n.id); }}
                  className={`flex items-center gap-3 rounded-md border p-4 text-left text-[13px] font-semibold ${page === n.id ? 'border-wine bg-blush/30 text-wine' : 'border-charcoal/15 bg-surface'}`}
                >
                  <n.icon size={16} /> {n.label}
                </button>
              ))}
              <button onClick={signOut} className="flex items-center gap-3 rounded-md border border-charcoal/15 bg-surface p-4 text-left text-[13px] font-semibold text-soot">
                <LogOut size={16} /> Log out
              </button>
            </div>
        </DialogContent>
      </Dialog>

      {/* spacer for mobile nav */}
      <div className="h-16 lg:hidden" />
    </div>
  );
}

function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;
  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon size={16} strokeWidth={1.7} />
      {withLabel && (isDark ? 'Light mode' : 'Dark mode')}
    </button>
  );
}

function MobileTab({ id }: { id: PageId }) {
  const { page, go } = useApp();
  const item = NAV.find((n) => n.id === id)!;
  const active = page === id;
  const short: Partial<Record<PageId, string>> = { dashboard: 'Home', wardrobe: 'Closet', assistant: 'Divara', trends: 'Trends' };
  return (
    <button aria-current={active ? 'page' : undefined} onClick={() => go(id)} className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${active ? 'text-wine' : 'text-soot'}`}>
      <item.icon size={20} strokeWidth={active ? 2.2 : 1.7} />
      <span className="text-[9px] font-bold uppercase tracking-wider">{short[id] ?? item.label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Shell />
        <Toaster position="top-center" richColors />
      </AppProvider>
    </AuthProvider>
  );
}
