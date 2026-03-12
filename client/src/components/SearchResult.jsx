/**
 * SearchResult — a single Google-style search result card.
 *
 * Props:
 *   url          — breadcrumb string, e.g. "anurag.dev › about"
 *   title        — result title (blue link)
 *   snippet      — description text (gray)
 *   to           — internal react-router link (optional)
 *   href         — external link (optional)
 *   faviconBg    — favicon circle background color (default "#1a73e8")
 *   faviconLetter— single char shown inside favicon circle (default "A")
 *   children     — extra content rendered below the snippet
 */
import { Link } from 'react-router-dom';

export default function SearchResult({
  url,
  title,
  snippet,
  to,
  href,
  faviconBg = '#1a73e8',
  faviconLetter = 'A',
  children,
}) {
  const isExternal = !!href && !to;
  const isInternal = !!to;

  const titleClass =
    'block text-[20px] leading-[1.3] font-normal text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer mb-1';

  return (
    <div className="max-w-[680px] mb-8">
      {/* ── URL row ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-0.5">
        {/* Favicon */}
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center
                     text-white text-[9px] font-bold shrink-0"
          style={{ backgroundColor: faviconBg }}
        >
          {faviconLetter}
        </div>

        {/* Breadcrumb */}
        <span className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-snug">
          {url}
        </span>

        {/* 3-dot menu (decorative) */}
        <button className="ml-0.5 text-[#70757a] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed]"
                aria-label="More options" tabIndex={-1}>
          <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* ── Title ──────────────────────────────────── */}
      {isInternal && (
        <Link to={to} className={titleClass}>{title}</Link>
      )}
      {isExternal && (
        <a href={href} target="_blank" rel="noopener noreferrer" className={titleClass}>{title}</a>
      )}
      {!isInternal && !isExternal && (
        <span className={titleClass}>{title}</span>
      )}

      {/* ── Snippet ────────────────────────────────── */}
      {snippet && (
        <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.58]">
          {snippet}
        </p>
      )}

      {/* ── Extra content (badges, links, etc.) ────── */}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}
