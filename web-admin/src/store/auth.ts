import { create } from 'zustand';

export interface AuthUser {
  user_id: string;
  role: string;
  name: string;
  phone: string;
  timezone: string;
}

interface AuthState {
  access: string | null;
  user: AuthUser | null;
  setAccess: (access: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const AUTH_CACHE_KEY = 'gym-admin-auth';
const AUTH_CACHE_TTL_MS = 10 * 60 * 60 * 1000;

interface CachedAuth {
  user: AuthUser;
  expiresAt: number;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.user_id === 'string' &&
    typeof user.role === 'string' &&
    typeof user.name === 'string' &&
    typeof user.phone === 'string' &&
    typeof user.timezone === 'string'
  );
}

function readCache(): CachedAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedAuth>;

    if (
      !isAuthUser(parsed.user) ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= Date.now()
    ) {
      window.localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    return { user: parsed.user, expiresAt: parsed.expiresAt };
  } catch {
    window.localStorage.removeItem(AUTH_CACHE_KEY);
    return null;
  }
}

function writeCache(user: AuthUser): number {
  const expiresAt = Date.now() + AUTH_CACHE_TTL_MS;

  if (typeof window !== 'undefined') {
    try {
      const cached: CachedAuth = { user, expiresAt };
      window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cached));
    } catch {
      return expiresAt;
    }
  }

  return expiresAt;
}

function removeCache(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AUTH_CACHE_KEY);
    } catch {
      return;
    }
  }
}

let expiryTimer: ReturnType<typeof setTimeout> | null = null;

export const useAuthStore = create<AuthState>((set) => {
  const cached = readCache();

  const clearExpiryTimer = () => {
    if (expiryTimer) {
      clearTimeout(expiryTimer);
      expiryTimer = null;
    }
  };

  const scheduleExpiry = (expiresAt: number) => {
    clearExpiryTimer();

    const delay = expiresAt - Date.now();

    if (delay <= 0) {
      removeCache();
      return;
    }

    expiryTimer = setTimeout(() => {
      removeCache();
      set({ access: null, user: null });
      expiryTimer = null;
    }, delay);
  };

  if (cached) {
    scheduleExpiry(cached.expiresAt);
  }

  return {
    access: null,
    user: cached?.user ?? null,
    setAccess: (access) => set({ access }),
    setUser: (user) => {
      if (user) {
        scheduleExpiry(writeCache(user));
      } else {
        clearExpiryTimer();
        removeCache();
      }

      set({ user });
    },
    logout: () => {
      clearExpiryTimer();
      removeCache();
      set({ access: null, user: null });
    },
  };
});
