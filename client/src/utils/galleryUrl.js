/**
 * Safe external URL validation for gallery links.
 *
 * Requirements:
 * 1. Allow only absolute http: and https: protocols.
 * 2. Validate using the WHATWG URL parser without a base URL.
 * 3. Reject embedded URL credentials (username or password).
 * 4. Reject dangerous schemes (javascript:, data:, vbscript:),
 *    protocol-relative URLs (//example.com), malformed URLs,
 *    and relative values such as 'ver'.
 * 5. Canonicalize validated URLs via parsed.href representation.
 * 6. Bound input length to mitigate denial-of-service via huge strings.
 *
 * @param {*} link - Candidate link value
 * @returns {string|null} Canonical safe URL if valid, null otherwise
 */
export function getSafeGalleryLink(link) {
  if (typeof link !== 'string') {
    return null;
  }
  const trimmed = link.trim();
  if (!trimmed || trimmed.length > 2048) {
    return null;
  }
  // Fast rejection of dangerous schemes or protocol-relative slashes
  if (/^(?:javascript|data|vbscript):/i.test(trimmed) || trimmed.startsWith('//')) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    // Reject embedded URL credentials (user:password@host, user@host, :password@host)
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

/**
 * Convenience predicate for checking whether a gallery link is safe.
 *
 * @param {*} link - Candidate link value
 * @returns {boolean} True if link is a valid absolute HTTP or HTTPS URL
 */
export function isSafeGalleryLink(link) {
  return getSafeGalleryLink(link) !== null;
}

export default isSafeGalleryLink;
