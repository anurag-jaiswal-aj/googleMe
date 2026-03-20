import { useState, useEffect, useRef } from 'react';
import { fetchConfig } from '../api';

// ─── Module-level shared state ────────────────────────────────────────────────
let _cache = null;          // last known good config
let _fetching = false;      // deduplicate in-flight requests
const _subscribers = new Set(); // all mounted hook instances

/** Notify every mounted hook instance with a new config value */
function _broadcast(data) {
  _cache = data;
  _subscribers.forEach(fn => fn(data));
}

/** Fire a background fetch; if the result differs from cache, broadcast it */
function _revalidate() {
  if (_fetching) return;
  _fetching = true;
  fetchConfig()
    .then(data => {
      // Only update if something actually changed
      if (JSON.stringify(data) !== JSON.stringify(_cache)) {
        _broadcast(data);
      }
    })
    .catch(() => { /* keep stale cache on network error */ })
    .finally(() => { _fetching = false; });
}

/**
 * Call this after saving config in Admin.
 * Clears the cache and immediately re-fetches so every mounted component
 * gets the fresh value without a hard refresh.
 */
export function clearConfigCache() {
  _cache = null;
  _revalidate();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Returns the full site config object from the DB.
 * - Serves the cached value immediately (no loading flash on navigation)
 * - Revalidates in the background on every mount
 * - Falls back to {} if the API is unreachable
 */
export function useConfig() {
  const [config, setConfig] = useState(_cache ?? {});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Subscribe so future broadcasts update this instance
    const listener = (data) => { if (mounted.current) setConfig(data); };
    _subscribers.add(listener);

    // Serve stale cache immediately, then revalidate in background
    if (_cache) setConfig(_cache);
    _revalidate();

    return () => {
      mounted.current = false;
      _subscribers.delete(listener);
    };
  }, []);

  return config;
}
