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
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function SearchResult({
  url,
  title,
  snippet,
  to,
  href,
  onTitleClick,
  faviconBg = '#1a73e8',
  faviconLetter = 'A',
  children,
  menuItems = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isExternal = !!href && !to;
  const isInternal = !!to;

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const titleClass =
    'block text-[18px] sm:text-[20px] leading-[1.3] font-normal text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer mb-1 text-left';

  return (
    <div className="max-w-[680px] mb-8 min-w-0 overflow-hidden">
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
        <span className="min-w-0 flex-1 text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-snug truncate">
          {url}
        </span>

        {menuItems.length > 0 && (
          <div className="relative ml-auto" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="p-0.5 rounded-full text-[#70757a] dark:text-[#9aa0a6]
                         hover:text-[#202124] dark:hover:text-[#e8eaed]
                         hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
              aria-label="More options"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-max max-w-[220px] rounded-xl
                              bg-white dark:bg-[#303134]
                              border border-[#e8eaed] dark:border-[#5f6368]
                              shadow-[0_4px_16px_rgba(0,0,0,0.15)] overflow-hidden">
                {menuItems.map(({ label, icon, action }) => (
                  <button
                    key={label}
                    onClick={() => {
                      action();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 pl-4 pr-3 py-2.5 text-left whitespace-nowrap
                               text-[13px] text-[#202124] dark:text-[#e8eaed]
                               hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] transition-colors"
                  >
                    {icon && (
                      <svg className="w-4 h-4 text-[#5f6368] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                      </svg>
                    )}
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Title ──────────────────────────────────── */}
      {isInternal && (
        <Link to={to} className={titleClass}>{title}</Link>
      )}
      {isExternal && (
        <a href={href} target="_blank" rel="noopener noreferrer" className={titleClass}>{title}</a>
      )}
      {!isInternal && !isExternal && onTitleClick && (
        <button type="button" onClick={onTitleClick} className={titleClass}>{title}</button>
      )}
      {!isInternal && !isExternal && !onTitleClick && (
        <span className={titleClass}>{title}</span>
      )}

      {/* ── Snippet ────────────────────────────────── */}
      {snippet && (
        <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-[1.58] break-words">
          {snippet}
        </p>
      )}

      {/* ── Extra content (badges, links, etc.) ────── */}
      {children && <div className="mt-2 min-w-0 overflow-hidden">{children}</div>}
    </div>
  );
}
