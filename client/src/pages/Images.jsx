import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchImages } from '../api';
import FilterSort from '../components/FilterSort';

const CATEGORIES = ['Projects', 'Certificates', 'UI Work', 'Other'];

/* ── Lightbox ───────────────────────────────────── */
function Lightbox({ image, onClose, onPrev, onNext, hasPrev, hasNext }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="text-white font-medium text-sm truncate">{image.title}</p>
          {image.category && <p className="text-white/50 text-xs mt-0.5">{image.category}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {image.link && (
            <a href={image.link} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white
                          border border-white/30 hover:bg-white/10 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Open link
            </a>
          )}
          <button onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Image + nav */}
      <div className="flex-1 flex items-center justify-center gap-4 px-4 min-h-0"
           onClick={e => e.stopPropagation()}>
        <button onClick={onPrev} disabled={!hasPrev}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <img src={image.imageData} alt={image.title}
          className="max-h-full max-w-full object-contain rounded-lg select-none"
          style={{ maxHeight: 'calc(100vh - 140px)' }} />
        <button onClick={onNext} disabled={!hasNext}
          className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {image.description && (
        <div className="px-6 py-3 text-center shrink-0" onClick={e => e.stopPropagation()}>
          <p className="text-white/60 text-sm">{image.description}</p>
        </div>
      )}
    </motion.div>
  );
}

/* ── Image card ─────────────────────────────────── */
function ImageCard({ image, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      {/* Image */}
      <div className="rounded-xl overflow-hidden bg-[#f1f3f4] dark:bg-[#303134]">
        <img src={image.imageData} alt={image.title}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ aspectRatio: '4/3' }} />
      </div>

      {/* Info below image */}
      <div className="mt-1.5 px-0.5">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm text-[#202124] dark:text-[#e8eaed] font-medium leading-snug line-clamp-1 flex-1">
            {image.title}
          </p>
          {image.link && (
            <a href={image.link} target="_blank" rel="noopener noreferrer"
               onClick={e => e.stopPropagation()}
               className="shrink-0 text-[#1a73e8] dark:text-[#8ab4f8] hover:text-[#1557b0] mt-0.5"
               title="Open link">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
            </a>
          )}
        </div>
        {image.category && (
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5">{image.category}</p>
        )}
        {image.description && (
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-0.5 line-clamp-1">{image.description}</p>
        )}
      </div>
    </motion.div>
  );
}

/* ── Page ───────────────────────────────────────── */
export default function Images() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState([]);
  const [sort, setSort] = useState('newest');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    fetchImages().then(setImages).catch(() => {}).finally(() => setLoading(false));
  }, []);

  let filtered = filters.length === 0
    ? images
    : images.filter(img => filters.includes(img.category));

  if (sort === 'az') filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  if (sort === 'za') filtered = [...filtered].sort((a, b) => b.title.localeCompare(a.title));

  const availableCategories = CATEGORIES.filter(c => images.some(img => img.category === c));

  const openLightbox = useCallback((idx) => setLightboxIdx(idx), []);
  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(() => setLightboxIdx(i => Math.max(0, i - 1)), []);
  const nextImage = useCallback(() => setLightboxIdx(i => Math.min(filtered.length - 1, i + 1)), [filtered.length]);

  return (
    <div className="px-4 sm:pl-[176px] sm:pr-8 pt-3 pb-10">
      <AnimatePresence>
        {lightboxIdx !== null && filtered[lightboxIdx] && (
          <Lightbox
            image={filtered[lightboxIdx]}
            onClose={closeLightbox}
            onPrev={prevImage}
            onNext={nextImage}
            hasPrev={lightboxIdx > 0}
            hasNext={lightboxIdx < filtered.length - 1}
          />
        )}
      </AnimatePresence>

      <p className="text-sm text-[#133780] dark:text-[#bdc1c6] mb-4">
        {loading ? 'Loading…' : `About ${filtered.length} image${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {!loading && images.length > 0 && (
        <FilterSort
          filterOptions={availableCategories}
          filters={filters}
          onFilterChange={(val) => { setFilters(val); }}
          sortOptions={[
            { value: 'newest', label: 'Newest' },
            { value: 'az',     label: 'A → Z' },
            { value: 'za',     label: 'Z → A' },
          ]}
          sort={sort}
          onSortChange={setSort}
          filterOpen={filterOpen}
          setFilterOpen={setFilterOpen}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
        />
      )}

      <div className="max-w-[700px] h-px bg-[#e8eaed] dark:bg-[#3c4043] mt-4 mb-5" />

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-[700px]">
          {[1,2,3,4,5,6].map(i => (
            <div key={i}>
              <div className="rounded-xl bg-[#e8eaed] dark:bg-[#3c4043] animate-pulse" style={{ aspectRatio: '4/3' }} />
              <div className="mt-2 h-3 w-3/4 bg-[#e8eaed] dark:bg-[#3c4043] rounded animate-pulse" />
              <div className="mt-1 h-2.5 w-1/2 bg-[#f1f3f4] dark:bg-[#303134] rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="max-w-[680px] py-16 text-center">
          <svg className="w-12 h-12 text-[#dadce0] dark:text-[#5f6368] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <p className="text-[#5f6368] dark:text-[#9aa0a6] text-sm">
            {images.length === 0 ? 'No images uploaded yet.' : 'No images in this category.'}
          </p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-[700px]">
          {filtered.map((image, idx) => (
            <ImageCard key={image._id} image={image} onClick={() => openLightbox(idx)} />
          ))}
        </div>
      )}
    </div>
  );
}
