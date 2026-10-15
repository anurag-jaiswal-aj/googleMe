export const VALID_THEMES = new Set(['light', 'dark', 'system']);
export const THEME_STORAGE_KEY = 'theme';
export const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Normalizes a configured default theme string.
 * Restricts to 'light', 'dark', or 'system'. Any missing or invalid
 * value safely falls back to 'system'.
 */
export function normalizeDefaultTheme(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (VALID_THEMES.has(trimmed)) {
      return trimmed;
    }
  }
  return 'system';
}

/**
 * Safely reads the explicit visitor preference from localStorage.
 * Returns 'dark' | 'light' | null.
 * Never throws exceptions.
 */
export function safeGetStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'dark' || saved === 'light' ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Safely persists explicit visitor preference into localStorage.
 * Never throws exceptions.
 */
export function safeSetStoredTheme(theme) {
  if (typeof window === 'undefined') return;
  try {
    if (theme === 'dark' || theme === 'light') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } else {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Safely removes explicit visitor preference from localStorage.
 * Never throws exceptions.
 */
export function safeRemoveStoredTheme() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {}
}

/**
 * Queries current OS prefers-color-scheme setting.
 * Never throws exceptions.
 */
export function getSystemTheme() {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia(MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

/**
 * Resolves the effective theme based on precedence:
 * 1. Explicit visitor preference ('light' | 'dark')
 * 2. Admin-configured SiteConfig.defaultTheme ('light' | 'dark' | 'system')
 * 3. System OS preference
 *
 * Returns boolean: true for dark mode, false for light mode.
 */
export function resolveEffectiveTheme({ explicitPreference, defaultTheme, systemPrefersDark }) {
  // Tier 1: Explicit visitor preference ('light' | 'dark')
  if (explicitPreference === 'light') return false;
  if (explicitPreference === 'dark') return true;

  // Tier 2: SiteConfig.defaultTheme ('light' | 'dark' | 'system')
  const normalizedDefault = normalizeDefaultTheme(defaultTheme);
  if (normalizedDefault === 'light') return false;
  if (normalizedDefault === 'dark') return true;

  // Tier 3: System OS preference
  return Boolean(systemPrefersDark);
}
