/**
 * FilterSort — reusable Filter + Sort: Relevance toolbar
 *
 * Props:
 *   filterOptions  — array of strings shown in the Filter dropdown ([] = no filter button)
 *   filters        — current selected filters (array)
 *   onFilterChange — fn(newFiltersArray)
 *   sortOptions    — array of { value, label }  ([] = no sort button)
 *   sort           — current sort value (string)
 *   onSortChange   — fn(newSortValue)
 */
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FilterSort({
  filterOptions = [],
  filters = [],
  onFilterChange,
  sortOptions = [],
  sort,
  onSortChange,
  filterOpen,
  setFilterOpen,
  sortOpen,
  setSortOpen,
}) {
  const filterRef = useRef(null);
  const sortRef   = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const handler = e => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
      if (sortRef.current   && !sortRef.current.contains(e.target))   setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setFilterOpen, setSortOpen]);

  const toggleFilter = v =>
    onFilterChange(filters.includes(v) ? filters.filter(f => f !== v) : [...filters, v]);

  const currentSortLabel = sortOptions.find(o => o.value === sort)?.label ?? 'Relevance';

  const dropdownCls = `absolute left-0 top-[calc(100%+6px)] z-50 min-w-[160px] sm:min-w-[188px]
    bg-white dark:bg-[#303134] border border-[#dadce0] dark:border-[#5f6368]
    rounded-2xl shadow-lg overflow-y-auto max-h-[168px] py-1 scrollbar-hide`;

  const btnBase = `flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm border transition-all`;
  const btnActive = `bg-[#e8f0fe] dark:bg-[#1a2744] border-[#1a73e8] dark:border-[#8ab4f8] text-[#1a73e8] dark:text-[#8ab4f8] font-medium`;
  const btnInactive = `border-[#dadce0] dark:border-[#5f6368] text-[#3c4043] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043]`;
  const rowCls = `w-full flex items-center justify-between px-4 py-2.5 text-sm
    text-[#202124] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors`;

  const chevron = (open) => (
    <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const checkmark = (
    <svg className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );

  const dropMotion = {
    initial: { opacity: 0, y: 4, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit:    { opacity: 0, y: 4, scale: 0.97 },
    transition: { duration: 0.13 },
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* ── Filter button ─────────────────────────── */}
      {filterOptions.length > 0 && (
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => { setFilterOpen(o => !o); setSortOpen(false); }}
            className={`${btnBase} ${filters.length > 0 ? btnActive : btnInactive}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 10h10M11 16h2" />
            </svg>
            Filter
            {filters.length > 0 && (
              <span className="ml-0.5 bg-[#1a73e8] text-white dark:bg-[#8ab4f8] dark:text-[#1a2744]
                               rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                {filters.length}
              </span>
            )}
            {chevron(filterOpen)}
          </button>

          <AnimatePresence>
            {filterOpen && (
              <motion.div {...dropMotion} className={dropdownCls}>
                {filters.length > 0 && (
                  <>
                    <button
                      onClick={() => { onFilterChange([]); }}
                      className="w-full text-left px-4 py-2 text-xs text-[#c5221f] dark:text-[#f28b82] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors"
                    >
                      Clear all filters
                    </button>
                    <div className="h-px bg-[#e8eaed] dark:bg-[#5f6368] mx-3 my-1" />
                  </>
                )}
                {filterOptions.map(opt => (
                  <button key={opt} onClick={() => toggleFilter(opt)} className={rowCls}>
                    <span>{opt}</span>
                    {filters.includes(opt) && checkmark}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Sort button ───────────────────────────── */}
      {sortOptions.length > 0 && (
        <div className="relative" ref={sortRef}>
          <button
            onClick={() => { setSortOpen(o => !o); setFilterOpen(false); }}
            className={`${btnBase} ${sort !== sortOptions[0]?.value ? btnActive : btnInactive}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M6 12h12M9 17h6" />
            </svg>
            Sort: {currentSortLabel}
            {chevron(sortOpen)}
          </button>

          <AnimatePresence>
            {sortOpen && (
              <motion.div {...dropMotion} className={dropdownCls}>
                {sortOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onSortChange(opt.value); setSortOpen(false); }}
                    className={rowCls}
                  >
                    <span>{opt.label}</span>
                    {sort === opt.value && checkmark}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Active filter pills */}
      {filters.map(f => (
        <button
          key={f}
          onClick={() => toggleFilter(f)}
          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs
                     bg-[#e8f0fe] dark:bg-[#1a2744] text-[#1a73e8] dark:text-[#8ab4f8]
                     border border-[#1a73e8] dark:border-[#8ab4f8] hover:bg-[#d2e3fc] dark:hover:bg-[#1f3360]"
        >
          {f}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}
    </div>
  );
}
