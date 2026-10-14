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
    fd.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

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
  fd1.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

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
  fd2.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

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
  fd.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

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
  fd.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

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
