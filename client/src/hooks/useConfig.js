import { useState, useEffect, useRef } from 'react';
import { fetchConfig } from '../api';

// Module-level cache so all hook instances share one fetch
let _cache = null;
let _promise = null;

export function clearConfigCache() {
  _cache = null;
  _promise = null;
}

/**
 * Returns the full site config object from the DB.
 * Falls back to {} if the API is unreachable — callers use their own defaults.
 */
export function useConfig() {
  const [config, setConfig] = useState(_cache ?? {});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (_cache) { setConfig(_cache); return; }

    if (!_promise) {
      _promise = fetchConfig().catch(() => ({}));
    }

    _promise.then(data => {
      _cache = data;
      if (mounted.current) setConfig(data);
    });

    return () => { mounted.current = false; };
  }, []);

  return config;
}
