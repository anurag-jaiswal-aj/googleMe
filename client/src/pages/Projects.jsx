import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getProjects } from '../utils/prefetch';
import SearchResult from '../components/SearchResult';
import FilterSort from '../components/FilterSort';
import SEO from '../components/SEO';
import fallbackProjects from '../../../shared/projects.json';
import { useImagesPageEnabled } from '../hooks/useImagesPageEnabled';

/* Slug a title to a GitHub-style URL path */
const toSlug = str => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Tech badge — plain gray pill */
function TechBadge({ tech }) {
  return (
    <span className="inline-block px-2 py-0 rounded text-xs border leading-5 bg-[#f1f3f4] dark:bg-[#2d2d2d] text-[#5f6368] dark:text-[#9aa0a6] border-[#dadce0] dark:border-[#5f6368]">
      {tech}
    </span>
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
      <div className="h-5 w-48 sm:w-72 bg-[#e8eaed] dark:bg-[#3c4043] rounded mb-2" />
      <div className="h-3 w-full bg-[#f1f3f4] dark:bg-[#303134] rounded mb-1.5" />
      <div className="h-3 w-4/5 bg-[#f1f3f4] dark:bg-[#303134] rounded mb-2" />
      <div className="flex gap-1.5">
        {[1,2,3].map(i => <div key={i} className="h-4 w-16 rounded bg-[#e8eaed] dark:bg-[#3c4043]" />)}
      </div>
    </div>
  );
}

export default function Projects() {
  const imagesEnabled = useImagesPageEnabled();
  const [projects, setProjects]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [filters,  setFilters]    = useState([]);
  const [sort,     setSort]       = useState('relevance');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen,   setSortOpen]   = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [page,       setPage]       = useState(1);
  const [elapsed]                 = useState(() => (Math.random() * 0.4 + 0.2).toFixed(2));
  const PER_PAGE = 6;

  useEffect(() => {
    getProjects()
      .then((data) => {
        setProjects(Array.isArray(data) && data.length > 0 ? data : fallbackProjects);
      })
      .catch(() => setProjects(fallbackProjects))
      .finally(() => setLoading(false));
  }, []);

  const allTech = [...new Set(projects.flatMap(p => p.techStack || []))];

  let displayed = filters.length === 0
    ? projects
    : projects.filter(p => filters.every(f => p.techStack?.includes(f)));

  if (sort === 'relevance') displayed = [...displayed].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (sort === 'az')        displayed = [...displayed].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'za')        displayed = [...displayed].sort((a, b) => b.title.localeCompare(a.title));
  if (sort === 'featured')  displayed = [...displayed].sort((a, b) => {
    if (b.featured !== a.featured) return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const totalPages = Math.ceil(displayed.length / PER_PAGE);
  const paginated  = displayed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleFilterChange = (val) => { setFilters(val); setPage(1); };
  const handleSortChange   = (val) => { setSort(val);    setPage(1); };

  return (
    <div className="px-4 sm:pl-[120px] md:pl-[176px] sm:pr-6 md:pr-8 pt-3 pb-10">
      <SEO
        title="Projects"
        description="Anurag Jaiswal's open-source projects and web apps — built with React, Node.js, Express, MongoDB, and TailwindCSS. View source on GitHub."
        path="/projects"
      />
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
            onFilterChange={handleFilterChange}
            sortOptions={[
              { value: 'relevance', label: 'Relevance' },
              { value: 'az',        label: 'A \u2192 Z' },
              { value: 'za',        label: 'Z \u2192 A' },
              { value: 'featured',  label: 'Featured first' },
            ]}
            sort={sort}
            onSortChange={handleSortChange}
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

      {!loading && paginated.map((project, i) => (
        <motion.div
          key={project._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.3 }}
        >
          <SearchResult
            url={project.repoUrl ? project.repoUrl.replace('https://', '') : `github.com/${toSlug(project.title)}`}
            title={`${project.title} | GitHub`}
            snippet=""
            faviconBg="#24292e"
            faviconLetter="G"
            onTitleClick={() => setExpandedId(project._id)}
            menuItems={[
              {
                label: 'Copy repo link',
                icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
                action: () => navigator.clipboard.writeText(project.repoUrl || `https://github.com/${toSlug(project.title)}`),
              },
              {
                label: 'Share project',
                icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
                action: () => {
                  if (navigator.share) {
                    navigator.share({ title: project.title, url: project.repoUrl });
                  } else {
                    navigator.clipboard.writeText(project.repoUrl || '');
                  }
                },
              },
            ]}
          >
            {/* Description — 2-line clamp, expands on title/text click */}
            <p
              className={`text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.58] ${expandedId === project._id ? '' : 'line-clamp-2'}`}
            >
              {project.description}
            </p>

            {/* Language badges — only when expanded */}
            {expandedId === project._id && project.techStack?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {project.techStack.map(tech => <TechBadge key={tech} tech={tech} />)}
              </div>
            )}

            {/* Stars + links — always visible */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5">
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
              {project.stars > 0 && (
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {project.stars} stars
                </span>
              )}
              {project.forks > 0 && (
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7a4 4 0 014 4m0 0a4 4 0 014-4m-4 4v6m-4-2a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z"/>
                  </svg>
                  {project.forks} forks
                </span>
              )}
              {project.featured && (
                <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-[#FBBC05]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Featured
                </span>
              )}
            </div>
          </SearchResult>
        </motion.div>
      ))}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="max-w-[680px] mt-8 flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n}
              onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`w-9 h-9 rounded-full text-sm font-medium transition-colors
                ${n === page
                  ? 'bg-[#1a73e8] text-white'
                  : 'text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043]'
                }`}>
              {n}
            </button>
          ))}
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

      {/* Related searches */}
      {!loading && displayed.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="max-w-[680px] mt-4 border-t border-[#e8eaed] dark:border-[#3c4043] pt-6"
        >
          <p className="text-base font-medium text-[#202124] dark:text-[#e8eaed] mb-4">People also search for</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Background and bio',
              'Skills and tech stack',
              'Blog posts and articles',
              imagesEnabled ? 'Images and gallery' : 'Get in touch',
            ].map(term => (
              <a key={term} href={
                term.includes('Background') ? '/about' :
                term.includes('Skills') ? '/tools' :
                term.includes('Blog') ? '/blog' :
                term.includes('Images') ? '/images' : '/contact'
              }
                   className="flex items-center gap-2 px-3 py-2.5 rounded-full border border-[#dadce0] dark:border-[#5f6368]
                              text-sm text-[#202124] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors">
                <svg className="w-4 h-4 text-[#70757a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                {term}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}


