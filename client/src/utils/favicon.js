/**
 * Auto-derives favicon letter and background color from a URL string.
 * Used by SearchResult when faviconBg/faviconLetter are not explicitly passed.
 */

const DOMAIN_MAP = [
  // Exact domain matches — most specific first
  { match: 'github.com',       letter: 'G', color: '#24292e' },
  { match: 'medium.com',       letter: 'M', color: '#00ab6c' },
  { match: 'linkedin.com',     letter: 'L', color: '#0a66c2' },
  { match: 'twitter.com',      letter: 'X', color: '#000000' },
  { match: 'x.com',            letter: 'X', color: '#000000' },
  { match: 'leetcode.com',     letter: 'L', color: '#FFA116' },
  { match: 'codechef.com',     letter: 'C', color: '#5B4638' },
  { match: 'codeforces.com',   letter: 'C', color: '#1F8ACB' },
  { match: 'hackerrank.com',   letter: 'H', color: '#00EA64' },
  { match: 'youtube.com',      letter: 'Y', color: '#FF0000' },
  { match: 'stackoverflow.com',letter: 'S', color: '#F48024' },
  { match: 'npmjs.com',        letter: 'N', color: '#CB3837' },
  { match: 'vercel.com',       letter: 'V', color: '#000000' },
  { match: 'render.com',       letter: 'R', color: '#46E3B7' },
  { match: 'cloudinary.com',   letter: 'C', color: '#3448C5' },
  { match: 'mongodb.com',      letter: 'M', color: '#00ED64' },
  { match: 'drive.google.com', letter: 'D', color: '#4285F4' },
  // Portfolio domain — path-based colors
  { match: 'anuragjaiswal.me/about',    letter: 'A', color: '#4285F4' },
  { match: 'anuragjaiswal.me/projects', letter: 'A', color: '#34A853' },
  { match: 'anuragjaiswal.me/blog',     letter: 'A', color: '#00ab6c' },
  { match: 'anuragjaiswal.me/toolkit',  letter: 'A', color: '#1a73e8' },
  { match: 'anuragjaiswal.me/tools',    letter: 'A', color: '#1a73e8' },
  { match: 'anuragjaiswal.me/contact',  letter: 'A', color: '#EA4335' },
  { match: 'anuragjaiswal.me/images',   letter: 'A', color: '#FBBC05' },
  { match: 'anuragjaiswal.me',          letter: 'A', color: '#4285F4' },
];

/**
 * Returns { letter, color } for a given URL string.
 * Falls back to first letter of domain + blue if no match found.
 */
export function getFaviconProps(url = '') {
  const lower = url.toLowerCase();

  for (const { match, letter, color } of DOMAIN_MAP) {
    if (lower.includes(match)) return { letter, color };
  }

  // Fallback: extract first letter of domain
  const domainMatch = lower.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)/);
  const firstLetter = domainMatch ? domainMatch[1][0].toUpperCase() : 'A';
  return { letter: firstLetter, color: '#1a73e8' };
}
