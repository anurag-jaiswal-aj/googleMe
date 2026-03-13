import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';
import api from '../api';

const POSTS = [
  {
    id: 1,
    title: 'Building a Google Search-Inspired Portfolio with MERN Stack',
    url: 'anurag.dev/blog/mern-portfolio',
    snippet: 'A deep-dive into how I designed and built this very portfolio — Google SERP layout, dark mode, AI search mode, animated suggestions, knowledge panel, and a Node.js + MongoDB backend. Every design decision explained.',
    date: 'Mar 15, 2026',
    readTime: '8 min read',
    views: '2.4k',
    tags: ['MERN', 'React', 'Portfolio'],
    featured: true,
    faviconBg: '#4285F4',
  },
  {
    id: 2,
    title: 'React useEffect: The Complete Guide to Avoiding Infinite Loops',
    url: 'anurag.dev/blog/react-useeffect-guide',
    snippet: 'Most React bugs trace back to useEffect misuse. This guide covers dependency arrays, cleanup functions, stale closures, and the mental model you need to write effects that actually work.',
    date: 'Feb 28, 2026',
    readTime: '10 min read',
    views: '5.1k',
    tags: ['React', 'JavaScript'],
    featured: false,
    faviconBg: '#34A853',
  },
  {
    id: 3,
    title: 'TailwindCSS in 2026: Utility Patterns That Actually Save Time',
    url: 'anurag.dev/blog/tailwind-patterns-2026',
    snippet: 'Beyond the basics — component extraction, dark mode with CSS variables, responsive design without breakpoint chaos, and the custom plugins that made building this portfolio 3x faster.',
    date: 'Feb 10, 2026',
    readTime: '6 min read',
    views: '3.8k',
    tags: ['TailwindCSS', 'CSS', 'UI'],
    featured: false,
    faviconBg: '#06B6D4',
  },
  {
    id: 4,
    title: 'REST vs GraphQL: A Developer\'s Honest Comparison',
    url: 'anurag.dev/blog/rest-vs-graphql',
    snippet: 'Not another theoretical comparison — this is what I learned after switching a real project from REST to GraphQL and back again. When each approach wins, and the hidden costs nobody talks about.',
    date: 'Jan 22, 2026',
    readTime: '7 min read',
    views: '6.7k',
    tags: ['API', 'GraphQL', 'Node.js'],
    featured: false,
    faviconBg: '#E10098',
  },
  {
    id: 5,
    title: 'MongoDB Aggregation Pipelines: From Zero to Useful',
    url: 'anurag.dev/blog/mongodb-aggregation',
    snippet: 'Aggregation pipelines are the most powerful feature of MongoDB that most developers barely use. Real examples: group-by, lookup joins, computed fields, and building analytics dashboards.',
    date: 'Jan 5, 2026',
    readTime: '9 min read',
    views: '4.2k',
    tags: ['MongoDB', 'Node.js', 'Database'],
    featured: false,
    faviconBg: '#00ED64',
  },
  {
    id: 6,
    title: 'Docker for Node.js: A Practical Introduction',
    url: 'anurag.dev/blog/docker-nodejs',
    snippet: 'Containerising a Node.js + MongoDB stack from scratch — Dockerfile, docker-compose, environment variables, multi-stage builds, and tips for keeping your images small.',
    date: 'Dec 18, 2025',
    readTime: '8 min read',
    views: '3.1k',
    tags: ['Docker', 'Node.js', 'DevOps'],
    featured: false,
    faviconBg: '#2496ED',
  },
];

const ALL_TAGS = ['All', ...new Set(POSTS.flatMap(p => p.tags))];

const TAG_COLOR = {
  MERN:       'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]',
  React:      'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]',
  Portfolio:  'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]',
  JavaScript: 'bg-[#fef7e0] dark:bg-[#3a2e00] text-[#b06000] dark:text-[#fdd663]',
  TailwindCSS:'bg-[#e0f7fa] dark:bg-[#003740] text-[#007b8a] dark:text-[#4dd0e1]',
  CSS:        'bg-[#e0f7fa] dark:bg-[#003740] text-[#007b8a] dark:text-[#4dd0e1]',
  UI:         'bg-[#fce8e6] dark:bg-[#3b1f1d] text-[#c5221f] dark:text-[#f28b82]',
  API:        'bg-[#f3e8fd] dark:bg-[#2d1a44] text-[#8430ce] dark:text-[#d09df0]',
  GraphQL:    'bg-[#f3e8fd] dark:bg-[#2d1a44] text-[#8430ce] dark:text-[#d09df0]',
  'Node.js':  'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]',
  MongoDB:    'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]',
  Database:   'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]',
  Docker:     'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]',
  DevOps:     'bg-[#fce8e6] dark:bg-[#3b1f1d] text-[#c5221f] dark:text-[#f28b82]',
};

const SORT_OPTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest',    label: 'Newest first' },
  { value: 'shortest',  label: 'Shortest read' },
];

/* ── Article Reader Modal ───────────────────────── */
function ArticleReader({ post, onClose }) {
  const scrollRef = useRef(null);

  // Sanitise: strip scripts/styles, broken images, fix relative hrefs
  const sanitise = (html = '') =>
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/href="(\/[^"]+)"/g, 'href="https://medium.com$1"')
      // Remove any <img> that has an empty or data-less src (broken Medium CDN images in RSS)
      .replace(/<img[^>]*src=["']["'][^>]*>/gi, '')
      .replace(/<img(?![^>]*src=["']https?:)[^>]*>/gi, '')      // Remove Medium tracking pixel (1×1 stat image at end of every RSS post)
      .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, '')
      // Remove 1×1 tracking images in general
      .replace(/<img[^>]*\s(?:width|height)=[\"']1[\"'][^>]*>/gi, '')      // Remove entire <figure> blocks whose only <img> has no real src
      .replace(/<figure[^>]*>[\s]*<img[^>]*src=["']["'][^>]*>[\s\S]*?<\/figure>/gi, '')
      // Remove empty figcaption + paywall figure blocks Medium injects
      .replace(/<figure[^>]*class="[^"]*graf--layoutOutsetLeft[^"]*"[\s\S]*?<\/figure>/gi, '')
      // Unwrap unnecessary div wrappers Medium uses
      .replace(/<div class="[^"]*section-content[^"]*">/gi, '')
      .replace(/<div class="[^"]*section-inner[^"]*">/gi, '');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <motion.div
      key="reader-backdrop"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-white dark:bg-[#1a1a1a] overflow-y-auto"
      ref={scrollRef}
    >
      {/* ── Navbar ── */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-sm
                      border-b border-[#e8eaed] dark:border-[#333]">
        <div className="max-w-[728px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-[#00ab6c] flex items-center justify-center
                            text-white text-xs font-bold">M</div>
            <span className="text-sm font-medium text-[#292929] dark:text-[#e6e6e6] hidden sm:block">Medium</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <a href={post.href} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 text-xs text-[#6b6b6b] dark:text-[#999]
                          px-3 py-1.5 rounded-full border border-[#e8eaed] dark:border-[#444]
                          hover:border-[#292929] dark:hover:border-[#888] transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              View on Medium
            </a>
            <button onClick={onClose}
              className="p-2 rounded-full text-[#6b6b6b] dark:text-[#999]
                         hover:bg-[#f2f2f2] dark:hover:bg-[#333] transition-colors"
              aria-label="Close reader">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Article ── */}
      <article className="max-w-[728px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24">

        {/* Tags */}
        {(post.tags||[]).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(t => (
              <span key={t}
                className="text-xs px-3 py-1 rounded-full bg-[#f2f2f2] dark:bg-[#2a2a2a]
                           text-[#6b6b6b] dark:text-[#999]">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontFamily: "'Georgia', 'Charter', serif" }}
            className="text-[42px] font-bold leading-[1.18] tracking-[-0.5px]
                       text-[#292929] dark:text-[#e6e6e6] mb-4">
          {post.title}
        </h1>

        {/* Byline */}
        <div className="flex items-center gap-3 py-5 mb-2
                        border-t border-b border-[#e8eaed] dark:border-[#333]">
          <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center
                          text-white text-base font-semibold shrink-0">A</div>
          <div>
            <p className="text-sm font-medium text-[#292929] dark:text-[#e6e6e6]">Anurag</p>
            <p className="text-xs text-[#6b6b6b] dark:text-[#999]">
              {post.date} · {post.readTime}
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          className="mt-8 medium-body"
          dangerouslySetInnerHTML={{ __html: sanitise(post.content || '') }}
        />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#e8eaed] dark:border-[#333] text-center">
          <p className="text-sm text-[#6b6b6b] dark:text-[#999] mb-4">
            For more such articles, follow me on Medium.
          </p>
          <a href="https://medium.com/@janurag582004" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full
                        bg-[#292929] dark:bg-[#e6e6e6] text-white dark:text-[#292929]
                        text-sm font-medium hover:bg-[#1a1a1a] dark:hover:bg-white transition-colors">
            <div className="w-4 h-4 rounded-full bg-[#00ab6c] flex items-center justify-center text-white text-[9px] font-bold">M</div>
            Follow on Medium
          </a>
        </div>
      </article>
    </motion.div>
  );
}

/* ── 3-dot context menu ─────────────────────────── */
function PostMenu({ post, onRead }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(post.href);
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1500);
  };

  const actions = [
    { label: 'Read here',        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', onClick: () => { onRead(post); setOpen(false); } },
    { label: copied ? 'Copied!' : 'Copy link', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', onClick: copyLink },
    { label: 'Open on Medium',   icon: 'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14', onClick: () => { window.open(post.href, '_blank', 'noopener,noreferrer'); setOpen(false); } },
    { label: 'Share',            icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z', onClick: () => { if (navigator.share) navigator.share({ title: post.title, url: post.href }); else copyLink(); setOpen(false); } },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="ml-0.5 text-[#70757a] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]"
        aria-label="More options"
      >
        <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.12 }}
            className="absolute left-0 top-7 z-50 w-44 bg-white dark:bg-[#303134]
                       border border-[#dadce0] dark:border-[#5f6368] rounded-2xl shadow-lg py-1 overflow-hidden"
          >
            {actions.map(a => (
              <button key={a.label} onClick={a.onClick}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                           text-[#202124] dark:text-[#e8eaed]
                           hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors text-left">
                <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a.icon}/>
                </svg>
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Blog post row ──────────────────────────────── */
function PostCard({ post, onRead }) {
  return (
    <div className="max-w-[680px] mb-8">
      {/* URL row */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center
                        text-white text-[9px] font-bold shrink-0"
             style={{ backgroundColor: post.faviconBg || '#00ab6c' }}>
          {post.title[0]}
        </div>
        <span className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-snug truncate max-w-[420px]">
          {post.url}
        </span>
        <PostMenu post={post} onRead={onRead} />
      </div>

      {/* Title — opens reader, no external redirect */}
      <button
        onClick={() => onRead(post)}
        className="block text-left text-[20px] leading-[1.3] font-normal
                   text-[#1a73e8] dark:text-[#8ab4f8] hover:underline mb-1"
      >
        {post.title}
      </button>

      {/* Snippet */}
      <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.58]">{post.snippet}</p>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mt-1.5">
        <span className="text-xs text-[#133780] dark:text-[#bdc1c6] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          {post.date}
        </span>
        <span className="text-[#dadce0] dark:text-[#5f6368]">·</span>
        <span className="text-xs text-[#133780] dark:text-[#bdc1c6] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {post.readTime}
        </span>
        {(post.tags || []).length > 0 && (
          <span className="flex flex-wrap gap-1 ml-1">
            {post.tags.map(tag => (
              <span key={tag} className={`text-xs px-2 py-0 rounded-full leading-5 ${TAG_COLOR[tag] || 'bg-[#f1f3f4] dark:bg-[#303134] text-[#5f6368] dark:text-[#9aa0a6]'}`}>
                {tag}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Blog() {
  const [posts,       setPosts]       = useState(POSTS);
  const [loading,     setLoading]     = useState(true);
  const [activeTag,   setActiveTag]   = useState('All');
  const [sort,        setSort]        = useState('relevance');
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [sortOpen,    setSortOpen]    = useState(false);
  const [reading,     setReading]     = useState(null); // post being read in modal
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 8;

  useEffect(() => {
    api.get('/medium')
      .then(r => { if (r.data?.length) setPosts(r.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openReader = useCallback(post => setReading(post), []);
  const closeReader = useCallback(() => setReading(null), []);

  const allTags = ['All', ...new Set(posts.flatMap(p => p.tags || []))];

  let filtered = activeTag === 'All' ? posts : posts.filter(p => (p.tags || []).includes(activeTag));
  if (sort === 'newest')   filtered = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sort === 'shortest') filtered = [...filtered].sort((a, b) => parseInt(a.readTime) - parseInt(b.readTime));

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset to page 1 whenever filter or sort changes
  const handleTagChange = vals => { setActiveTag(vals.length ? vals[vals.length - 1] : 'All'); setPage(1); };
  const handleSortChange = val => { setSort(val); setPage(1); };

  // "People also search for" — derived from real post titles (always all posts, not paginated)
  const relatedSearches = posts.slice(0, 6).map(p => p.title);

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">

      {/* Reader modal */}
      <AnimatePresence>
        {reading && <ArticleReader post={reading} onClose={closeReader} />}
      </AnimatePresence>

      {/* Stats + controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          {loading ? 'Searching…' : `About ${filtered.length} articles (0.31 seconds)`}
        </p>
        {!loading && (
          <FilterSort
            filterOptions={allTags.slice(1)}
            filters={activeTag === 'All' ? [] : [activeTag]}
            onFilterChange={handleTagChange}
            sortOptions={SORT_OPTS}
            sort={sort}
            onSortChange={handleSortChange}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            sortOpen={sortOpen}
            setSortOpen={setSortOpen}
          />
        )}
      </div>

      <div className="max-w-[680px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-5" />

      {/* Skeleton */}
      {loading && (
        <div className="space-y-8">
          {[1,2,3].map(i => (
            <div key={i} className="max-w-[680px] animate-pulse">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-[#e8eaed] dark:bg-[#3c4043]" />
                <div className="h-3 w-40 bg-[#e8eaed] dark:bg-[#3c4043] rounded" />
              </div>
              <div className="h-5 w-72 bg-[#e8eaed] dark:bg-[#3c4043] rounded mb-2" />
              <div className="h-3 w-full bg-[#f1f3f4] dark:bg-[#303134] rounded mb-1.5" />
              <div className="h-3 w-4/5 bg-[#f1f3f4] dark:bg-[#303134] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Post list */}
      {!loading && (
        <AnimatePresence mode="wait">
          <motion.div key={activeTag + sort + page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {paginated.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <PostCard post={post} onRead={openReader} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Google-style pagination */}
      {!loading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-1">
          {/* Prev */}
          <button
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8]
                       hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded disabled:opacity-30
                       disabled:pointer-events-none transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Previous
          </button>

          {/* Page numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-colors
                ${ n === page
                  ? 'bg-[#1a73e8] text-white'
                  : 'text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]'
                }`}>
              {n}
            </button>
          ))}

          {/* Next */}
          <button
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 text-sm text-[#1a73e8] dark:text-[#8ab4f8]
                       hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded disabled:opacity-30
                       disabled:pointer-events-none transition-colors">
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}

      {/* People also search for — real titles */}
      {!loading && relatedSearches.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="mt-8 max-w-[680px] border-t border-[#e8eaed] dark:border-[#3c4043] pt-6">
          <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">People also search for</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedSearches.map(title => {
              const post = posts.find(p => p.title === title);
              return (
                <button key={title} onClick={() => post && openReader(post)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full text-left
                             border border-[#dadce0] dark:border-[#5f6368]
                             text-sm text-[#202124] dark:text-[#e8eaed]
                             hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors">
                  <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  <span className="truncate">{title}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
