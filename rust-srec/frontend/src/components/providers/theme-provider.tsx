import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ThemeSettingsSync } from '@/components/providers/theme-settings-sync';
import {
  DEFAULT_MODE,
  STORAGE_KEY_MODE,
  COOKIE_KEY_MODE,
  COOKIE_MAX_AGE,
  type Mode,
  type ResolvedMode,
} from '@/lib/theme-config';

const MEDIA = '(prefers-color-scheme: dark)';

const isServer = typeof window === 'undefined';

type ThemeProviderProps = {
  children: React.ReactNode;
  serverMode?: Mode;
};

type ThemeProviderState = {
  mode: Mode;
  resolvedMode: ResolvedMode;
  setMode: (mode: Mode) => void;
};

const initialState: ThemeProviderState = {
  mode: 'system',
  resolvedMode: 'light',
  setMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemTheme(): ResolvedMode {
  if (isServer) return 'light';
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

function readStorage(key: string, fallback: string): string {
  if (isServer) return fallback;
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable
  }
}

function writeCookie(key: string, value: string): void {
  document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ThemeProvider({ children, serverMode }: ThemeProviderProps) {
  const [mode, setModeState] = useState<Mode>(
    () => readStorage(STORAGE_KEY_MODE, serverMode ?? DEFAULT_MODE) as Mode,
  );
  const [systemTheme, setSystemTheme] = useState<ResolvedMode>(getSystemTheme);

  const resolvedMode: ResolvedMode = mode === 'system' ? systemTheme : mode;

  // --------------------------------------------------
  // Apply theme to <html>
  // --------------------------------------------------

  const applyToDOM = useCallback((resolved: ResolvedMode) => {
    const el = document.documentElement;

    el.classList.remove('light', 'dark');
    el.classList.add(resolved);
    el.style.colorScheme = resolved;
  }, []);

  // Apply on every resolvedMode change (including mount).
  // The blocking script in <head> already sets the correct class before
  // React hydrates, so the first call here is a no-op in production.
  useEffect(() => {
    applyToDOM(resolvedMode);
  }, [resolvedMode, applyToDOM]);

  // --------------------------------------------------
  // Setter: update state + persist
  // --------------------------------------------------

  const setMode = useCallback((next: Mode) => {
    setModeState(next);
    writeStorage(STORAGE_KEY_MODE, next);
    writeCookie(COOKIE_KEY_MODE, next);
  }, []);

  // --------------------------------------------------
  // OS preference listener
  // --------------------------------------------------

  useEffect(() => {
    const media = window.matchMedia(MEDIA);
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  // --------------------------------------------------
  // Cross-tab sync via storage events
  // --------------------------------------------------

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_MODE) {
        setModeState((e.newValue as Mode) || DEFAULT_MODE);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // --------------------------------------------------
  // Context value
  // --------------------------------------------------

  const value = useMemo<ThemeProviderState>(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode],
  );

  return (
    <ThemeProviderContext value={value}>
      <ThemeSettingsSync />
      {children}
    </ThemeProviderContext>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useTheme = () => {
  const context = use(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
