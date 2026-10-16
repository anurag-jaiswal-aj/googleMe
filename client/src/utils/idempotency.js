/**
 * Cryptographically secure idempotency key generator (RFC 4122 v4).
 * Prefers crypto.randomUUID() when available with a crypto.getRandomValues() fallback.
 * Strictly avoids non-cryptographic pseudo-random generators (e.g. Math.random).
 */
export function generateIdempotencyKey() {
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof window !== 'undefined' && window.crypto
        ? window.crypto
        : null;

  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // RFC 4122 version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error('Cryptographically secure random values unavailable for idempotency key generation');
}

/**
 * Creates an idempotency key lifecycle manager for form submissions.
 * Generates an RFC 4122 v4 UUID once per logical submission.
 * Preserves the key across retries on error until explicitly cleared on success.
 */
export function createIdempotencyKeyManager() {
  let activeKey = null;

  return {
    getOrCreateKey() {
      if (!activeKey) {
        activeKey = generateIdempotencyKey();
      }
      return activeKey;
    },
    clearKey() {
      activeKey = null;
    },
    getKey() {
      return activeKey;
    },
  };
}
