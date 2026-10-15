import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useConfig } from '../hooks/useConfig';
import {
  MEDIA_QUERY,
  safeGetStoredTheme,
  safeSetStoredTheme,
  safeRemoveStoredTheme,
  getSystemTheme,
  resolveEffectiveTheme,
  normalizeDefaultTheme,
} from '../utils/themeHelper';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const config = useConfig();
  const [explicitTheme, setExplicitTheme] = useState(safeGetStoredTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemTheme);

  const isDark = useMemo(() => {
    return resolveEffectiveTheme({
      explicitPreference: explicitTheme,
      defaultTheme: config?.defaultTheme,
      systemPrefersDark,
    });
  }, [explicitTheme, config?.defaultTheme, systemPrefersDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const media = window.matchMedia(MEDIA_QUERY);
      const handleChange = (event) => setSystemPrefersDark(Boolean(event.matches));
      setSystemPrefersDark(Boolean(media.matches));
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleStorage = (event) => {
      if (event.key === 'theme') {
        setExplicitTheme(safeGetStoredTheme());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', isDark);
    }
  }, [isDark]);

  const toggle = () => {
    const next = isDark ? 'light' : 'dark';
    setExplicitTheme(next);
    safeSetStoredTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle, theme: isDark ? 'dark' : 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export {
  safeGetStoredTheme,
  safeSetStoredTheme,
  safeRemoveStoredTheme,
  getSystemTheme,
  resolveEffectiveTheme,
  normalizeDefaultTheme,
};
