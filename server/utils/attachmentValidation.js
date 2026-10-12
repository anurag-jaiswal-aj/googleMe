const path = require('path');

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.log'];

const ALLOWED_MIME_TYPES = {
  '.png':  ['image/png'],
  '.jpg':  ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif':  ['image/gif'],
  '.webp': ['image/webp'],
  '.pdf':  ['application/pdf'],
  '.txt':  ['text/plain'],
  '.log':  ['text/plain', 'text/x-log'],
};

function sanitizeAttachmentFilename(rawName, fallbackExt = '') {
  if (typeof rawName !== 'string') {
    rawName = '';
  }
  // Cross-platform basename extraction: split on POSIX (/) and Windows (\) path separators
  // Filter out empty segments and traversal tokens ('.' and '..')
  const segments = rawName.split(/[/\\]/).filter((s) => s && s !== '.' && s !== '..');
  const lastSegment = segments.length > 0 ? segments[segments.length - 1] : '';

  // Remove filesystem-illegal and MIME-unsafe characters (/ \ : * ? " < > | and ASCII control chars)
  let base = lastSegment.replace(/[/\\:*?"<>|\x00-\x1F\x7F]/g, '').trim();

  let ext = path.extname(base).toLowerCase();
  let stem = ext ? base.slice(0, -ext.length) : base;

  // Strip leading dots to prevent hidden files/traversal tokens, and trim trailing dots/spaces
  stem = stem.replace(/^\.+/, '').replace(/[\s.]+$/, '').trim();

  // If stem is empty, fallback to 'attachment'
  if (!stem) {
    stem = 'attachment';
  }

  // Bound length of filename stem to 100 characters
  if (stem.length > 100) {
    stem = stem.slice(0, 100).trim() || 'attachment';
  }

  // If extension is missing but fallbackExt is provided
  if (!ext && fallbackExt) {
    ext = fallbackExt.startsWith('.') ? fallbackExt.toLowerCase() : `.${fallbackExt.toLowerCase()}`;
  }

  return `${stem}${ext}`;
}

function validateAttachmentBuffer(file) {
  if (!file || !file.buffer) return { valid: true };
  const buffer = file.buffer;
  const safeName = sanitizeAttachmentFilename(file.originalname || '');
  const ext = path.extname(safeName).toLowerCase();

  if (buffer.length === 0) {
    return { valid: false, error: 'Attached file is empty' };
  }
  if (buffer.length > 5 * 1024 * 1024) {
    return { valid: false, error: 'Attached file exceeds maximum size of 5 MB' };
  }

  switch (ext) {
    case '.pdf': {
      if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
        return { valid: false, error: 'Invalid PDF content. File does not match expected PDF format.' };
      }
      return { valid: true };
    }
    case '.png': {
      const isPng = buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
      if (!isPng) {
        return { valid: false, error: 'Invalid PNG content. File does not match expected PNG format.' };
      }
      return { valid: true };
    }
    case '.jpg':
    case '.jpeg': {
      const isJpg = buffer.length >= 3 &&
        buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      if (!isJpg) {
        return { valid: false, error: 'Invalid JPEG content. File does not match expected JPEG format.' };
      }
      return { valid: true };
    }
    case '.gif': {
      const sig = buffer.toString('ascii', 0, 6);
      if (buffer.length < 6 || (sig !== 'GIF87a' && sig !== 'GIF89a')) {
        return { valid: false, error: 'Invalid GIF content. File does not match expected GIF format.' };
      }
      return { valid: true };
    }
    case '.webp': {
      if (buffer.length < 12 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
        return { valid: false, error: 'Invalid WebP content. File does not match expected WebP format.' };
      }
      return { valid: true };
    }
    case '.txt':
    case '.log': {
      if (buffer.includes(0)) {
        return { valid: false, error: 'Invalid text file content. Binary data is not allowed.' };
      }
      return { valid: true };
    }
    default:
      return { valid: false, error: 'Unsupported file type.' };
  }
}

module.exports = {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  sanitizeAttachmentFilename,
  validateAttachmentBuffer,
};
