/**
 * Shared CORS configuration for GoogleMe backend.
 * Enforces production/local allowlist, configurable additional origins,
 * and optional scoped preview patterns without trusting arbitrary third-party Vercel subdomains.
 */

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://anuragjaiswal.me',
  'https://www.anuragjaiswal.me',
];

function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  return Array.from(new Set([...DEFAULT_ORIGINS, ...envOrigins]));
}

function getPreviewPattern() {
  const pattern = process.env.VERCEL_PREVIEW_PATTERN || process.env.ALLOWED_PREVIEW_PATTERN;
  if (!pattern) return null;
  try {
    return new RegExp(pattern);
  } catch (err) {
    console.error('[cors] Invalid preview pattern regex in env:', err.message);
    return null;
  }
}

function isOriginAllowed(origin) {
  // Allow requests with no origin (curl, mobile apps, server-to-server)
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  const previewPattern = getPreviewPattern();
  if (previewPattern && previewPattern.test(origin)) return true;

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    // Disallow origin cleanly without triggering a 500 error handler
    callback(null, false);
  },
  credentials: true,
};

module.exports = {
  DEFAULT_ORIGINS,
  getAllowedOrigins,
  getPreviewPattern,
  isOriginAllowed,
  corsOptions,
};
