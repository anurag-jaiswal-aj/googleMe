import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';
import SEO from '../components/SEO';
import { TOOLS } from '../data/toolsData';
import { useImagesPageEnabled } from '../hooks/useImagesPageEnabled';

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
  const imagesEnabled = useImagesPageEnabled();
  const [filters,    setFilters]    = useState([]);
  const [sort,       setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  let visible = TOOLS.map(group => ({
    ...group,
    items: filters.length === 0 ? group.items : group.items.filter(i => filters.includes(i.level)),
  })).filter(g => g.items.length > 0);

  if (sort === 'az')    visible = [...visible].sort((a, b) => a.category.localeCompare(b.category));
  if (sort === 'count') visible = [...visible].sort((a, b) => b.items.length - a.items.length);

  const total = visible.reduce((s, g) => s + g.items.length, 0);

  return (
    <div className="px-4 sm:pl-[120px] md:pl-[176px] sm:pr-6 md:pr-8 pt-3 pb-10">
      <SEO
        title="Toolkit"
        description="Anurag Jaiswal's tech stack and skills — React, Node.js, MongoDB, Python, TailwindCSS, Docker, and more. Categorised by proficiency level."
        path="/tools"
      />
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-sm text-[#133780] dark:text-[#bdc1c6]">
          {total} skills across {visible.length} categories (0.31 seconds)
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

      {/* Divider */}
      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mb-6" />

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
            url={`anuragjaiswal.me/toolkit/${group.category.toLowerCase().replace(/[\s/]+/g, '-')}`}
            title={group.title || group.category}
            snippet={group.snippet}
            onTitleClick={() => setExpandedCat(group.category)}
            menuItems={[
              {
                label: 'Copy link',
                icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
                action: () => navigator.clipboard.writeText(`${window.location.origin}/tools`),
              },
              {
                label: 'Share',
                icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
                action: () => {
                  const url = `${window.location.origin}/tools`;
                  if (navigator.share) navigator.share({ title: `${group.category} - Toolkit`, url });
                  else navigator.clipboard.writeText(url);
                },
              },
            ]}
          >
            <AnimatePresence initial={false}>
              {expandedCat === group.category && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
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
                </motion.div>
              )}
            </AnimatePresence>
          </SearchResult>
        </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* People also search for */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="max-w-[680px] mt-4 border-t border-[#e8eaed] dark:border-[#3c4043] pt-6">
        <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">People also search for</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Projects and open source work', to: '/projects' },
            { label: 'Background and bio', to: '/about' },
            { label: 'Blog posts and articles', to: '/blog' },
            imagesEnabled
              ? { label: 'Images and gallery', to: '/images' }
              : { label: 'Get in touch', to: '/contact' },
          ].map(({ label, to }) => (
            <a key={label} href={to}
               className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                          text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors">
              <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
              </svg>
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
