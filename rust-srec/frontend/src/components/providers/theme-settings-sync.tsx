import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTheme } from '@/components/providers/theme-provider';
import { THEME_VARS_CACHE_KEY } from '@/lib/theme-script';
import { shadcnThemePresets } from '@/utils/shadcn-ui-theme-presets';
import { useThemeSettings } from '@/store/theme-settings';

/**
 * Diff-based CSS variable application.
 * Applies all vars in `next`, then removes any previously-applied vars
 * that are no longer present — without an intermediate "blank" state.
 */
function syncCssVars(
  root: HTMLElement,
  next: Record<string, string>,
  prevKeys: Set<string>,
): Set<string> {
  const nextKeys = new Set<string>();

  // Apply / overwrite
  for (const [key, value] of Object.entries(next)) {
    const prop = `--${key}`;
    root.style.setProperty(prop, value);
    nextKeys.add(prop);
  }

  // Remove stale vars that are no longer in the new set
  for (const prop of prevKeys) {
    if (!nextKeys.has(prop)) {
      root.style.removeProperty(prop);
    }
  }

  return nextKeys;
}

function withSidebarVars(vars: Record<string, string>): Record<string, string> {
  const next = { ...vars };

  const fallbacks: Record<string, string> = {
    sidebar: 'background',
    'sidebar-foreground': 'foreground',
    'sidebar-primary': 'primary',
    'sidebar-primary-foreground': 'primary-foreground',
    'sidebar-accent': 'accent',
    'sidebar-accent-foreground': 'accent-foreground',
    'sidebar-border': 'border',
    'sidebar-ring': 'ring',
  };

  for (const [key, fallbackKey] of Object.entries(fallbacks)) {
    if (next[key] !== undefined) continue;
    const fallbackValue = next[fallbackKey];
    if (fallbackValue !== undefined) {
      next[key] = fallbackValue;
    }
  }

  return next;
}

/**
 * Resolve the full CSS variable map for a given mode (light/dark).
 */
function resolveVars(
  settings: {
    base: string;
    preset: string;
    radius: string;
    overrides: Record<string, string>;
    importedTheme: {
      light: Record<string, string>;
      dark: Record<string, string>;
    } | null;
  },
  isDark: boolean,
): Record<string, string> {
  const baseVars =
    settings.base === 'imported' && settings.importedTheme
      ? isDark
        ? settings.importedTheme.dark
        : settings.importedTheme.light
      : isDark
        ? (shadcnThemePresets[settings.preset] ?? shadcnThemePresets.default)
            .styles.dark
        : (shadcnThemePresets[settings.preset] ?? shadcnThemePresets.default)
            .styles.light;

  return {
    ...withSidebarVars(baseVars),
    ...(settings.radius ? { radius: settings.radius } : {}),
    ...settings.overrides,
  };
}

/**
 * Write a cache of { light: {...}, dark: {...} } to localStorage so the
 * blocking <head> script can restore CSS vars before first paint.
 */
function writeVarsCache(settings: {
  base: string;
  preset: string;
  radius: string;
  overrides: Record<string, string>;
  importedTheme: {
    light: Record<string, string>;
    dark: Record<string, string>;
  } | null;
}) {
  try {
    const cache = {
      light: resolveVars(settings, false),
      dark: resolveVars(settings, true),
    };
    localStorage.setItem(THEME_VARS_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable — non-critical
  }
}

export function ThemeSettingsSync() {
  const { resolvedMode } = useTheme();
  const settings = useThemeSettings(
    useShallow((state) => ({
      base: state.base,
      preset: state.preset,
      radius: state.radius,
      overrides: state.overrides,
      importedTheme: state.importedTheme,
    })),
  );

  const [hydrated, setHydrated] = React.useState(false);
  const prevKeysRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    void useThemeSettings.persist.rehydrate();
    setHydrated(true);
  }, []);

  const isDarkMode = resolvedMode === 'dark';

  React.useEffect(() => {
    if (!hydrated) return;
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const allVars = resolveVars(settings, isDarkMode);

    prevKeysRef.current = syncCssVars(root, allVars, prevKeysRef.current);

    // Persist both light + dark variants so the blocking script can
    // instantly restore the correct one on next page load.
    writeVarsCache(settings);
  }, [
    hydrated,
    isDarkMode,
    settings.base,
    settings.importedTheme,
    settings.overrides,
    settings.preset,
    settings.radius,
  ]);

  return null;
}
