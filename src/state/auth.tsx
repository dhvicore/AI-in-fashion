import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

type Status = 'loading' | 'guest' | 'authed';

interface AuthState {
  user: User | null;
  status: Status;
  // set when the session check failed because the backend is unreachable
  serverDown: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [serverDown, setServerDown] = useState(false);
  // bumping this re-runs the session check (the "try again" button)
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);

  // Restore the session from the cookie on page load.
  useEffect(() => {
    let cancelled = false;
    const checkGeneration = ++generation.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      if (cancelled || generation.current !== checkGeneration) return;
      return api
        .get<{ user: User }>('/auth/me')
        .then(({ user }) => {
          if (cancelled || generation.current !== checkGeneration) return;
          setUser(user);
          setStatus('authed');
          setServerDown(false);
        })
        .catch((err) => {
          if (cancelled || generation.current !== checkGeneration) return;
          const down = !(err instanceof ApiError && err.status === 401);
          setUser(null);
          setStatus('guest');
          setServerDown(down);
          // the API may still be starting up (npm run dev:all) — check again shortly
          if (down) timer = setTimeout(check, 2000);
        });
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      serverDown,
      login: async (email, password) => {
        ++generation.current;
        const { user } = await api.post<{ user: User }>('/auth/login', { email, password });
        setUser(user);
        setStatus('authed');
        setServerDown(false);
      },
      register: async (name, email, password) => {
        ++generation.current;
        const { user } = await api.post<{ user: User }>('/auth/register', { name, email, password });
        setUser(user);
        setStatus('authed');
        setServerDown(false);
      },
      logout: async () => {
        await api.post('/auth/logout');
        ++generation.current;
        setUser(null);
        setStatus('guest');
      },
      retry: () => {
        setStatus('loading');
        setAttempt((a) => a + 1);
      },
    }),
    [user, status, serverDown],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
