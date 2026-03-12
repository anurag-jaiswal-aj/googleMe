import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import KnowledgePanel from './KnowledgePanel';

const TABS = [
  { label: 'All',      to: '/all',      query: 'anurag developer portfolio' },
  { label: 'About',    to: '/about',    query: 'anurag about me' },
  { label: 'Projects', to: '/projects', query: 'anurag projects github' },
  { label: 'Contact',  to: '/contact',  query: 'contact anurag' },
  { label: 'Blog',     to: '/blog',     query: 'anurag blog posts' },
  { label: 'Tools',    to: '/tools',    query: 'anurag tools stack' },
];

const SUGGESTIONS = [
  { label: 'developer portfolio',  to: '/all'      },
  { label: 'about me',             to: '/about'    },
  { label: 'projects on github',   to: '/projects' },
  { label: 'contact',              to: '/contact'  },
  { label: 'blog posts',           to: '/blog'     },
];

// Keyword → route map for fuzzy search
const KEYWORD_ROUTES = [
  { keys: ['all', 'everything', 'overview', 'portfolio', 'home'],                              to: '/all'      },
  { keys: ['about', 'me', 'who', 'bio', 'background', 'info', 'skills', 'resume', 'cv'],       to: '/about'    },
  { keys: ['projects', 'project', 'github', 'work', 'code', 'open source', 'repos', 'apps'],   to: '/projects' },
  { keys: ['contact', 'email', 'hire', 'message', 'reach', 'connect', 'talk'],                 to: '/contact'  },
  { keys: ['blog', 'blogs', 'post', 'posts', 'article', 'articles', 'writing', 'read'],        to: '/blog'     },
];

function fuzzyRoute(q) {
  const lower = q.toLowerCase().trim();
  for (const { keys, to } of KEYWORD_ROUTES) {
    if (keys.some(k => lower.includes(k))) return to;
  }
  return null;
}

const LOGO = [
  { char: 'A', color: '#4285F4' },
  { char: 'n', color: '#EA4335' },
  { char: 'u', color: '#FBBC05' },
  { char: 'r', color: '#4285F4' },
  { char: 'a', color: '#34A853' },
  { char: 'g', color: '#EA4335' },
];

export default function SearchLayout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const { isDark, toggle } = useTheme();

  const currentTab   = TABS.find(t => t.to === location.pathname);
  const [query,      setQuery]      = useState(currentTab?.query ?? '');
  const [focused,    setFocused]    = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [appsOpen,   setAppsOpen]   = useState(false);

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [helpOpen,   setHelpOpen]   = useState(false);
  const [helpSection, setHelpSection] = useState(0);
  const inputRef   = useRef(null);
  const wrapperRef = useRef(null);
  const appsRef    = useRef(null);

  const avatarRef  = useRef(null);

  // Sync search bar text with active page label
  useEffect(() => {
    const tab = TABS.find(t => t.to === location.pathname);
    setQuery(tab?.label ?? '');
  }, [location.pathname]);

  const filtered = SUGGESTIONS.filter(s =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );
  const showDropdown = focused && query.trim().length > 0 && filtered.length > 0;

  const handleSelect = useCallback((to) => {
    setFocused(false);
    navigate(to);
  }, [navigate]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) {
        handleSelect(filtered[highlighted].to);
      } else {
        const route = fuzzyRoute(query) ?? filtered[0]?.to;
        if (route) handleSelect(route);
      }
    } else if (e.key === 'Escape') {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSearch = () => {
    const route = fuzzyRoute(query) ?? filtered[0]?.to;
    if (route) handleSelect(route);
  };

  useEffect(() => {
    const handler = e => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setFocused(false);
      }
      if (appsRef.current && !appsRef.current.contains(e.target)) {
        setAppsOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setHighlighted(-1); }, [query]);



  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#202124]">
      {/* ── Sticky SERP header ─────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-[#202124]">

        {/* Row 1 — logo · search · actions */}
        <div className="flex items-center gap-11 sm:gap-7 px-4 pt-6 pb-1.5">

          {/* Logo — links home */}
          <Link to="/" className="shrink-0 select-none w-[90px] sm:w-[112px] ml-4">
            <span className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-none">
              {LOGO.map(({ char, color }, i) => (
                <span key={i} style={{ color }}>{char}</span>
              ))}
            </span>
          </Link>

          {/* Search bar */}
          <div ref={wrapperRef} className="relative flex-1 max-w-[584px]">
            <div
              className={`flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#303134]
                border rounded-full transition-all duration-150
                ${focused
                  ? 'border-transparent shadow-[0_1px_6px_rgba(32,33,36,0.28)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.6)]'
                  : 'border-gray-300 dark:border-[#5f6368] hover:shadow-[0_1px_6px_rgba(32,33,36,0.2)] dark:hover:shadow-[0_1px_6px_rgba(0,0,0,0.4)]'
                }
              `}
            >
              {/* Search icon — clickable */}
              <button onClick={handleSearch} className="shrink-0 text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]" aria-label="Search">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
              </button>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onKeyDown={handleKeyDown}
                className="flex-1 min-w-0 bg-transparent text-sm text-[#202124] dark:text-[#e8eaed]
                           placeholder-[#9aa0a6] outline-none"
                autoComplete="off"
                spellCheck={false}
                aria-label="Search portfolio"
              />

              {/* Clear */}
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="shrink-0 text-[#70757a] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                  aria-label="Clear"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

            </div>

            {/* Dropdown suggestions */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute left-0 right-0 top-[calc(100%+4px)] z-50
                             bg-white dark:bg-[#303134] rounded-2xl
                             shadow-[0_4px_24px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]
                             border border-[#e8eaed] dark:border-[#5f6368] overflow-hidden"
                  role="listbox"
                >
                  <div className="py-1" style={{ maxHeight: 'calc(5 * 41px)', overflowY: 'auto' }}>
                    {filtered.map((s, i) => (
                      <button
                        key={s.to}
                        role="option"
                        aria-selected={highlighted === i}
                        onMouseEnter={() => setHighlighted(i)}
                        onMouseLeave={() => setHighlighted(-1)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(s.to)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm
                          text-[#202124] dark:text-[#e8eaed] transition-colors cursor-pointer
                          ${highlighted === i ? 'bg-[#f1f3f4] dark:bg-[#3c4043]' : 'hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]'}`}
                      >
                        <svg className="w-4 h-4 shrink-0 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                        </svg>
                        <span className="flex-1 truncate">{s.label}</span>
                        <svg className="w-3.5 h-3.5 shrink-0 text-[#9aa0a6] rotate-[-45deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right icons */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 mr-4 shrink-0">
            {/* Apps grid */}
            <div className="relative" ref={appsRef}>
              <button
                onClick={() => setAppsOpen(o => !o)}
                className={`p-2 rounded-full transition-colors text-[#5f6368] dark:text-[#9aa0a6]
                  ${appsOpen ? 'bg-[#e8eaed] dark:bg-[#3c4043]' : 'hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]'}`}
                aria-label="Apps"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 8a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zM6 14a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zM6 20a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4zm6 0a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </button>

              <AnimatePresence>
                {appsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl
                               bg-white dark:bg-[#202124] border border-gray-200 dark:border-[#3c4043]
                               z-50 p-4"
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        {
                          label: 'Search', action: () => { navigate('/'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg viewBox="0 0 24 24" className="w-8 h-8">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'Gmail', action: () => { navigate('/contact'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center">
                              <svg viewBox="52 42 88 66" className="w-9 h-9">
                                <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                                <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                                <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                                <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                                <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'Works', action: () => { navigate('/projects'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#546E7A] flex items-center justify-center">
                              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.46 1 12 1S6 2.53 6 4.64c0 .48.11.92.18 1.36H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-8-3c1.9 0 3.36.72 3.7 1.64H8.3C8.64 3.72 10.1 3 12 3zM12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'Blog', action: () => { navigate('/blog'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                              <svg className="w-10 h-10" viewBox="0 0 48 48">
                                <rect x="4" y="8" width="40" height="32" rx="3" fill="#fff9c4"/>
                                <rect x="8" y="14" width="20" height="3" rx="1.5" fill="#e53935"/>
                                <rect x="8" y="20" width="32" height="2" rx="1" fill="#9e9e9e"/>
                                <rect x="8" y="25" width="28" height="2" rx="1" fill="#9e9e9e"/>
                                <rect x="8" y="30" width="22" height="2" rx="1" fill="#9e9e9e"/>
                                <rect x="30" y="14" width="10" height="10" rx="1" fill="#ffe082"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'LinkedIn',
                          action: () => { window.open('https://linkedin.com/in/anurag-2911', '_blank'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-[10px] bg-[#0A66C2] flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'GitHub',
                          action: () => { window.open('https://github.com/anurag-2911', '_blank'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#1b1f23] flex items-center justify-center">
                              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'About', action: () => { navigate('/about'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-full bg-[#00BCD4] flex items-center justify-center">
                              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'LeetCode',
                          action: () => { window.open('https://leetcode.com/u/janurag582004/', '_blank'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#FFA116] flex items-center justify-center">
                              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                                <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
                              </svg>
                            </div>
                          ),
                        },
                        {
                          label: 'CodeChef',
                          action: () => { window.open('https://www.codechef.com/users/janurag582004', '_blank'); setAppsOpen(false); },
                          icon: (
                            <div className="w-12 h-12 rounded-xl bg-[#5B4638] flex items-center justify-center">
                              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
                                <path d="M11.257.004C5.055.271-.081 5.601 0 11.818c.077 5.93 4.841 10.87 10.743 11.175 6.483.337 11.95-4.76 12.253-11.19C23.3 5.48 17.896-.28 11.257.004zm.244 2.01a9.77 9.77 0 0 1 9.508 9.968c-.257 5.435-4.873 9.76-10.312 9.508-5.26-.244-9.417-4.64-9.431-9.912-.014-5.458 4.48-9.855 10.235-9.564zm-.286 3.24c-1.168 0-2.244.324-3.143.882l.627 1.09a4.49 4.49 0 0 1 2.516-.764c2.496 0 4.52 2.024 4.52 4.52s-2.024 4.52-4.52 4.52a4.49 4.49 0 0 1-2.516-.764l-.627 1.09a5.697 5.697 0 0 0 3.143.882c3.148 0 5.728-2.58 5.728-5.728s-2.58-5.728-5.728-5.728zm-3.81 1.695l-1.75 4.033-1.75-4.033H3.89l2.675 5.728-2.675 5.729h1.015l1.75-4.034 1.75 4.034h1.014L5.744 12.677 8.42 6.949z"/>
                              </svg>
                            </div>
                          ),
                        },
                      ].map(({ label, action, icon }) => (
                        <button
                          key={label}
                          onClick={action}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl
                                     hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                        >
                          <div className="flex items-center justify-center w-14 h-14">{icon}</div>
                          <span className="text-xs text-[#202124] dark:text-[#e8eaed] font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(o => !o)}
                className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center
                            text-white text-sm font-medium cursor-pointer select-none ml-1
                            ring-2 ring-[#EA4335] ring-offset-1 ring-offset-white dark:ring-offset-[#202124]"
              >
                A
              </button>
              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.13 }}
                    className="absolute right-0 mt-2.5 w-72 rounded-3xl shadow-2xl
                               bg-white dark:bg-[#1e1f20] border border-[#e8eaed] dark:border-[#3c4043]
                               z-50 overflow-hidden"
                  >
                    {/* Top: avatar + name + subtitle */}
                    <div className="flex flex-col items-center px-5 pt-6 pb-4 gap-2">
                      <div className="w-16 h-16 rounded-full bg-[#1a73e8] flex items-center justify-center
                                      text-white text-2xl font-semibold
                                      ring-2 ring-[#EA4335] ring-offset-2 ring-offset-white dark:ring-offset-[#1e1f20] shrink-0">
                        A
                      </div>
                      <div className="text-center">
                        <p className="text-[15px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-snug">Anurag</p>
                        <button
                          onClick={() => { navigator.clipboard.writeText('janurag582004@gmail.com'); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }}
                          className="text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] leading-snug hover:underline cursor-pointer"
                        >
                          {copiedEmail ? 'Copied!' : 'janurag582004@gmail.com'}
                        </button>
                      </div>
                      <button
                        onClick={() => { navigate('/about'); setAvatarOpen(false); }}
                        className="mt-1 px-5 py-1.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                                   text-[13px] font-medium text-[#1a73e8] dark:text-[#8ab4f8]
                                   hover:bg-[#e8f0fe] dark:hover:bg-[#1a3a5c]/40 transition-colors"
                      >
                        View profile
                      </button>
                    </div>

                    <div className="border-t border-[#e8eaed] dark:border-[#3c4043] mx-3" />

                    {/* Alt Portfolio + Resume + Copy Email */}
                    <div className="py-1.5">
                      <a
                        href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <span className="flex-1 text-left">Resume</span>
                        <svg className="w-3.5 h-3.5 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </a>
                      <a
                        href="https://html5up.net/read-only/demo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 px-5 py-2.5
                                   text-[13.5px] text-[#202124] dark:text-[#e8eaed]
                                   hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        <span className="flex-1 text-left">Alternate Portfolio</span>
                        <svg className="w-3.5 h-3.5 text-[#9aa0a6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </a>
                    </div>

                    <div className="border-t border-[#e8eaed] dark:border-[#3c4043] mx-3" />

                    {/* Dark/Light + Help */}
                    <div className="px-4 py-3.5 flex gap-2">
                      <button
                        onClick={() => { toggle(); setAvatarOpen(false); }}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-full
                                   border border-[#dadce0] dark:border-[#5f6368]
                                   text-[#202124] dark:text-[#e8eaed]
                                   text-[13px] font-medium hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors"
                      >
                        {isDark ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 6.343l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                        )}
                        {isDark ? 'Light mode' : 'Dark mode'}
                      </button>
                      <button
                        onClick={() => { setHelpOpen(true); setHelpSection(0); setAvatarOpen(false); }}
                        className="flex items-center justify-center gap-2 flex-1 py-2 rounded-full
                                   bg-[#1a73e8] text-white
                                   text-[13px] font-medium hover:bg-[#1557b0] transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Help
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Row 2 — tab navigation */}
        <div className="flex items-end overflow-x-auto scrollbar-hide -mb-px px-1">
          {/* Invisible spacer matching logo width + gap = same as row 1 */}
          <div className="hidden sm:block shrink-0 w-[112px] mr-10 sm:mr-12" />
          {/* "All" tab */}
          <Link
            to="/all"
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 mr-0.5
                       text-sm border-b-2 transition-colors whitespace-nowrap
                       ${location.pathname === '/all'
                         ? 'border-transparent text-[#1a73e8] dark:text-[#8ab4f8]'
                         : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]'
                       }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All
          </Link>

          {TABS.filter(t => t.to !== '/all').map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 mr-0.5
                text-sm border-b-2 transition-colors whitespace-nowrap
                ${location.pathname === to
                  ? 'border-transparent text-[#1a73e8] dark:text-[#8ab4f8]'
                  : 'border-transparent text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]'
                }`}
            >
              {label === 'About'    && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
              {label === 'Projects' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>}
              {label === 'Contact'  && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
              {label === 'Blog'     && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3a2 2 0 01.586-1.414z"/></svg>}
              {label === 'Tools'    && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>}
              {label}
            </Link>
          ))}

        </div>
      </header>

      {/* ── Content + sticky sidebar ────────────────────── */}
      <div className="flex flex-1">

        {/* Page content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky knowledge panel — scrolls up naturally when footer arrives */}
        <div className="hidden lg:block w-[420px] shrink-0">
          <div className="sticky top-[152px] w-[380px] pt-3 mb-6 max-h-[calc(100vh-168px)] overflow-y-auto ml-[-40px]">
            <KnowledgePanel />
          </div>
        </div>

      </div>

      {/* ── Help Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {helpOpen && (() => {
          const HELP_SECTIONS = [
            {
              id: 'home', label: 'Home', color: '#4285F4',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>),
              items: [
                { title: 'Search Bar', icon: '🔍', desc: 'Type any keyword — name, skill, project, or topic — to search across the portfolio. Press Enter or use the search button to navigate.' },
                { title: 'Smart Suggestions', icon: '💡', desc: 'Suggestions appear as you type. Use arrow keys to navigate them, Enter to select, or Escape to dismiss.' },
                { title: 'Voice Search (Mic)', icon: '🎤', desc: 'Click the microphone icon in the Home search bar to speak your query. Requires microphone permission.' },
                { title: 'AI Mode (✦)', icon: '✦', desc: 'Click the sparkle icon in the Home search bar to open AI Mode — a conversational assistant that answers anything about Anurag.' },
                { title: 'Apps Grid (⠿)', icon: '⠿', desc: 'Click the 9-dot icon (top-right) to open quick-access tiles: Search, Gmail, Works, Blog, LinkedIn, GitHub, About, LeetCode, CodeChef.' },
                { title: 'Avatar & Profile', icon: '👤', desc: 'Click the "A" avatar to see account info, copy email, toggle dark/light mode, or open this Help guide.' },
                { title: 'Weather & Clock', icon: '🌤', desc: 'The Home page top-left shows live time and weather fetched from your location automatically — no API key needed.' },
                { title: 'Language Switcher', icon: '🌐', desc: 'Below the Home search buttons, click any Indian language to translate UI labels instantly.' },
              ],
            },
            {
              id: 'about', label: 'About', color: '#34A853',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>),
              items: [
                { title: 'Who is Anurag?', icon: '🧑‍💻', desc: 'Full-stack developer specialising in the MERN stack. The About page covers background, education, and personality.' },
                { title: 'Skills & Tech Stack', icon: '⚙️', desc: 'Browse all technologies: React, Node.js, MongoDB, TypeScript, Docker, AWS, and more — shown as interactive skill cards.' },
                { title: 'Experience Timeline', icon: '📅', desc: 'Chronological timeline of work experience, internships, and key milestones.' },
                { title: 'Education', icon: '🎓', desc: "Anurag's academic background, degrees, and institutions." },
                { title: 'Download Resume', icon: '📄', desc: 'A resume download button is available on the About page for a PDF copy of the full CV.' },
              ],
            },
            {
              id: 'projects', label: 'Projects', color: '#FBBC05',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>),
              items: [
                { title: 'Browse Projects', icon: '🗂️', desc: 'All portfolio projects displayed as Google search-result–style cards with title, description, tags, and quick links.' },
                { title: 'Filter & Sort', icon: '🔧', desc: 'Filter chips narrow projects by technology (React, Node, MongoDB, etc.) or sort by newest, oldest, or featured.' },
                { title: 'Live Demo & GitHub', icon: '🚀', desc: 'Each card has a "Live" button (opens deployed site) and a "GitHub" button (opens source code).' },
                { title: 'Knowledge Panel', icon: '📊', desc: 'Clicking a project opens a detailed panel on the right with full description, tech stack, and screenshots.' },
              ],
            },
            {
              id: 'blog', label: 'Blog', color: '#EA4335',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>),
              items: [
                { title: 'Medium Articles', icon: '📝', desc: "Real published articles fetched from Anurag's Medium RSS feed — 8 per page, displayed as Google search results." },
                { title: 'Pagination', icon: '📖', desc: 'Navigate with Google-style numbered page controls at the bottom. Exactly 8 articles per page.' },
                { title: 'Article Reader', icon: '📰', desc: 'Click any title to open full-screen Medium-style reader with proper typography — no need to leave the portfolio.' },
                { title: '3-Dot Article Menu', icon: '⋮', desc: 'Hover a card to reveal a 3-dot menu: Open on Medium, Copy link, Save.' },
                { title: 'People Also Search For', icon: '🔗', desc: 'Topic chips below the list are derived from real article titles for quick navigation.' },
              ],
            },
            {
              id: 'contact', label: 'Contact', color: '#9C27B0',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>),
              items: [
                { title: 'Contact Form', icon: '📬', desc: 'Choose a subject chip, enter name & email, write a message, and hit Send. Saved to DB and emailed to Anurag.' },
                { title: 'File Attachments', icon: '📎', desc: 'Attach up to 3 files (max 5 MB each) by dragging onto the zone or clicking to browse.' },
                { title: 'Subject Chips', icon: '🏷️', desc: 'Click Hire Me, Collaboration, Feedback, General, or Bug Report to pre-fill the subject line.' },
                { title: 'Social Profiles', icon: '🌐', desc: 'Below the form, quick links to LinkedIn, GitHub, Medium, and Twitter/X as Google-style cards.' },
              ],
            },
            {
              id: 'coding', label: 'Coding', color: '#FF5722',
              icon: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>),
              items: [
                { title: 'LeetCode', icon: '🟡', desc: "Apps Grid → LeetCode tile opens Anurag's LeetCode profile. Track problem-solving progress, streak, and contest ratings." },
                { title: 'CodeChef', icon: '🍴', desc: "Apps Grid → CodeChef tile opens Anurag's CodeChef profile — ratings, solved problems, and contest history." },
                { title: 'GitHub', icon: '🐙', desc: 'Access GitHub from the Apps Grid or the footer. Browse open-source repos and commit history.' },
              ],
            },
          ];
          const sec = HELP_SECTIONS[helpSection];
          return (
            <motion.div
              key="help-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 dark:bg-black/70 p-4"
              onClick={e => { if (e.target === e.currentTarget) setHelpOpen(false); }}
            >
              <motion.div
                initial={{ y: 32, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 32, opacity: 0, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="bg-white dark:bg-[#1e1f20] w-full max-w-[780px] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: 'min(85vh, 600px)' }}
              >
                <div className="h-[3px] shrink-0 bg-gradient-to-r from-[#4285F4] via-[#34A853] via-[#FBBC05] to-[#EA4335]" />
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eaed] dark:border-[#3c4043] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-[3px]">
                      {['#4285F4','#EA4335','#FBBC05','#34A853','#4285F4','#EA4335'].map((c, i) => (
                        <span key={i} className="font-bold text-[15px]" style={{ color: c }}>{['A','n','u','r','a','g'][i]}</span>
                      ))}
                    </div>
                    <span className="text-[15px] font-medium text-[#202124] dark:text-[#e8eaed]">Portfolio Help Centre</span>
                  </div>
                  <button onClick={() => setHelpOpen(false)}
                    className="p-1.5 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] transition-colors">
                    <svg className="w-[18px] h-[18px] text-[#5f6368]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  <nav className="w-[160px] shrink-0 border-r border-[#e8eaed] dark:border-[#3c4043] overflow-y-auto py-3 flex flex-col gap-0.5">
                    {HELP_SECTIONS.map((s, i) => (
                      <button key={s.id} onClick={() => setHelpSection(i)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium transition-colors text-left w-full
                          ${ helpSection === i
                            ? 'bg-[#e8f0fe] dark:bg-[#28355c] text-[#1a73e8] dark:text-[#8ab4f8]'
                            : 'text-[#202124] dark:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30]'
                          }`}
                      >
                        <span style={{ color: helpSection === i ? s.color : '#9aa0a6' }}>{s.icon}</span>
                        {s.label}
                        {helpSection === i && <span className="ml-auto w-1 h-4 rounded-full shrink-0" style={{ background: s.color }} />}
                      </button>
                    ))}
                  </nav>
                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                           style={{ background: sec.color + '1A', color: sec.color }}>{sec.icon}</div>
                      <div>
                        <h2 className="text-[15px] font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight">{sec.label}</h2>
                        <p className="text-[12px] text-[#9aa0a6] leading-tight">{sec.items.length} topic{sec.items.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {sec.items.map((item, idx) => (
                        <motion.div key={item.title}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="rounded-xl border border-[#e8eaed] dark:border-[#3c4043] bg-[#fafafa] dark:bg-[#28292a] px-4 py-3.5 flex gap-3 items-start"
                        >
                          <span className="text-xl mt-0.5 shrink-0 select-none">{item.icon}</span>
                          <div>
                            <p className="text-[13.5px] font-semibold text-[#202124] dark:text-[#e8eaed] mb-0.5">{item.title}</p>
                            <p className="text-[12.5px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">{item.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-5 px-4 py-3 rounded-xl bg-[#e8f0fe] dark:bg-[#28355c] flex gap-2.5 items-start">
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-[#1a73e8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[12px] text-[#1a73e8] dark:text-[#8ab4f8] leading-relaxed">
                        <strong>Tip:</strong> Use <strong>AI Mode</strong> (✦ in the Home search bar) to ask anything about Anurag or this portfolio.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── SERP footer ────────────────────────────────────── */}
      <footer className="border-t border-gray-200 dark:border-[#3c4043]
                         bg-[#f2f2f2] dark:bg-[#171717]">
        {/* Location bar */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-[#3c4043]
                        text-sm text-[#70757a] dark:text-[#9aa0a6]">
          Earth
        </div>
        {/* Links bar */}
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4
                        text-sm text-[#70757a] dark:text-[#9aa0a6]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="https://github.com/anurag-2911" target="_blank" rel="noopener noreferrer"
               className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">
              GitHub
            </a>
            <a href="https://linkedin.com/in/anurag-2911" target="_blank" rel="noopener noreferrer"
               className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">
              LinkedIn
            </a>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['About', 'Projects', 'Contact'].map(label => {
              const tab = TABS.find(t => t.label === label);
              return (
                <Link key={label} to={tab.to}
                  className="hover:underline hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors">
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </footer>
    </div>
  );
}
