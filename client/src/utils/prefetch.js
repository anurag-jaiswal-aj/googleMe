/**
 * Background prefetch — fires on app startup so Projects and Blog data
 * is already in cache by the time the user navigates to those pages.
 */

import api, { fetchProjects } from '../api';

const cache = {};

/** Fetch once; subsequent calls return the same promise (deduped). */
function once(key, fetcher) {
  if (!cache[key]) cache[key] = fetcher().catch(() => null);
  return cache[key];
}

export const getProjects = () => once('projects', fetchProjects);
export const getMediumPosts = () => once('medium', () => api.get('/medium').then((r) => r.data));

/** Call this as early as possible (main.jsx). */
export function prefetchAll() {
  getProjects();
  getMediumPosts();
}
