import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProjects } from '../api';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';

/* ── Dummy fallback data ─────────────────────────────── */
const DUMMY_PROJECTS = [
  {
    _id: '1',
    title: 'gfolio — Google-style Portfolio',
    description: 'A MERN stack portfolio inspired by Google Search. Features a fully responsive SERP UI, dark mode, AI search mode, animated suggestions, and a knowledge panel.',
    techStack: ['React', 'Node.js', 'MongoDB', 'Express', 'TailwindCSS'],
    repoUrl: 'https://github.com/anurag-2911/gfolio',
    demoUrl: 'https://gfolio.vercel.app',
    featured: true,
  },
  {
    _id: '2',
    title: 'DevBoard — Developer Dashboard',
    description: 'A real-time developer productivity dashboard with GitHub stats integration, task tracking, and Pomodoro timer. Built with React and the GitHub REST API.',
    techStack: ['React', 'Node.js', 'REST APIs'],
    repoUrl: 'https://github.com/anurag-2911/devboard',
    demoUrl: '',
    featured: true,
  },
  {
    _id: '3',
    title: 'ShopCart — E-commerce Platform',
    description: 'Full-stack e-commerce app with JWT auth, product catalog, cart management, Stripe payment integration, and an admin dashboard for order management.',
    techStack: ['React', 'Node.js', 'Express', 'MongoDB'],
    repoUrl: 'https://github.com/anurag-2911/shopcart',
    demoUrl: 'https://shopcart-demo.vercel.app',
    featured: false,
  },
  {
    _id: '4',
    title: 'ChatApp — Real-time Messaging',
    description: 'Real-time group and private chat application using Socket.io, with rooms, typing indicators, online presence, and persistent message history.',
    techStack: ['React', 'Node.js', 'Express', 'MongoDB'],
    repoUrl: 'https://github.com/anurag-2911/chatapp',
    demoUrl: '',
    featured: false,
  },
  {
    _id: '5',
    title: 'CodeSnip — Snippet Manager',
    description: 'A developer tool to save, tag, search, and share code snippets. Supports syntax highlighting for 30+ languages and team workspaces.',
    techStack: ['React', 'Node.js', 'MongoDB'],
    repoUrl: 'https://github.com/anurag-2911/codesnip',
    demoUrl: 'https://codesnip.vercel.app',
    featured: false,
  },
];

/* Slug a title to a GitHub-style URL path */
const toSlug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Tech badge — colored inline pill */
function TechBadge({ tech }) {
  const palettes = {
    React:      'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]  border-[#c5d7f7] dark:border-[#2a4080]',
    'Node.js':  'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]  border-[#b6dfc3] dark:border-[#2a5535]',
    MongoDB:    'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995]  border-[#b6dfc3] dark:border-[#2a5535]',
    Express:    'bg-[#f1f3f4] dark:bg-[#2d2d2d] text-[#202124] dark:text-[#e8eaed]  border-[#dadce0] dark:border-[#5f6368]',
    default:    'bg-[#fce8e6] dark:bg-[#3b1f1d] text-[#c5221f] dark:text-[#f28b82]  border-[#f5c6c4] dark:border-[#5e2a28]',
  };
  const cls = palettes[tech] || palettes.default;
  return (
    <span className={`inline-block px-2 py-0 rounded text-xs border leading-5 ${cls}`}>{tech}</span>
  );
}

/* Skeleton result */
function SkeletonResult() {
  return (
    <div className="max-w-[680px] mb-8 animate-pulse">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-4 h-4 rounded-full bg-[#e8eaed] dark:bg-[#3c4043]" />
        <div className="h-3 w-40 bg-[#e8eaed] dark:bg-[#3c4043] rounded" />
      </div>
      <div className="h-5 w-72 bg-[#e8eaed] dark:bg-[#3c4043] rounded mb-2" />
      <div className="h-3 w-full bg-[#f1f3f4] dark:bg-[#303134] rounded mb-1.5" />
      <div className="h-3 w-4/5 bg-[#f1f3f4] dark:bg-[#303134] rounded mb-2" />
      <div className="flex gap-1.5">
        {[1,2,3].map(i => <div key={i} className="h-4 w-16 rounded bg-[#e8eaed] dark:bg-[#3c4043]" />)}
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState('');
  const [filters,  setFilters]    = useState([]);   // multi-select
  const [sort,     setSort]       = useState('relevance'); // 'relevance' | 'az' | 'za' | 'featured'
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [elapsed]                 = useState(() => (Math.random() * 0.4 + 0.2).toFixed(2));

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects(DUMMY_PROJECTS))
      .finally(() => setLoading(false));
  }, []);

  const allTech = [...new Set(projects.flatMap(p => p.techStack || []))];

  let displayed = filters.length === 0
    ? projects
    : projects.filter(p => filters.every(f => p.techStack?.includes(f)));

  if (sort === 'az')       displayed = [...displayed].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'za')       displayed = [...displayed].sort((a, b) => b.title.localeCompare(a.title));
  if (sort === 'featured') displayed = [...displayed].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">

      {/* Stats + controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mr-2">
          {loading
            ? 'Searching...'
            : `About ${displayed.length.toLocaleString()} results (${elapsed} seconds)`}
        </p>

        {/* ── Filter + Sort ── */}
        {!loading && (
          <FilterSort
            filterOptions={allTech}
            filters={filters}
            onFilterChange={setFilters}
            sortOptions={[
              { value: 'relevance', label: 'Relevance' },
              { value: 'az',        label: 'A \u2192 Z' },
              { value: 'za',        label: 'Z \u2192 A' },
              { value: 'featured',  label: 'Featured first' },
            ]}
            sort={sort}
            onSortChange={setSort}
            filterOpen={filterOpen}
            setFilterOpen={setFilterOpen}
            sortOpen={sortOpen}
            setSortOpen={setSortOpen}
          />
        )}
      </div>

      {/* Divider */}
      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-4" />

      {/* Results */}
      {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonResult key={i} />)}

      {!loading && displayed.length === 0 && (
        <div className="max-w-[680px]">
          <p className="text-[#202124] dark:text-[#e8eaed] text-base mb-2">
            No projects match the selected filters.
          </p>
          <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">Suggestions:</p>
          <ul className="list-disc list-inside text-sm text-[#133780] dark:text-[#bdc1c6] mt-1 space-y-1">
            <li>Try different keywords</li>
            <li>Remove the filter to see all projects</li>
          </ul>
        </div>
      )}

      {!loading && displayed.map((project, i) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <SearchResult
            url={`github.com › anurag-2911 › ${toSlug(project.title)}`}
            title={`${project.title} | GitHub`}
            snippet={project.description}
            href={project.repoUrl || project.demoUrl || '#'}
            faviconBg="#24292e"
            faviconLetter="G"
          >
            {/* Tech badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.techStack?.map(tech => <TechBadge key={tech} tech={tech} />)}
            </div>

            {/* Repo / demo action links */}
            <div className="flex flex-wrap gap-4 mt-2.5">
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  View on GitHub
                </a>
              )}
              {project.demoUrl && (
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer"
                   className="text-sm text-[#1a73e8] dark:text-[#8ab4f8] hover:underline flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  Live Demo
                </a>
              )}
              {project.featured && (
                <span className="text-xs text-[#133780] dark:text-[#bdc1c6] flex items-center gap-1">
                  <svg className="w-3 h-3 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Featured
                </span>
              )}
            </div>
          </SearchResult>
        </motion.div>
      ))}

      {/* "Related searches" at the bottom */}
      {!loading && displayed.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="max-w-[680px] mt-4 border-t border-[#e8eaed] dark:border-[#3c4043] pt-6"
        >
          <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">Related searches</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Anurag GitHub profile',
              'Full-stack developer portfolio',
              'MERN stack projects',
              'React + Node.js projects',
            ].map(term => (
              <div key={term}
                   className="flex items-center gap-2 px-3 py-2.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                              text-sm text-[#202124] dark:text-[#e8eaed] cursor-default">
                <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                {term}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}


