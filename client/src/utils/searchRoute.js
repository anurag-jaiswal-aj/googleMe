/**
 * Shared search routing logic used by both Home and SearchLayout.
 * Uses a scored keyword map so the best match wins, not just the first.
 */

const ROUTES = [
  {
    to: '/all',
    keys: ['all', 'everything', 'overview', 'portfolio', 'summary', 'home', 'search'],
    weight: 1,
  },
  {
    to: '/about',
    keys: ['about', 'who', 'bio', 'background', 'info', 'skills', 'education',
           'experience', 'certifications', 'resume', 'cv', 'me', 'anurag'],
    weight: 2,
  },
  {
    to: '/projects',
    keys: ['project', 'projects', 'github', 'work', 'code', 'open source',
           'repos', 'repository', 'app', 'apps', 'built', 'portfolio work'],
    weight: 2,
  },
  {
    to: '/blog',
    keys: ['blog', 'post', 'posts', 'article', 'articles', 'writing',
           'read', 'medium', 'write', 'publication'],
    weight: 2,
  },
  {
    to: '/tools',
    keys: ['tool', 'tools', 'toolkit', 'tech', 'stack', 'technology',
           'technologies', 'framework', 'language', 'languages'],
    weight: 2,
  },
  {
    to: '/images',
    keys: ['image', 'images', 'gallery', 'photo', 'photos', 'picture', 'pictures'],
    weight: 2,
  },
  {
    to: '/contact',
    keys: ['contact', 'email', 'hire', 'message', 'reach', 'connect',
           'talk', 'opportunity', 'collaborate', 'freelance', 'job'],
    weight: 2,
  },
];

/**
 * Checks if a route is enabled according to the visibility map.
 */
export function isRouteVisible(route, visibility) {
  if (!visibility || typeof visibility !== 'object') return true;
  if (route === '/blog') return visibility.blog !== false;
  if (route === '/tools') return visibility.tools !== false;
  if (route === '/images') return visibility.images !== false;
  return true;
}

/**
 * Returns the best matching route for a query string, or null if no match.
 * Scores by: exact word match > partial match, weighted by route priority.
 * If the best matching route is disabled by visibility configuration, resolves to /all.
 */
export function resolveSearchRoute(query, visibility) {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  let best = null;
  let bestScore = 0;

  for (const { to, keys, weight } of ROUTES) {
    for (const key of keys) {
      // Exact word boundary match scores higher than substring match
      const exactMatch = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q);
      const partialMatch = q.includes(key);

      if (exactMatch) {
        const score = weight * 2 + key.length; // longer exact matches score higher
        if (score > bestScore) { bestScore = score; best = to; }
      } else if (partialMatch) {
        const score = weight + key.length * 0.5;
        if (score > bestScore) { bestScore = score; best = to; }
      }
    }
  }

  if (best && !isRouteVisible(best, visibility)) {
    return '/all';
  }

  return best;
}

/**
 * Suggestion labels shown in the search dropdown.
 * Filtered by the current query and active page visibility.
 */
export const SEARCH_SUGGESTIONS = [
  { label: 'About me',              to: '/about'    },
  { label: 'Projects on GitHub',    to: '/projects' },
  { label: 'Blog posts',            to: '/blog'     },
  { label: 'Tech stack & toolkit',  to: '/tools'    },
  { label: 'Contact & hire',        to: '/contact'  },
  { label: 'Gallery & images',      to: '/images'   },
  { label: 'Everything',            to: '/all'      },
];

export function filterSuggestions(query, visibility) {
  const visibleSuggestions = SEARCH_SUGGESTIONS.filter((s) => isRouteVisible(s.to, visibility));
  const q = query.toLowerCase().trim();
  if (!q) return visibleSuggestions;
  return visibleSuggestions.filter((s) => s.label.toLowerCase().includes(q));
}
