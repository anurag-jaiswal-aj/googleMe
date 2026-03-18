import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';
import { TOOLS } from '../data/toolsData';

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
            title={`${group.category} - Anurag's Tech Stack`}
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
