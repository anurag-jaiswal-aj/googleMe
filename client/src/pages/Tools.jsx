import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';

const TOOLS = [
  {
    category: 'Languages',
    color: '#4285F4',
    items: [
      { name: 'JavaScript (ES2023)', level: 'Expert',       desc: 'Primary language for both frontend and backend development. Deep knowledge of async/await, closures, prototypes, and the event loop.' },
      { name: 'Python',              level: 'Proficient',   desc: 'Used for scripting, data processing, automation, and building small utilities. Comfortable with pandas, requests, and Flask.' },
      { name: 'Java',                level: 'Intermediate', desc: 'OOP fundamentals, data structures, and algorithms. Used for academic coursework and competitive programming.' },
      { name: 'SQL',                 level: 'Proficient',   desc: 'Writes complex queries, joins, indexes, and stored procedures. Experience with PostgreSQL and MySQL.' },
    ],
  },
  {
    category: 'Frontend',
    color: '#34A853',
    items: [
      { name: 'React 18',      level: 'Expert',       desc: 'Hooks, Context API, custom hooks, code-splitting, memoization, and React Router v6. This portfolio is built with React.' },
      { name: 'TailwindCSS',   level: 'Expert',       desc: 'Utility-first styling with dark mode, responsive design, and custom configuration. Preferred over traditional CSS.' },
      { name: 'Framer Motion', level: 'Proficient',   desc: 'Smooth page transitions, stagger animations, AnimatePresence, and gesture-based interactions.' },
      { name: 'Vite',          level: 'Proficient',   desc: 'Fast dev server and build tool. Configured with proxy, custom plugins, and environment variables.' },
    ],
  },
  {
    category: 'Backend',
    color: '#FBBC05',
    items: [
      { name: 'Node.js',   level: 'Expert',       desc: 'Event-driven, non-blocking I/O. Built REST APIs, middleware chains, and real-time services with Node.' },
      { name: 'Express',   level: 'Expert',       desc: 'Custom middleware, route handlers, error handling, JWT auth, rate limiting, and Helmet security.' },
      { name: 'REST APIs', level: 'Expert',       desc: 'Designed and consumed RESTful APIs with proper status codes, pagination, input validation, and error responses.' },
      { name: 'Socket.io', level: 'Intermediate', desc: 'Real-time bidirectional communication for chat apps and live dashboards.' },
    ],
  },
  {
    category: 'Database',
    color: '#EA4335',
    items: [
      { name: 'MongoDB',    level: 'Proficient',   desc: 'Document modelling, aggregation pipelines, indexing, and Mongoose ODM for schema validation.' },
      { name: 'PostgreSQL', level: 'Intermediate', desc: 'Relational schema design, transactions, and complex joins. Used with Prisma ORM.' },
      { name: 'Redis',      level: 'Beginner',     desc: 'Caching, session storage, and pub/sub for rate limiting and real-time features.' },
    ],
  },
  {
    category: 'DevOps & Tools',
    color: '#9c27b0',
    items: [
      { name: 'Git & GitHub',  level: 'Expert',       desc: 'Branching, rebasing, pull requests, GitHub Actions CI/CD, and semantic commits.' },
      { name: 'Docker',        level: 'Intermediate', desc: 'Containerising Node.js apps, writing Dockerfiles, and using docker-compose for local multi-service setups.' },
      { name: 'Postman',       level: 'Expert',       desc: 'API testing, collection automation, environment variables, and pre-request scripts.' },
      { name: 'VS Code',       level: 'Expert',       desc: 'Custom keybindings, extensions (ESLint, Prettier, GitLens), and workspace settings.' },
    ],
  },
];

const LEVEL_COLOR = {
  Expert:       'bg-[#e6f4ea] dark:bg-[#1a3320] text-[#137333] dark:text-[#81c995] border-[#b6dfc3] dark:border-[#2a5535]',
  Proficient:   'bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8] border-[#c5d7f7] dark:border-[#2a4080]',
  Intermediate: 'bg-[#fef7e0] dark:bg-[#3a2e00] text-[#b06000] dark:text-[#fdd663] border-[#f9e4a0] dark:border-[#5a4800]',
  Beginner:     'bg-[#f1f3f4] dark:bg-[#2d2d2d] text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#5f6368]',
};

const CATEGORIES = TOOLS.map(t => t.category);
const LEVELS = ['Expert', 'Proficient', 'Intermediate', 'Beginner'];
const SORT_OPTS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'az',        label: 'A → Z' },
  { value: 'count',     label: 'Most tools' },
];

export default function Tools() {
  const [filters,    setFilters]    = useState([]);
  const [sort,       setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);

  let visible = TOOLS.map(group => ({
    ...group,
    items: filters.length === 0 ? group.items : group.items.filter(i => filters.includes(i.level)),
  })).filter(g => g.items.length > 0);

  if (sort === 'az')    visible = [...visible].sort((a, b) => a.category.localeCompare(b.category));
  if (sort === 'count') visible = [...visible].sort((a, b) => b.items.length - a.items.length);

  const total = visible.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          {total} tools &amp; technologies (0.31 seconds)
        </p>
        <FilterSort
          filterOptions={LEVELS}
          filters={filters}
          onFilterChange={setFilters}
          sortOptions={SORT_OPTS}
          sort={sort}
          onSortChange={setSort}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={filters.join() + sort} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {visible.map((group, gi) => (
        <motion.div
          key={group.category}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.07 }}
        >
          <SearchResult
            url={`anurag.dev/tools/${group.category.toLowerCase().replace(/\s+/g, '-')}`}
            title={`${group.category} — Anurag's Tech Stack`}
            snippet={group.items.map(i => i.name).join(' · ')}
            faviconBg={group.color}
            faviconLetter={group.category[0]}
          >
            <div className="mt-3 space-y-3">
              {group.items.map(tool => (
                <div key={tool.name} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: group.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{tool.name}</span>
                      <span className={`text-xs px-2 py-0 rounded border leading-5 ${LEVEL_COLOR[tool.level]}`}>
                        {tool.level}
                      </span>
                    </div>
                    <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-5">{tool.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </SearchResult>
        </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
