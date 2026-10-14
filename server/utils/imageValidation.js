/**
 * Image signature detection and upload validation for GoogleMe.
 * Enforces magic-byte inspection and MIME-type verification for supported formats.
 */

const MIME_ALIASES = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/png': 'image/png',
  'image/x-png': 'image/png',
  'image/gif': 'image/gif',
  'image/webp': 'image/webp',
};

const SUPPORTED_CANONICAL_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_GALLERY_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Detect image type from raw buffer magic bytes.
 * Returns { format: string, mime: string } or null if unrecognized.
 */
function detectImageSignature(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return null;
  }

  // JPEG: Starts with 0xFF, 0xD8, 0xFF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { format: 'jpeg', mime: 'image/jpeg' };
  }

  // PNG: Starts with 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { format: 'png', mime: 'image/png' };
  }

  // GIF: Starts with GIF87a or GIF89a
  if (buffer.length >= 6) {
    const header = buffer.toString('ascii', 0, 6);
    if (header === 'GIF87a' || header === 'GIF89a') {
      return { format: 'gif', mime: 'image/gif' };
    }
  }

  // WebP: RIFF container with WEBP form type (RIFF????WEBP)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { format: 'webp', mime: 'image/webp' };
  }

  return null;
}

/**
 * Normalizes client-supplied MIME types to canonical strings.
 */
function normalizeImageMime(mimetype) {
  if (!mimetype || typeof mimetype !== 'string') return '';
  const lower = mimetype.toLowerCase().trim();
  return MIME_ALIASES[lower] || lower;
}

/**
 * Validates gallery image uploads against size, MIME, and magic-byte signature constraints.
 */
function validateGalleryImage(file, options = {}) {
  const maxSize = options.maxSizeBytes || MAX_GALLERY_IMAGE_SIZE;

  if (!file) {
    return { valid: false, error: 'Image file is required' };
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return { valid: false, error: 'Image file is empty' };
  }

  if (file.buffer.length > maxSize) {
    return {
      valid: false,
      error: `Image file exceeds maximum size of ${Math.round(maxSize / (1024 * 1024))} MB`,
    };
  }

  const rawMime = (file.mimetype || '').toLowerCase().trim();
  const normalizedMime = normalizeImageMime(rawMime);

  if (!SUPPORTED_CANONICAL_MIMES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported image MIME type: ${file.mimetype || 'unknown'}. Supported formats are JPEG, PNG, GIF, and WebP.`,
    };
  }

  const detected = detectImageSignature(file.buffer);
  if (!detected) {
    return {
      valid: false,
      error: 'Invalid image file content. File signature does not match supported image formats (JPEG, PNG, GIF, WebP).',
    };
  }

  if (detected.mime !== normalizedMime) {
    return {
      valid: false,
      error: `Image MIME type does not match file signature (declared ${file.mimetype}, detected ${detected.mime}).`,
    };
  }

  return {
    valid: true,
    format: detected.format,
    mime: detected.mime,
  };
}

module.exports = {
  detectImageSignature,
  normalizeImageMime,
  validateGalleryImage,
  SUPPORTED_CANONICAL_MIMES,
  MAX_GALLERY_IMAGE_SIZE,
};
