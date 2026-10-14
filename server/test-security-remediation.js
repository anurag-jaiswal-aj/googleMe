/**
 * Targeted regression tests for SEC-01 and SEC-02 security remediations.
 * Tests CORS origin validation and gallery image link URL validation end-to-end.
 */

process.env.JWT_SECRET = 'test-security-secret';

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const {
  DEFAULT_ORIGINS,
  getAllowedOrigins,
  getPreviewPattern,
  isOriginAllowed,
  corsOptions,
} = require('./utils/corsConfig');

const GalleryImage = require('./models/GalleryImage');
const imagesRoutes = require('./routes/images');
const adminAuthRoutes = require('./routes/adminAuth');
const requireAuth = require('./middleware/auth');
const {
  detectImageSignature,
  normalizeImageMime,
  validateGalleryImage,
} = require('./utils/imageValidation');

// Minimal valid sample buffers for each supported image format
const validPngBuffer = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
]);

const validJpegBuffer = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);

const validGifBuffer = Buffer.from(
  'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;',
  'binary'
);

const validWebpBuffer = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([20, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.from([8, 0, 0, 0, 0x9d, 0x01, 0x2a, 1, 0, 1, 0, 0]),
]);

// ── 1. Mock GalleryImage DB for Route Testing ───────────────
const savedImages = new Map();
let createIdCounter = 1;

GalleryImage.create = async (doc) => {
  // Trigger Mongoose schema validation
  const instance = new GalleryImage(doc);
  const validationErr = instance.validateSync();
  if (validationErr) {
    const err = new Error(validationErr.message);
    err.name = 'ValidationError';
    throw err;
  }
  const id = new mongoose.Types.ObjectId().toString();
  const saved = { _id: id, ...doc, createdAt: new Date() };
  savedImages.set(id, saved);
  return saved;
};

GalleryImage.findByIdAndUpdate = async (id, update, options) => {
  const existing = savedImages.get(id);
  if (!existing) return null;

  if (options && options.runValidators) {
    const instance = new GalleryImage({ ...existing, ...update });
    const validationErr = instance.validateSync();
    if (validationErr) {
      const err = new Error(validationErr.message);
      err.name = 'ValidationError';
      throw err;
    }
  }

  const updated = { ...existing, ...update, updatedAt: new Date() };
  savedImages.set(id, updated);
  return updated;
};

// ── 2. Setup Test Express Server ────────────────────────────
const app = express();
app.use(express.json());
app.use(cors(corsOptions));

app.post('/api/test-cors', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/admin', adminAuthRoutes);
app.get('/api/test-protected', requireAuth, (req, res) => {
  res.json({ ok: true, admin: req.admin });
});

app.use('/api/images', imagesRoutes);

const PORT = 5588;
const BASE_URL = `http://localhost:${PORT}/api`;
const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
const authHeaders = { Authorization: `Bearer ${adminToken}` };

let server;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

test.after(() => {
  server.close();
});

// ═════════════════════════════════════════════════════════════
// SEC-01: CORS Origin Validation Tests
// ═════════════════════════════════════════════════════════════

test('SEC-01: Default allowed origins include production and local development hostnames', () => {
  assert.ok(DEFAULT_ORIGINS.includes('http://localhost:3000'));
  assert.ok(DEFAULT_ORIGINS.includes('http://localhost:5173'));
  assert.ok(DEFAULT_ORIGINS.includes('https://anuragjaiswal.me'));
  assert.ok(DEFAULT_ORIGINS.includes('https://www.anuragjaiswal.me'));
});

test('SEC-01: Requests without Origin header are allowed (curl, Postman, mobile apps)', () => {
  assert.strictEqual(isOriginAllowed(undefined), true);
  assert.strictEqual(isOriginAllowed(null), true);
  assert.strictEqual(isOriginAllowed(''), true);
});

test('SEC-01: Default production and local origins are allowed', () => {
  for (const origin of DEFAULT_ORIGINS) {
    assert.strictEqual(isOriginAllowed(origin), true, `Must allow ${origin}`);
  }
});

test('SEC-01: Unrelated and attacker-controlled Vercel subdomains are rejected by default', () => {
  const attackerOrigins = [
    'https://gfolio-attacker.vercel.app',
    'https://googleme-evil.vercel.app',
    'https://google-me-phish.vercel.app',
    'https://googleme-aj-malicious.vercel.app',
    'https://random-user.vercel.app',
    'https://evil.vercel.app',
    'https://googleme-aj.vercel.app.attacker.com',
    'http://anuragjaiswal.me', // Insecure HTTP
    'http://www.anuragjaiswal.me',
    'https://anuragjaiswal.me.attacker.com',
  ];

  for (const origin of attackerOrigins) {
    assert.strictEqual(isOriginAllowed(origin), false, `Must reject ${origin}`);
  }
});

test('SEC-01: Configured ALLOWED_ORIGINS environment variable expands trusted list', () => {
  const origAllowed = process.env.ALLOWED_ORIGINS;
  try {
    process.env.ALLOWED_ORIGINS = 'https://preview-123.vercel.app, https://staging.example.com ';
    const allowed = getAllowedOrigins();
    assert.ok(allowed.includes('https://preview-123.vercel.app'));
    assert.ok(allowed.includes('https://staging.example.com'));
    assert.strictEqual(isOriginAllowed('https://preview-123.vercel.app'), true);
    assert.strictEqual(isOriginAllowed('https://staging.example.com'), true);
    assert.strictEqual(isOriginAllowed('https://untrusted.vercel.app'), false);
  } finally {
    if (origAllowed !== undefined) {
      process.env.ALLOWED_ORIGINS = origAllowed;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  }
});

test('SEC-01: VERCEL_PREVIEW_PATTERN securely matches scoped preview deployments', () => {
  const origPattern = process.env.VERCEL_PREVIEW_PATTERN;
  try {
    // Example: Scoped to team/project prefix
    process.env.VERCEL_PREVIEW_PATTERN = '^https:\\/\\/googleme(?:-[a-z0-9-]+)?-myteam\\.vercel\\.app$';
    assert.strictEqual(isOriginAllowed('https://googleme-myteam.vercel.app'), true);
    assert.strictEqual(isOriginAllowed('https://googleme-feat-123-myteam.vercel.app'), true);
    // Unrelated accounts matching name but not team suffix are rejected
    assert.strictEqual(isOriginAllowed('https://googleme-attacker.vercel.app'), false);
    assert.strictEqual(isOriginAllowed('https://googleme-otherteam.vercel.app'), false);
  } finally {
    if (origPattern !== undefined) {
      process.env.VERCEL_PREVIEW_PATTERN = origPattern;
    } else {
      delete process.env.VERCEL_PREVIEW_PATTERN;
    }
  }
});

test('SEC-01: Malformed regex in VERCEL_PREVIEW_PATTERN fails safe without throwing', () => {
  const origPattern = process.env.VERCEL_PREVIEW_PATTERN;
  try {
    process.env.VERCEL_PREVIEW_PATTERN = '[unclosed-bracket';
    assert.strictEqual(getPreviewPattern(), null);
    assert.strictEqual(isOriginAllowed('https://anything.vercel.app'), false);
  } finally {
    if (origPattern !== undefined) {
      process.env.VERCEL_PREVIEW_PATTERN = origPattern;
    } else {
      delete process.env.VERCEL_PREVIEW_PATTERN;
    }
  }
});

test('SEC-01: HTTP request with allowed origin receives Access-Control-Allow-Origin header', async () => {
  const res = await fetch(`${BASE_URL}/test-cors`, {
    method: 'POST',
    headers: { Origin: 'https://www.anuragjaiswal.me' },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('access-control-allow-origin'), 'https://www.anuragjaiswal.me');
  assert.strictEqual(res.headers.get('access-control-allow-credentials'), 'true');
});

test('SEC-01: HTTP request with disallowed origin does not receive Access-Control-Allow-Origin header', async () => {
  const res = await fetch(`${BASE_URL}/test-cors`, {
    method: 'POST',
    headers: { Origin: 'https://gfolio-attacker.vercel.app' },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('access-control-allow-origin'), null);
});

// ═════════════════════════════════════════════════════════════
// SEC-02: Gallery Image Link Validation Tests
// ═════════════════════════════════════════════════════════════

test('SEC-02: GalleryImage model accepts valid HTTP and HTTPS URLs', () => {
  const validUrls = [
    'https://github.com/anurag-jaiswal-aj/googleMe',
    'http://example.com/project',
    'https://demo.app/sub/path?query=1&b=2#hash',
    '',
    undefined,
  ];

  for (const url of validUrls) {
    const doc = new GalleryImage({
      title: 'Valid Link Test',
      link: url,
    });
    const err = doc.validateSync();
    assert.strictEqual(err, undefined, `Expected "${url}" to pass model validation`);
  }
});

test('SEC-02: GalleryImage model rejects dangerous and invalid URI schemes', () => {
  const dangerousUrls = [
    'javascript:alert(1)',
    'javascript:alert(document.cookie)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'vbscript:msgbox("XSS")',
    '//attacker.com/evil',
    '/relative/path',
    'ftp://files.example.com',
    'file:///etc/passwd',
    'not a url',
    'http://',
    'https://',
  ];

  for (const url of dangerousUrls) {
    const doc = new GalleryImage({
      title: 'Dangerous Link Test',
      link: url,
    });
    const err = doc.validateSync();
    assert.ok(err, `Expected "${url}" to fail model validation`);
    assert.ok(err.errors.link, `Expected validation error on link property for "${url}"`);
  }
});

test('SEC-02: POST /api/images rejects unsafe link with HTTP 400', async () => {
  const unsafeSchemes = [
    'javascript:alert(document.domain)',
    'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
    'vbscript:alert(1)',
    'not-a-valid-url',
  ];

  for (const badLink of unsafeSchemes) {
    const fd = new FormData();
    fd.append('title', 'Unsafe Link Test');
    fd.append('link', badLink);
    fd.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'test.png');

    const res = await fetch(`${BASE_URL}/images`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: fd,
    });

    assert.strictEqual(res.status, 400, `Expected HTTP 400 for link "${badLink}"`);
    const data = await res.json();
    assert.match(data.error, /Invalid link URL|Link must be a valid HTTP or HTTPS URL/);
  }
});

test('SEC-02: POST /api/images accepts valid HTTPS link and empty link', async () => {
  // 1. Valid HTTPS link
  const fd1 = new FormData();
  fd1.append('title', 'Valid HTTPS Image');
  fd1.append('link', 'https://github.com/anurag-jaiswal-aj');
  fd1.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'test.png');

  const res1 = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd1,
  });
  assert.strictEqual(res1.status, 201);
  const data1 = await res1.json();
  assert.strictEqual(data1.link, 'https://github.com/anurag-jaiswal-aj');

  // 2. Empty link (optional link supported)
  const fd2 = new FormData();
  fd2.append('title', 'Empty Link Image');
  fd2.append('link', '');
  fd2.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'test.png');

  const res2 = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd2,
  });
  assert.strictEqual(res2.status, 201);
  const data2 = await res2.json();
  assert.strictEqual(data2.link, '');
});

test('SEC-02: PATCH /api/images/:id rejects unsafe link with HTTP 400', async () => {
  // First create a clean image
  const fd = new FormData();
  fd.append('title', 'Image to Patch');
  fd.append('link', 'https://initial.example.com');
  fd.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'test.png');

  const createRes = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });
  assert.strictEqual(createRes.status, 201);
  const created = await createRes.json();

  // Try updating with dangerous links
  const dangerousUpdates = [
    'javascript:alert(1)',
    'data:text/html,evil',
    'vbscript:msgbox(1)',
    'malformed-url',
  ];

  for (const badLink of dangerousUpdates) {
    const res = await fetch(`${BASE_URL}/images/${created._id}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ link: badLink }),
    });

    assert.strictEqual(res.status, 400, `Expected HTTP 400 for PATCH link "${badLink}"`);
    const data = await res.json();
    assert.match(data.error, /Invalid link URL|Link must be a valid HTTP or HTTPS URL/);
  }

  // Confirm original link remained intact
  const current = savedImages.get(created._id);
  assert.strictEqual(current.link, 'https://initial.example.com');
});

test('SEC-02: PATCH /api/images/:id accepts valid HTTPS update and empty link', async () => {
  // Create an image
  const fd = new FormData();
  fd.append('title', 'Image to Update Cleanly');
  fd.append('link', 'https://old.example.com');
  fd.append('image', new Blob([validPngBuffer], { type: 'image/png' }), 'test.png');

  const createRes = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });
  const created = await createRes.json();

  // 1. Update to new valid HTTPS URL
  const res1 = await fetch(`${BASE_URL}/images/${created._id}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ link: 'https://new.example.com/project' }),
  });
  assert.strictEqual(res1.status, 200);
  const data1 = await res1.json();
  assert.strictEqual(data1.link, 'https://new.example.com/project');

  // 2. Update to empty string (clear link)
  const res2 = await fetch(`${BASE_URL}/images/${created._id}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ link: '' }),
  });
  assert.strictEqual(res2.status, 200);
  const data2 = await res2.json();
  assert.strictEqual(data2.link, '');

  // 3. Update without link property preserves existing link
  const res3 = await fetch(`${BASE_URL}/images/${created._id}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Title Only Update' }),
  });
  assert.strictEqual(res3.status, 200);
  const data3 = await res3.json();
  assert.strictEqual(data3.title, 'Title Only Update');
  assert.strictEqual(data3.link, '');
});

// ═════════════════════════════════════════════════════════════
// SEC-03: Gallery Upload File Signature & Magic-Byte Tests
// ═════════════════════════════════════════════════════════════

test('SEC-03: detectImageSignature identifies valid JPEG, PNG, GIF, and WebP buffers', () => {
  assert.deepStrictEqual(detectImageSignature(validJpegBuffer), { format: 'jpeg', mime: 'image/jpeg' });
  assert.deepStrictEqual(detectImageSignature(validPngBuffer), { format: 'png', mime: 'image/png' });
  assert.deepStrictEqual(detectImageSignature(validGifBuffer), { format: 'gif', mime: 'image/gif' });
  assert.deepStrictEqual(detectImageSignature(validWebpBuffer), { format: 'webp', mime: 'image/webp' });
});

test('SEC-03: detectImageSignature rejects text, HTML, SVG, and corrupted buffers', () => {
  assert.strictEqual(detectImageSignature(Buffer.from('not an image')), null);
  assert.strictEqual(detectImageSignature(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null);
  assert.strictEqual(detectImageSignature(Buffer.from('<html><body>hello</body></html>')), null);
  assert.strictEqual(detectImageSignature(Buffer.from([0x00, 0x01, 0x02])), null);
  assert.strictEqual(detectImageSignature(Buffer.alloc(0)), null);
  assert.strictEqual(detectImageSignature(null), null);
});

test('SEC-03: validateGalleryImage helper enforces magic bytes and rejects mismatches', () => {
  // Valid cases
  assert.strictEqual(validateGalleryImage({ buffer: validPngBuffer, mimetype: 'image/png' }).valid, true);
  assert.strictEqual(validateGalleryImage({ buffer: validJpegBuffer, mimetype: 'image/jpeg' }).valid, true);
  assert.strictEqual(validateGalleryImage({ buffer: validJpegBuffer, mimetype: 'image/jpg' }).valid, true);
  assert.strictEqual(validateGalleryImage({ buffer: validGifBuffer, mimetype: 'image/gif' }).valid, true);
  assert.strictEqual(validateGalleryImage({ buffer: validWebpBuffer, mimetype: 'image/webp' }).valid, true);

  // Missing file / empty buffer
  assert.strictEqual(validateGalleryImage(null).valid, false);
  assert.strictEqual(validateGalleryImage({ buffer: Buffer.alloc(0), mimetype: 'image/png' }).valid, false);

  // Unsupported MIME type
  const badMime = validateGalleryImage({ buffer: validPngBuffer, mimetype: 'image/svg+xml' });
  assert.strictEqual(badMime.valid, false);
  assert.match(badMime.error, /Unsupported image MIME type/);

  // Malformed / invalid image bytes
  const badContent = validateGalleryImage({ buffer: Buffer.from('plain text'), mimetype: 'image/png' });
  assert.strictEqual(badContent.valid, false);
  assert.match(badContent.error, /File signature does not match supported image formats/);

  // MIME / signature mismatch (declared JPEG, actual PNG)
  const mismatch = validateGalleryImage({ buffer: validPngBuffer, mimetype: 'image/jpeg' });
  assert.strictEqual(mismatch.valid, false);
  assert.match(mismatch.error, /Image MIME type does not match file signature/);
});

test('SEC-03: POST /api/images accepts all supported image formats with matching signatures', async () => {
  const supportedCases = [
    { format: 'jpeg', mime: 'image/jpeg', buffer: validJpegBuffer, filename: 'test.jpg' },
    { format: 'png', mime: 'image/png', buffer: validPngBuffer, filename: 'test.png' },
    { format: 'gif', mime: 'image/gif', buffer: validGifBuffer, filename: 'test.gif' },
    { format: 'webp', mime: 'image/webp', buffer: validWebpBuffer, filename: 'test.webp' },
  ];

  for (const item of supportedCases) {
    const fd = new FormData();
    fd.append('title', `Valid ${item.format.toUpperCase()} Upload`);
    fd.append('category', 'UI Work');
    fd.append('image', new Blob([item.buffer], { type: item.mime }), item.filename);

    const res = await fetch(`${BASE_URL}/images`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: fd,
    });

    assert.strictEqual(res.status, 201, `Expected HTTP 201 for valid ${item.format} upload`);
    const data = await res.json();
    assert.strictEqual(data.title, `Valid ${item.format.toUpperCase()} Upload`);
    assert.ok(data.imageUrl.startsWith(`data:${item.mime};base64,`));
  }
});

test('SEC-03: POST /api/images rejects invalid image bytes with HTTP 400', async () => {
  const fd = new FormData();
  fd.append('title', 'Corrupted Image Upload');
  fd.append('image', new Blob([Buffer.from('not an actual image')], { type: 'image/png' }), 'corrupted.png');

  const res = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /File signature does not match supported image formats/);
});

test('SEC-03: POST /api/images rejects empty file with HTTP 400', async () => {
  const fd = new FormData();
  fd.append('title', 'Empty Image File');
  fd.append('image', new Blob([Buffer.alloc(0)], { type: 'image/jpeg' }), 'empty.jpg');

  const res = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Image file is empty/);
});

test('SEC-03: POST /api/images rejects MIME and signature mismatches with HTTP 400', async () => {
  const mismatchCases = [
    { declaredMime: 'image/png', actualBuffer: validJpegBuffer, label: 'Declared PNG with JPEG bytes' },
    { declaredMime: 'image/jpeg', actualBuffer: validPngBuffer, label: 'Declared JPEG with PNG bytes' },
    { declaredMime: 'image/gif', actualBuffer: validWebpBuffer, label: 'Declared GIF with WebP bytes' },
  ];

  for (const item of mismatchCases) {
    const fd = new FormData();
    fd.append('title', item.label);
    fd.append('image', new Blob([item.actualBuffer], { type: item.declaredMime }), 'mismatch.bin');

    const res = await fetch(`${BASE_URL}/images`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: fd,
    });

    assert.strictEqual(res.status, 400, `Expected HTTP 400 for ${item.label}`);
    const data = await res.json();
    assert.match(data.error, /Image MIME type does not match file signature/);
  }
});

test('SEC-03: POST /api/images rejects unsupported image formats (e.g. SVG) with HTTP 400', async () => {
  const fd = new FormData();
  fd.append('title', 'SVG Script Upload Attempt');
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  fd.append('image', new Blob([Buffer.from(svgContent)], { type: 'image/svg+xml' }), 'vector.svg');

  const res = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Unsupported image MIME type/);
});

// ═════════════════════════════════════════════════════════════
// SEC-04: JWT HS256 Algorithm Enforcement Tests
// ═════════════════════════════════════════════════════════════

test('SEC-04: Valid HS256 token is accepted by protected endpoints and /verify', async () => {
  const validToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS256' });

  // 1. /api/admin/verify
  const verifyRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${validToken}` },
  });
  assert.strictEqual(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.valid, true);

  // 2. Protected route with requireAuth middleware
  const routeRes = await fetch(`${BASE_URL}/test-protected`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${validToken}` },
  });
  assert.strictEqual(routeRes.status, 200);
  const routeData = await routeRes.json();
  assert.strictEqual(routeData.ok, true);
  assert.strictEqual(routeData.admin.role, 'admin');
});

test('SEC-04: Token with algorithm "none" is rejected with HTTP 401', async () => {
  // Construct token with alg: none
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'admin' })).toString('base64url');
  const noneToken = `${header}.${payload}.`;

  const verifyRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${noneToken}` },
  });
  assert.strictEqual(verifyRes.status, 401);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.valid, false);

  const routeRes = await fetch(`${BASE_URL}/test-protected`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${noneToken}` },
  });
  assert.strictEqual(routeRes.status, 401);
  const routeData = await routeRes.json();
  assert.strictEqual(routeData.error, 'Invalid or expired token');
});

test('SEC-04: Tokens signed with incompatible algorithms (HS384, HS512) are rejected with HTTP 401', async () => {
  const tokenHS384 = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS384' });
  const tokenHS512 = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS512' });

  for (const token of [tokenHS384, tokenHS512]) {
    const verifyRes = await fetch(`${BASE_URL}/admin/verify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(verifyRes.status, 401);

    const routeRes = await fetch(`${BASE_URL}/test-protected`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(routeRes.status, 401);
    const routeData = await routeRes.json();
    assert.strictEqual(routeData.error, 'Invalid or expired token');
  }
});

test('SEC-04: Token signed with wrong secret is rejected with HTTP 401', async () => {
  const wrongSecretToken = jwt.sign({ role: 'admin' }, 'different-secret-key', { algorithm: 'HS256' });

  const verifyRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${wrongSecretToken}` },
  });
  assert.strictEqual(verifyRes.status, 401);

  const routeRes = await fetch(`${BASE_URL}/test-protected`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${wrongSecretToken}` },
  });
  assert.strictEqual(routeRes.status, 401);
});

test('SEC-04: Expired HS256 token is rejected with HTTP 401', async () => {
  const expiredToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '-1s' });

  const verifyRes = await fetch(`${BASE_URL}/admin/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.strictEqual(verifyRes.status, 401);

  const routeRes = await fetch(`${BASE_URL}/test-protected`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${expiredToken}` },
  });
  assert.strictEqual(routeRes.status, 401);
});

test('SEC-04: Malformed and missing tokens are rejected with HTTP 401', async () => {
  const badTokens = [
    'not.a.jwt',
    'random-string',
    '',
  ];

  for (const token of badTokens) {
    const routeRes = await fetch(`${BASE_URL}/test-protected`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    assert.strictEqual(routeRes.status, 401);
  }
});
