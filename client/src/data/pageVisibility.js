export const DEFAULT_PAGE_VISIBILITY = Object.freeze({
  blog: true,
  tools: true,
  images: true,
});

/**
 * Returns normalized page visibility from saved site configuration.
 *
 * Precedence for each property (evaluated independently):
 * 1. cfg.pageVisibility[key] if strict boolean
 * 2. cfg[legacyKey] if strict boolean
 * 3. Default: true
 *
 * @param {Object} [cfg] - Site configuration object
 * @returns {{ blog: boolean, tools: boolean, images: boolean }}
 */
export function getPageVisibility(cfg) {
  const pv =
    cfg?.pageVisibility &&
    typeof cfg.pageVisibility === 'object' &&
    !Array.isArray(cfg.pageVisibility)
      ? cfg.pageVisibility
      : null;

  const resolveKey = (canonicalKey, legacyKey) => {
    if (pv && typeof pv[canonicalKey] === 'boolean') {
      return pv[canonicalKey];
    }
    if (cfg && typeof cfg[legacyKey] === 'boolean') {
      return cfg[legacyKey];
    }
    return DEFAULT_PAGE_VISIBILITY[canonicalKey];
  };

  return {
    blog: resolveKey('blog', 'blogPageEnabled'),
    tools: resolveKey('tools', 'toolsPageEnabled'),
    images: resolveKey('images', 'imagesPageEnabled'),
  };
}
