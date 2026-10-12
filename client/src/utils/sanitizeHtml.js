import DOMPurify from 'dompurify';

/**
 * Configuration options for DOMPurify sanitization.
 * Enforces strict HTML profile while stripping scripts, styles, forms, and embedded frames.
 */
const SANITIZER_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    'style',
    'script',
    'iframe',
    'frame',
    'object',
    'embed',
    'form',
    'input',
    'textarea',
    'select',
    'button',
    'applet',
  ],
  FORBID_ATTR: ['style'],
  ADD_ATTR: ['target', 'rel'],
};

/**
 * Normalizes Medium-specific RSS artifacts:
 * - Rewrites relative Medium paths to absolute URLs
 * - Removes Medium 1x1 tracking pixels and empty image placeholders
 * - Unwraps extraneous section wrappers
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeMediumMarkup(raw) {
  return raw
    .replace(/href="(\/[^"]+)"/g, 'href="https://medium.com$1"')
    .replace(/<img[^>]*src=["']["'][^>]*>/gi, '')
    .replace(/<img(?![^>]*src=["']https?:)[^>]*>/gi, '')
    .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, '')
    .replace(/<img[^>]*\s(?:width|height)=["']1["'][^>]*>/gi, '')
    .replace(/<figure[^>]*>[\s]*<img[^>]*src=["']["'][^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/<figure[^>]*class="[^"]*graf--layoutOutsetLeft[^"]*"[\s\S]*?<\/figure>/gi, '')
    .replace(/<div class="[^"]*section-content[^"]*">/gi, '')
    .replace(/<div class="[^"]*section-inner[^"]*">/gi, '');
}

/**
 * Safely sanitizes untrusted Medium article HTML using DOMPurify.
 *
 * @param {string} rawHtml - Raw HTML content to sanitize
 * @param {object} [customPurify] - Optional DOMPurify instance (used for Node.js test environments)
 * @returns {string} Sanitized, safe HTML string
 */
export function sanitizeMediumHtml(rawHtml = '', customPurify = null) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  const preProcessed = normalizeMediumMarkup(rawHtml);

  const purifier =
    customPurify ||
    (typeof DOMPurify.sanitize === 'function'
      ? DOMPurify
      : typeof window !== 'undefined' && typeof DOMPurify === 'function'
      ? DOMPurify(window)
      : null);

  if (!purifier || typeof purifier.sanitize !== 'function') {
    return '';
  }

  return purifier.sanitize(preProcessed, SANITIZER_CONFIG);
}

export default sanitizeMediumHtml;
