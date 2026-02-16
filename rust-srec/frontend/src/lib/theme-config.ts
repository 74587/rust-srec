export const MODES = ['light', 'dark', 'system'] as const;
export type Mode = (typeof MODES)[number];
export type ResolvedMode = Exclude<Mode, 'system'>;

export const DEFAULT_MODE: Mode = 'system';

export const STORAGE_KEY_MODE = 'theme';
export const COOKIE_KEY_MODE = 'theme';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
