import { LINKS } from '../config/links.js';

/**
 * Normalises a resume URL for inline viewing in a new tab.
 * - Google Drive share links -> /preview for embedded viewing
 * - Everything else -> as-is
 */
export function inlineResumeUrl(url = '') {
  if (!url) return url;
  // Convert Google Drive share/view/open link to preview
  const driveMatch = url.match(/drive\.google\.com\/(?:file\/d\/([^/?#]+)|(?:open|uc)[/?]?(?:.*?[?&])?id=([^&#]+))/);
  if (driveMatch) {
    const fileId = driveMatch[1] || driveMatch[2];
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  return url;
}

/**
 * Checks whether a candidate resume target is safe to redirect to:
 * - Allowed protocols: http: and https: (or relative path on this origin)
 * - Rejects unsafe schemes (javascript:, data:, vbscript:)
 * - Rejects redirect loops back to /resume on the same origin
 * - Rejects self-redirects if matching the current URL
 */
export function isSafeResumeUrl(target, currentUrl) {
  if (!target || typeof target !== 'string') return false;
  const trimmed = target.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  if (/^(?:javascript|data|vbscript):/i.test(trimmed)) return false;

  try {
    const base = currentUrl || (typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/resume');
    const baseParsed = new URL(base);
    const targetParsed = new URL(trimmed, base);

    // Only allow http: and https: protocols
    if (targetParsed.protocol !== 'http:' && targetParsed.protocol !== 'https:') {
      return false;
    }

    // Guard against identical self-redirect
    if (targetParsed.href === baseParsed.href) {
      return false;
    }

    // Guard against same-origin redirect loop to /resume
    const isSameOrigin = targetParsed.origin.toLowerCase() === baseParsed.origin.toLowerCase();
    const normalizedPath = targetParsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (isSameOrigin && normalizedPath === '/resume') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves the final safe redirect target for /resume.
 * Tries the candidate URL first, then falls back to LINKS.resume,
 * and finally to '/' if all candidates are invalid or cause loops.
 */
export function getSafeResumeUrl(candidateUrl, fallbackUrl = LINKS?.resume, currentUrl) {
  const tryCandidate = (raw) => {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const inlined = inlineResumeUrl(trimmed);
    if (isSafeResumeUrl(inlined, currentUrl)) {
      return inlined;
    }
    return null;
  };

  const candidate = tryCandidate(candidateUrl);
  if (candidate) return candidate;

  const fallback = tryCandidate(fallbackUrl);
  if (fallback) return fallback;

  return '/';
}
