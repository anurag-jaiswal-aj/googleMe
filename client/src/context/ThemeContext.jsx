import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();
const mediaQuery = '(prefers-color-scheme: dark)';

function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem('theme');
  return saved === 'dark' || saved === 'light' ? saved : 'system';
}

function getSystemTheme() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(mediaQuery).matches;
}

export function ThemeProvider({ children }) {
  const [themePreference, setThemePreference] = useState(getStoredTheme);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemTheme);

  const isDark = useMemo(() => {
    if (themePreference === 'system') return systemPrefersDark;
    return themePreference === 'dark';
  }, [systemPrefersDark, themePreference]);

  useEffect(() => {
    const media = window.matchMedia(mediaQuery);
    const handleChange = (event) => setSystemPrefersDark(event.matches);

    setSystemPrefersDark(media.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);

    if (themePreference === 'system') {
      window.localStorage.removeItem('theme');
      return;
    }

    window.localStorage.setItem('theme', themePreference);
  }, [isDark, themePreference]);

  const toggle = () => {
    setThemePreference((current) => {
      const currentlyDark = current === 'system' ? getSystemTheme() : current === 'dark';
      return currentlyDark ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
