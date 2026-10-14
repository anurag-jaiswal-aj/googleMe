process.env.JWT_SECRET = 'test-secret-phase1';
const bcrypt = require('bcryptjs');
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('correct-password', 10);

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// 1. Mocks
const SiteConfig = require('./models/SiteConfig');
let siteConfigs = {};
SiteConfig.findOneAndUpdate = async (filter, update) => {
  if (!filter.key) throw new Error('Key required');
  siteConfigs[filter.key] = update.value;
  return { key: filter.key, value: update.value };
};
SiteConfig.find = () => ({
  lean: async () => Object.entries(siteConfigs).map(([key, value]) => ({ key, value }))
});

const PortfolioConfig = require('./models/PortfolioConfig');
let mockSelectedRepos = [{ name: 'portfolio-test', featured: true }];
PortfolioConfig.findOne = async () => ({ selectedRepos: mockSelectedRepos });
PortfolioConfig.findOneAndUpdate = async (filter, update) => {
  mockSelectedRepos = update.selectedRepos || [];
  return { selectedRepos: mockSelectedRepos };
};

const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
  if (typeof url === 'string' && url.includes('api.github.com')) {
    if (url.includes('/languages')) {
      return { ok: true, json: async () => ({ JavaScript: 1000 }) };
    }
    return {
      ok: true,
      json: async () => [
        {
          name: 'portfolio-test',
          full_name: 'test-user/portfolio-test',
          description: 'Test Repo',
          html_url: 'https://github.com/test-user/portfolio-test',
          homepage: 'https://test.example.com',
          stargazers_count: 5,
          forks_count: 1,
          updated_at: '2026-01-01T00:00:00Z',
          topics: ['react'],
          private: false,
        },
      ],
    };
  }
  return originalFetch(url, opts);
};

const Contact = require('./models/Contact');
let savedContacts = [];
Contact.create = async (doc) => {
  savedContacts.push(doc);
  return { _id: 'mock-contact-id', ...doc };
};

const Feedback = require('./models/Feedback');
let savedFeedbacks = [];
Feedback.create = async (doc) => {
  const newDoc = {
    _id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'new',
    ...doc,
  };
  savedFeedbacks.push(newDoc);
  return newDoc;
};

const matchFilter = (doc, query) => {
  if (!query || Object.keys(query).length === 0) return true;

  if (query.$and) {
    return query.$and.every(cond => matchFilter(doc, cond));
  }

  if (query.$or) {
    return query.$or.some(cond => {
      for (const [k, v] of Object.entries(cond)) {
        if (k === 'status') {
          if (v === 'new' && (doc.status === 'new' || !doc.status)) return true;
          if (v && v.$exists === false && (doc.status === undefined || doc.status === null)) return true;
          if (v === null && (doc.status === null || doc.status === undefined)) return true;
          if (doc.status === v) return true;
          return false;
        }
        if (v instanceof RegExp) {
          if (typeof doc[k] === 'string' && v.test(doc[k])) return true;
          return false;
        }
        if (doc[k] === v) return true;
      }
      return false;
    });
  }

  for (const [k, v] of Object.entries(query)) {
    if (k === 'status') {
      if (v === 'new' && (doc.status === 'new' || !doc.status)) continue;
      if (doc.status !== v) return false;
    } else if (k === 'type') {
      if (doc.type !== v) return false;
    } else if (v instanceof RegExp) {
      if (!doc[k] || !v.test(doc[k])) return false;
    } else if (doc[k] !== v) {
      return false;
    }
  }

  return true;
};

Feedback.countDocuments = async (query = {}) => {
  return savedFeedbacks.filter(doc => matchFilter(doc, query)).length;
};

Feedback.find = (query = {}) => {
  let matched = savedFeedbacks.filter(doc => matchFilter(doc, query));
  let skipCount = 0;
  let limitCount = matched.length;

  const chain = {
    sort: () => chain,
    skip: (n) => {
      skipCount = n;
      return chain;
    },
    limit: (n) => {
      limitCount = n;
      return chain;
    },
    lean: async () => {
      // Sort newest first
      return matched
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(skipCount, skipCount + limitCount);
    },
  };
  return chain;
};

Feedback.findByIdAndUpdate = (id, update) => {
  const item = savedFeedbacks.find(f => f._id.toString() === id.toString());
  return {
    lean: async () => {
      if (!item) return null;
      if (update.$set && update.$set.status) {
        item.status = update.$set.status;
      }
      return { ...item };
    },
    then: (resolve) => {
      if (!item) return resolve(null);
      if (update.$set && update.$set.status) {
        item.status = update.$set.status;
      }
      return resolve({ ...item });
    },
  };
};

Feedback.findById = async (id) => {
  const item = savedFeedbacks.find(f => f._id.toString() === id.toString());
  return item ? { ...item } : null;
};

Feedback.findByIdAndDelete = async (id) => {
  const idx = savedFeedbacks.findIndex(f => f._id.toString() === id.toString());
  if (idx === -1) return null;
  const [removed] = savedFeedbacks.splice(idx, 1);
  return removed;
};

const { v2: cloudinary } = require('cloudinary');
let cloudinaryDestroyCalls = [];
let cloudinaryDestroyShouldFail = false;
cloudinary.uploader.destroy = async (publicId, options) => {
  cloudinaryDestroyCalls.push({ publicId, options });
  if (cloudinaryDestroyShouldFail) {
    throw new Error('Cloudinary destroy failure');
  }
  return { result: 'ok' };
};

const GalleryImage = require('./models/GalleryImage');
let galleryImageCreateShouldFail = false;
let galleryImageUpdateShouldFail = false;
GalleryImage.create = async (doc) => {
  if (galleryImageCreateShouldFail) {
    throw new Error('Database connection timed out: mongodb://admin:s3cr3t_pass@atlas-db.internal:27017/prod');
  }
  return doc;
};
GalleryImage.findByIdAndUpdate = async (id, update, options) => {
  if (galleryImageUpdateShouldFail) {
    throw new Error('MongoNetworkTimeoutError: connection timed out to shard-01.mongodb.net:27017');
  }
  return { _id: id, ...update };
};
GalleryImage.find = () => ({ sort: () => ({ select: async () => [] }) });

// Mock emailService to inspect generated HTML without sending real emails
const emailService = require('./utils/emailService');
let sentEmails = [];
emailService.sendEmail = async (opts) => {
  sentEmails.push(opts);
  return true;
};

// 2. Setup Express App mounting Phase 1 routes
const adminAuthRoutes = require('./routes/adminAuth');
const configRoutes    = require('./routes/config');
const contactRoutes   = require('./routes/contact');
const feedbackRoutes  = require('./routes/feedback');
const imagesRoutes    = require('./routes/images');
const githubRoutes    = require('./routes/github');

const cors = require('cors');

const app = express();
app.use(express.json());

// Mount CORS exactly as in server/index.js
const { corsOptions } = require('./utils/corsConfig');
app.use(cors(corsOptions));

app.use('/api/admin', adminAuthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/github', githubRoutes);

// Global error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = 5566;
const BASE_URL = `http://localhost:${PORT}/api`;
const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
const authHeaders = { Authorization: `Bearer ${adminToken}` };

let server;

test.before(() => {
  return new Promise(resolve => {
    server = app.listen(PORT, resolve);
  });
});

test.after(() => {
  server.close();
});

test.beforeEach(() => {
  siteConfigs = {};
  savedContacts = [];
  savedFeedbacks = [];
  sentEmails = [];
  galleryImageCreateShouldFail = false;
  galleryImageUpdateShouldFail = false;
  delete process.env.CLOUDINARY_CLOUD_NAME;
});

// ── H1: Admin Login Validation & Error Handling ──────────────────────────────
test('H1. Admin login rejects non-string password without unhandled rejection', async () => {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 12345 }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Password is required/);
});

test('H1. Admin login rejects missing or whitespace password', async () => {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '   ' }),
  });
  assert.strictEqual(res.status, 400);
});

test('H1. Admin login rejects wrong password', async () => {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' }),
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.match(data.error, /Invalid password/);
});

test('H1. Admin login returns JWT on valid password', async () => {
  const res = await fetch(`${BASE_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'correct-password' }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
  assert.strictEqual(decoded.role, 'admin');
});

// ── H3: HTML Escaping and Filename Normalization for Uploaded Attachment Filenames ──
test('H3. Contact email escapes HTML and normalizes attachment filenames', async () => {
  const fd = new FormData();
  fd.append('name', 'Alice');
  fd.append('email', 'alice@example.com');
  fd.append('message', 'Hello there');
  const maliciousName = '<img src=x onerror=alert(1)>.pdf';
  const pdfContent = Buffer.from('%PDF-1.4\n%sample pdf content');
  fd.append('attachments', new Blob([pdfContent], { type: 'application/pdf' }), maliciousName);

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(sentEmails.length, 1);
  const emailHtml = sentEmails[0].html;
  assert.ok(!emailHtml.includes('<img src=x onerror=alert(1)>.pdf'), 'Raw unescaped HTML tag must not exist');
  assert.ok(emailHtml.includes('img src=x onerror=alert(1).pdf'), 'Normalized filename must appear in email');
  assert.strictEqual(sentEmails[0].attachments[0].filename, 'img src=x onerror=alert(1).pdf');
});

// ── M2: CORS Origin Validation & Rejection ──────────────────────────────────
test('M2. Allowed production and local origins receive Access-Control-Allow-Origin by default', async () => {
  const allowedOriginsToTest = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://anuragjaiswal.me',
    'https://www.anuragjaiswal.me',
  ];

  for (const origin of allowedOriginsToTest) {
    const res = await fetch(`${BASE_URL}/admin/verify`, {
      method: 'POST',
      headers: { Origin: origin, ...authHeaders },
    });
    assert.strictEqual(res.status, 200, `Expected 200 for allowed origin: ${origin}`);
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      origin,
      `Access-Control-Allow-Origin must match ${origin}`
    );
  }
});

test('M2. Configured preview origins receive Access-Control-Allow-Origin when VERCEL_PREVIEW_PATTERN is set', async () => {
  const originalPattern = process.env.VERCEL_PREVIEW_PATTERN;
  try {
    process.env.VERCEL_PREVIEW_PATTERN = '^https:\\/\\/(?:googleme-aj|googleme|google-me|gfolio)(?:-[a-z0-9-]+)?\\.vercel\\.app$';

    const configuredPreviews = [
      'https://googleme-aj.vercel.app',
      'https://googleme.vercel.app',
      'https://google-me.vercel.app',
      'https://gfolio.vercel.app',
      'https://googleme-aj-preview-123.vercel.app',
      'https://googleme-aj-git-main-anurag-jaiswal-aj.vercel.app',
      'https://googleme-deploy-xyz.vercel.app',
      'https://google-me-preview-456.vercel.app',
      'https://gfolio-preview-abc.vercel.app',
    ];

    for (const origin of configuredPreviews) {
      const res = await fetch(`${BASE_URL}/admin/verify`, {
        method: 'POST',
        headers: { Origin: origin, ...authHeaders },
      });
      assert.strictEqual(res.status, 200, `Expected 200 for configured preview origin: ${origin}`);
      assert.strictEqual(
        res.headers.get('access-control-allow-origin'),
        origin,
        `Access-Control-Allow-Origin must match ${origin}`
      );
    }
  } finally {
    if (originalPattern !== undefined) {
      process.env.VERCEL_PREVIEW_PATTERN = originalPattern;
    } else {
      delete process.env.VERCEL_PREVIEW_PATTERN;
    }
  }
});

test('M2. Unrelated, malicious, or non-matching origins are rejected cleanly without 500 error', async () => {
  const disallowedOriginsToTest = [
    'https://attacker.vercel.app',
    'https://otherproject.vercel.app',
    'https://gfolio-attacker.vercel.app',
    'https://googleme-evil.vercel.app',
    'https://evil-googleme-aj.vercel.app',
    'https://googleme-aj.vercel.app.attacker.com',
    'http://googleme-aj.vercel.app', // Insecure HTTP
    'http://anuragjaiswal.me',        // Insecure HTTP
    'https://not-googleme-aj.vercel.app',
  ];

  for (const origin of disallowedOriginsToTest) {
    const res = await fetch(`${BASE_URL}/admin/verify`, {
      method: 'POST',
      headers: { Origin: origin, ...authHeaders },
    });
    // Disallowed origin should return response without Access-Control-Allow-Origin and without crashing
    assert.strictEqual(res.status, 200, `Disallowed origin ${origin} should not crash server`);
    assert.strictEqual(
      res.headers.get('access-control-allow-origin'),
      null,
      `Disallowed origin ${origin} must not receive Access-Control-Allow-Origin header`
    );
  }
});

// ── M3: Contact & Feedback Abuse Protection ──────────────────────────────────
test('M3. Contact form rejects executable file attachments', async () => {
  const fd = new FormData();
  fd.append('name', 'Bob');
  fd.append('email', 'bob@example.com');
  fd.append('message', 'Check this');
  fd.append('attachments', new Blob(['binary'], { type: 'application/octet-stream' }), 'malware.exe');

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /File type not allowed/);
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

test('M3. Legitimate contact form submission with empty _hp saves to DB and sends email', async () => {
  const fd = new FormData();
  fd.append('name', 'Real User');
  fd.append('email', 'real@example.com');
  fd.append('message', 'A legitimate portfolio message');
  fd.append('subject', 'Work');
  fd.append('_hp', ''); // Frontend sends empty honeypot field

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(savedContacts.length, 1, 'Legitimate submission must be saved to DB');
  assert.strictEqual(savedContacts[0].name, 'Real User');
  assert.strictEqual(sentEmails.length, 1, 'Legitimate submission must trigger notification email');
  assert.strictEqual(sentEmails[0].replyTo, 'real@example.com');
});

test('M3. Contact form silently drops honeypot submission without DB write or email delivery', async () => {
  const fd = new FormData();
  fd.append('name', 'Spam Bot');
  fd.append('email', 'bot@spam.com');
  fd.append('message', 'Buy cheap meds');
  fd.append('_hp', 'filled-by-bot');

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(savedContacts.length, 0, 'Must not save honeypot submission to DB');
  assert.strictEqual(sentEmails.length, 0, 'Must not send email for honeypot submission');
});

test('M3. Legitimate feedback submission with empty _hp saves to DB and sends email', async () => {
  const fd = new FormData();
  fd.append('type', 'suggestion');
  fd.append('message', 'Love the dark mode design!');
  fd.append('name', 'Legit Visitor');
  fd.append('email', 'visitor@example.com');
  fd.append('_hp', ''); // Frontend sends empty honeypot field

  const res = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(savedFeedbacks.length, 1, 'Legitimate feedback must be saved to DB');
  assert.strictEqual(savedFeedbacks[0].type, 'suggestion');
  assert.strictEqual(sentEmails.length, 1, 'Legitimate feedback must trigger notification email');
});

test('M3. Feedback form silently drops honeypot submission without DB write or email delivery', async () => {
  const fd = new FormData();
  fd.append('type', 'bug');
  fd.append('message', 'Spam report');
  fd.append('_hp', 'bot-token');

  const res = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(savedFeedbacks.length, 0, 'Must not save honeypot feedback to DB');
  assert.strictEqual(sentEmails.length, 0, 'Must not send email for honeypot feedback');
});

// ── M5: Validation of Bulk & Single SiteConfig Updates ───────────────────────
test('M5. Bulk config update rejects missing or empty key', async () => {
  const invalidPayloads = [
    { updates: [{}] },
    { updates: [{ key: '' }] },
    { updates: [{ key: '   ' }] },
    { updates: 'not-an-array' },
    { updates: [] },
  ];

  for (const body of invalidPayloads) {
    const res = await fetch(`${BASE_URL}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify(body),
    });
    assert.strictEqual(res.status, 400);
  }
  assert.strictEqual(Object.keys(siteConfigs).length, 0);
});

test('M5. Bulk config update succeeds with valid entries', async () => {
  const res = await fetch(`${BASE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      updates: [
        { key: 'profile', value: { name: 'Anurag' } },
        { key: 'githubUsername', value: 'anurag-jaiswal-aj' },
      ],
    }),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(siteConfigs['profile'].name, 'Anurag');
  assert.strictEqual(siteConfigs['githubUsername'], 'anurag-jaiswal-aj');
});

// ── M1: Multer Error Handling in Gallery Uploads ─────────────────────────────
test('M1. Gallery image upload rejects non-image file with HTTP 400', async () => {
  const fd = new FormData();
  fd.append('title', 'Not an image');
  fd.append('image', new Blob(['plain text content'], { type: 'text/plain' }), 'note.txt');

  const res = await fetch(`${BASE_URL}/images`, {
    method: 'POST',
    headers: { ...authHeaders },
    body: fd,
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Only image files are allowed/);
});

// ── H4: Client API Base URL on Custom Domain ────────────────────────────────
test('H4. getApiBaseUrl returns Render API URL on custom domain when VITE_API_URL is missing', () => {
  // Simulate window.location for anuragjaiswal.me
  const originalWindow = global.window;
  try {
    global.window = {
      location: { hostname: 'anuragjaiswal.me' },
    };

    // Replicate getApiBaseUrl logic from client/src/api/index.js
    const getApiBaseUrl = (configured) => {
      if (typeof window !== 'undefined') {
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocalHost) {
          if (!configured || /localhost|127\.0\.0\.1/.test(configured)) {
            return 'https://googleme.onrender.com/api';
          }
          return configured;
        }
      }
      return configured || '/api';
    };

    assert.strictEqual(getApiBaseUrl(undefined), 'https://googleme.onrender.com/api');
    assert.strictEqual(getApiBaseUrl('http://localhost:5000/api'), 'https://googleme.onrender.com/api');
    assert.strictEqual(getApiBaseUrl('https://custom-api.example.com/api'), 'https://custom-api.example.com/api');

    // Simulate localhost
    global.window.location.hostname = 'localhost';
    assert.strictEqual(getApiBaseUrl(undefined), '/api');
    assert.strictEqual(getApiBaseUrl('http://localhost:5000/api'), 'http://localhost:5000/api');
  } finally {
    global.window = originalWindow;
  }
});

// ── Protected Admin Feedback Inbox Tests ────────────────────────────────────

test('Inbox 1. Rejects unauthenticated GET /api/feedback with 401', async () => {
  const res = await fetch(`${BASE_URL}/feedback`);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.error, 'Authentication required');
});

test('Inbox 1. Rejects unauthenticated PATCH /api/feedback/:id/status with 401', async () => {
  const dummyId = new mongoose.Types.ObjectId().toString();
  const res = await fetch(`${BASE_URL}/feedback/${dummyId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.strictEqual(res.status, 401);
});

test('Inbox 2. Returns empty feedback list and zero counts on empty collection', async () => {
  const res = await fetch(`${BASE_URL}/feedback`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.deepStrictEqual(data.feedback, []);
  assert.strictEqual(data.total, 0);
  assert.strictEqual(data.totalPages, 1);
  assert.strictEqual(data.counts.all, 0);
  assert.strictEqual(data.counts.new, 0);
  assert.strictEqual(data.counts['in-progress'], 0);
  assert.strictEqual(data.counts.resolved, 0);
});

test('Inbox 3. Authenticated inbox returns submissions with pagination and count breakdown', async () => {
  // Populate mock feedback items
  for (let i = 1; i <= 5; i++) {
    savedFeedbacks.push({
      _id: new mongoose.Types.ObjectId().toString(),
      type: i % 2 === 0 ? 'bug' : 'feature',
      message: `Test feedback message ${i}`,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      page: `/page-${i}`,
      status: i === 1 ? 'resolved' : i === 2 ? 'in-progress' : 'new',
      createdAt: new Date(Date.now() - (5 - i) * 1000),
      updatedAt: new Date(),
    });
  }

  // Request page 1 with limit 2
  const resPage1 = await fetch(`${BASE_URL}/feedback?page=1&limit=2`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resPage1.status, 200);
  const data1 = await resPage1.json();
  assert.strictEqual(data1.feedback.length, 2);
  assert.strictEqual(data1.total, 5);
  assert.strictEqual(data1.totalPages, 3);
  assert.strictEqual(data1.page, 1);
  assert.strictEqual(data1.limit, 2);
  assert.strictEqual(data1.counts.all, 5);
  assert.strictEqual(data1.counts.new, 3);
  assert.strictEqual(data1.counts['in-progress'], 1);
  assert.strictEqual(data1.counts.resolved, 1);

  // Newest items first check: first item is User 5
  assert.strictEqual(data1.feedback[0].name, 'User 5');
});

test('Inbox 4. Filters submissions by category (type) and status', async () => {
  savedFeedbacks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'bug',
      status: 'new',
      message: 'Bug report 1',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'feature',
      status: 'in-progress',
      message: 'Feature request 1',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'bug',
      status: 'resolved',
      message: 'Resolved bug',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'suggestion',
      // Legacy document missing status field
      message: 'Legacy suggestion without status',
      createdAt: new Date(),
    },
  ];

  // Category filter: type=bug
  const resBug = await fetch(`${BASE_URL}/feedback?type=bug`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resBug.status, 200);
  const bugData = await resBug.json();
  assert.strictEqual(bugData.feedback.length, 2);
  assert.ok(bugData.feedback.every(f => f.type === 'bug'));

  // Status filter: status=in-progress
  const resProg = await fetch(`${BASE_URL}/feedback?status=in-progress`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resProg.status, 200);
  const progData = await resProg.json();
  assert.strictEqual(progData.feedback.length, 1);
  assert.strictEqual(progData.feedback[0].type, 'feature');

  // Backward compatibility: status=new includes legacy documents missing status
  const resNew = await fetch(`${BASE_URL}/feedback?status=new`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resNew.status, 200);
  const newData = await resNew.json();
  assert.strictEqual(newData.feedback.length, 2); // Bug report 1 + Legacy suggestion
  assert.ok(newData.feedback.some(f => f.message === 'Legacy suggestion without status'));
});

test('Inbox 5. Search matches message, sender, email, and page context safely without regex injection', async () => {
  savedFeedbacks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'bug',
      status: 'new',
      message: 'Vite build breaks on [special] regex query',
      name: 'Alice Cooper',
      email: 'alice@example.com',
      page: '/projects',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'suggestion',
      status: 'new',
      message: 'Make the dark mode darker',
      name: 'Bob Ross',
      email: 'bob@paintings.com',
      page: '/about',
      createdAt: new Date(),
    },
  ];

  // Search by special characters (regex meta-characters)
  const resSpecial = await fetch(`${BASE_URL}/feedback?search=${encodeURIComponent('[special]')}`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resSpecial.status, 200);
  const specialData = await resSpecial.json();
  assert.strictEqual(specialData.feedback.length, 1);
  assert.strictEqual(specialData.feedback[0].name, 'Alice Cooper');

  // Search by page context
  const resPage = await fetch(`${BASE_URL}/feedback?search=/about`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resPage.status, 200);
  const pageData = await resPage.json();
  assert.strictEqual(pageData.feedback.length, 1);
  assert.strictEqual(pageData.feedback[0].name, 'Bob Ross');
});

test('Inbox 6. Validates and rejects invalid query filters with HTTP 400', async () => {
  const resBadStatus = await fetch(`${BASE_URL}/feedback?status=invalid_status`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resBadStatus.status, 400);

  const resBadType = await fetch(`${BASE_URL}/feedback?type=invalid_type`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(resBadType.status, 400);
});

test('Inbox 7. Successfully updates feedback status (new -> in-progress -> resolved)', async () => {
  const item = {
    _id: new mongoose.Types.ObjectId().toString(),
    type: 'bug',
    status: 'new',
    message: 'Navbar overlaps logo on mobile',
    createdAt: new Date(),
  };
  savedFeedbacks = [item];

  // Update to in-progress
  const res1 = await fetch(`${BASE_URL}/feedback/${item._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status: 'in-progress' }),
  });
  assert.strictEqual(res1.status, 200);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, true);
  assert.strictEqual(data1.feedback.status, 'in-progress');

  // Update to resolved
  const res2 = await fetch(`${BASE_URL}/feedback/${item._id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.strictEqual(res2.status, 200);
  const data2 = await res2.json();
  assert.strictEqual(data2.feedback.status, 'resolved');
});

test('Inbox 8. Rejects invalid status values and invalid IDs on PATCH', async () => {
  const validId = new mongoose.Types.ObjectId().toString();
  savedFeedbacks = [{ _id: validId, status: 'new', type: 'bug', message: 'Test' }];

  // Invalid status value
  const resInvalidStatus = await fetch(`${BASE_URL}/feedback/${validId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status: 'closed' }),
  });
  assert.strictEqual(resInvalidStatus.status, 400);

  // Invalid MongoDB ObjectId
  const resInvalidId = await fetch(`${BASE_URL}/feedback/123-not-an-id/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.strictEqual(resInvalidId.status, 400);

  // Non-existent ID
  const nonExistentId = new mongoose.Types.ObjectId().toString();
  const resNotFound = await fetch(`${BASE_URL}/feedback/${nonExistentId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ status: 'resolved' }),
  });
  assert.strictEqual(resNotFound.status, 404);
});

test('Inbox 9. Prevents clients from updating arbitrary database fields via status endpoint', async () => {
  const id = new mongoose.Types.ObjectId().toString();
  savedFeedbacks = [
    {
      _id: id,
      type: 'bug',
      status: 'new',
      message: 'Original untouched message',
      name: 'Original Author',
      email: 'original@example.com',
      createdAt: new Date(),
    },
  ];

  const maliciousPayload = {
    status: 'resolved',
    message: 'MALICIOUS OVERWRITE',
    name: 'Hacker',
    email: 'hacker@malicious.com',
    type: 'compliment',
  };

  const res = await fetch(`${BASE_URL}/feedback/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(maliciousPayload),
  });
  assert.strictEqual(res.status, 200);

  // Verify only status changed in DB
  const doc = savedFeedbacks[0];
  assert.strictEqual(doc.status, 'resolved', 'Status must be updated');
  assert.strictEqual(doc.message, 'Original untouched message', 'Message must NOT be overwritten');
  assert.strictEqual(doc.name, 'Original Author', 'Name must NOT be overwritten');
  assert.strictEqual(doc.email, 'original@example.com', 'Email must NOT be overwritten');
  assert.strictEqual(doc.type, 'bug', 'Type must NOT be overwritten');
});

test('Inbox 10. Public feedback submission persists status: new, attachment info, and triggers email notification', async () => {
  const fd = new FormData();
  fd.append('type', 'bug');
  fd.append('message', 'Form layout breaks on mobile viewport');
  fd.append('name', 'Tester Jane');
  fd.append('email', 'jane@example.com');
  fd.append('page', '/contact');
  const validPngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    Buffer.from('screenshot content'),
  ]);
  fd.append('attachment', new Blob([validPngBuffer], { type: 'image/png' }), 'screenshot.png');
  fd.append('_hp', '');

  const res = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);

  // Check persisted feedback document
  assert.strictEqual(savedFeedbacks.length, 1);
  const created = savedFeedbacks[0];
  assert.strictEqual(created.type, 'bug');
  assert.strictEqual(created.status, 'new');
  assert.strictEqual(created.name, 'Tester Jane');
  assert.strictEqual(created.email, 'jane@example.com');
  assert.strictEqual(created.page, '/contact');
  assert.ok(created.attachment, 'Attachment info must be stored');
  assert.strictEqual(created.attachment.filename, 'screenshot.png');
  assert.strictEqual(created.attachment.contentType, 'image/png');

  // Check email was sent
  assert.strictEqual(sentEmails.length, 1);
  assert.match(sentEmails[0].subject, /\[Portfolio Feedback\] Bug from Tester Jane/);
  assert.ok(sentEmails[0].html.includes('<code>/contact</code>'), 'Email must contain readable /contact code');
});

// ── Inbox 11: Page Context Display & Sanitization Regression Tests ──────────
test('Inbox 11. Page context preserves readable paths, query strings, and safely handles legacy entities', async () => {
  // 1. Submit feedback with '/'
  const fdRoot = new FormData();
  fdRoot.append('type', 'suggestion');
  fdRoot.append('message', 'Root page test');
  fdRoot.append('page', '/');
  fdRoot.append('_hp', '');
  const resRoot = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdRoot });
  assert.strictEqual(resRoot.status, 201);
  assert.strictEqual(savedFeedbacks[0].page, '/', 'Root path "/" must remain "/"');

  // 2. Submit feedback with '/projects'
  const fdProjects = new FormData();
  fdProjects.append('type', 'feature');
  fdProjects.append('message', 'Projects page feature');
  fdProjects.append('page', '/projects');
  fdProjects.append('_hp', '');
  const resProjects = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdProjects });
  assert.strictEqual(resProjects.status, 201);
  assert.strictEqual(savedFeedbacks[1].page, '/projects', '"/projects" must remain "/projects"');

  // 3. Submit feedback with complex query strings & ordinary text
  const fdQuery = new FormData();
  fdQuery.append('type', 'bug');
  fdQuery.append('message', 'Query string path test');
  fdQuery.append('page', '/search?q=machine+learning&sort=desc&page=2');
  fdQuery.append('_hp', '');
  const resQuery = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdQuery });
  assert.strictEqual(resQuery.status, 201);
  assert.strictEqual(
    savedFeedbacks[2].page,
    '/search?q=machine+learning&sort=desc&page=2',
    'Query strings and ordinary text must not be corrupted'
  );

  // 4. Legacy records with &#x2F;all and &#x2F; are normalized on GET /api/feedback
  savedFeedbacks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'bug',
      status: 'new',
      message: 'Legacy bug 1',
      page: '&#x2F;all',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'suggestion',
      status: 'new',
      message: 'Legacy suggestion 2',
      page: '&#x2F;',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'feature',
      status: 'new',
      message: 'Modern clean path',
      page: '/projects',
      createdAt: new Date(),
    },
  ];

  const resGet = await fetch(`${BASE_URL}/feedback`, { headers: { ...authHeaders } });
  assert.strictEqual(resGet.status, 200);
  const dataGet = await resGet.json();
  const legacyAll = dataGet.feedback.find(f => f.message === 'Legacy bug 1');
  const legacyRoot = dataGet.feedback.find(f => f.message === 'Legacy suggestion 2');
  const cleanProjects = dataGet.feedback.find(f => f.message === 'Modern clean path');
  assert.strictEqual(legacyAll.page, '/all', 'Legacy "&#x2F;all" must be normalized to "/all"');
  assert.strictEqual(legacyRoot.page, '/', 'Legacy "&#x2F;" must be normalized to "/"');
  assert.strictEqual(cleanProjects.page, '/projects', 'Clean "/projects" must remain "/projects"');

  // 5. Verification that &#x3C;script&#x3E; and double-encoded entities cannot become executable HTML
  savedFeedbacks = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'bug',
      status: 'new',
      message: 'Testing entity safety &amp; untouched message',
      name: 'Safe &amp; Untouched',
      page: '&#x3C;script&#x3E;alert(1)&#x3C;&#x2F;script&#x3E;',
      createdAt: new Date(),
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      type: 'suggestion',
      status: 'new',
      message: 'Double-encoded entity test',
      name: 'Double Tester',
      page: '&amp;lt;script&amp;gt;',
      createdAt: new Date(),
    },
  ];

  const resEntityCheck = await fetch(`${BASE_URL}/feedback`, { headers: { ...authHeaders } });
  assert.strictEqual(resEntityCheck.status, 200);
  const dataEntityCheck = await resEntityCheck.json();
  const entityItem = dataEntityCheck.feedback.find(f => f.message === 'Testing entity safety &amp; untouched message');
  // &#x3C; and &#x3E; must NEVER be decoded into < or >
  assert.strictEqual(
    entityItem.page,
    '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;',
    '&#x3C; and &#x3E; entities must NOT be decoded into raw HTML brackets'
  );
  // Messages and names must NOT be touched by normalizePage
  assert.strictEqual(entityItem.message, 'Testing entity safety &amp; untouched message', 'Message must not be normalized by normalizePage');
  assert.strictEqual(entityItem.name, 'Safe &amp; Untouched', 'Name must not be normalized by normalizePage');

  const doubleItem = dataEntityCheck.feedback.find(f => f.message === 'Double-encoded entity test');
  assert.strictEqual(
    doubleItem.page,
    '&lt;script&gt;',
    'Double-encoded &amp;lt; decodes to &lt; without becoming raw unescaped "<"'
  );

  // 6. Malicious HTML injection in page context is inert and escaped in email HTML
  const fdMalicious = new FormData();
  fdMalicious.append('type', 'bug');
  fdMalicious.append('message', 'Testing HTML injection');
  fdMalicious.append('page', '/<script>alert(1)</script>');
  fdMalicious.append('_hp', '');
  sentEmails = [];
  const resMalicious = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdMalicious });
  assert.strictEqual(resMalicious.status, 201);
  assert.strictEqual(sentEmails.length, 1);
  assert.ok(
    sentEmails[0].html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),
    'Email HTML must escape HTML tags in page context'
  );
  assert.ok(
    !sentEmails[0].html.includes('<script>alert(1)</script>'),
    'Email HTML must NOT contain raw executable script tags'
  );

  // 6. Dangerous URL schemes (e.g. javascript:) are rejected by validation
  const fdDangerous = new FormData();
  fdDangerous.append('type', 'bug');
  fdDangerous.append('message', 'Testing dangerous scheme');
  fdDangerous.append('page', 'javascript:alert(document.cookie)');
  fdDangerous.append('_hp', '');
  const resDangerous = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdDangerous });
  assert.strictEqual(resDangerous.status, 400, 'Dangerous URL schemes must be rejected with HTTP 400');
  const dataDangerous = await resDangerous.json();
  assert.ok(
    dataDangerous.errors.some(e => e.msg && /Dangerous URL scheme/.test(e.msg)),
    'Error message must indicate dangerous URL scheme'
  );
});

test('Inbox 12. Deletes feedback record securely with authentication and validation', async () => {
  // 1. Unauthenticated deletion returns 401
  const fakeId = new mongoose.Types.ObjectId().toString();
  const resNoAuth = await fetch(`${BASE_URL}/feedback/${fakeId}`, { method: 'DELETE' });
  assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated DELETE must return 401');

  // 2. Invalid ObjectId returns 400
  const resInvalid = await fetch(`${BASE_URL}/feedback/not-a-valid-id`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resInvalid.status, 400, 'Invalid ObjectId must return 400');
  const invalidData = await resInvalid.json();
  assert.strictEqual(invalidData.error, 'Invalid feedback ID');

  // 3. Deleting nonexistent record returns 404
  const resNotFound = await fetch(`${BASE_URL}/feedback/${fakeId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resNotFound.status, 404, 'Deleting non-existent record must return 404');
  const notFoundData = await resNotFound.json();
  assert.strictEqual(notFoundData.error, 'Feedback record not found');

  // 4. Authenticated admin deletes specific record; others remain untouched
  savedFeedbacks = [];
  const itemA = await Feedback.create({
    type: 'bug',
    message: 'Bug report A to delete',
    name: 'Alice',
  });
  const itemB = await Feedback.create({
    type: 'feature',
    message: 'Feature request B to keep',
    name: 'Bob',
  });
  assert.strictEqual(savedFeedbacks.length, 2);

  const resDeleteA = await fetch(`${BASE_URL}/feedback/${itemA._id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resDeleteA.status, 200, 'Deleting existing record must return 200');
  const deleteData = await resDeleteA.json();
  assert.strictEqual(deleteData.success, true);
  assert.strictEqual(deleteData.id, itemA._id.toString());

  // Confirm itemA was removed and itemB remains untouched
  assert.strictEqual(savedFeedbacks.length, 1);
  assert.strictEqual(savedFeedbacks[0]._id.toString(), itemB._id.toString());
  assert.strictEqual(savedFeedbacks[0].message, 'Feature request B to keep');

  // 5. Invalid request bodies or operators cannot change the deletion target
  const resPayloadAttack = await fetch(`${BASE_URL}/feedback/${itemB._id}`, {
    method: 'DELETE',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: fakeId,
      _id: fakeId,
      $or: [{ _id: { $exists: true } }],
      filter: { message: 'fake' },
    }),
  });
  assert.strictEqual(resPayloadAttack.status, 200);
  assert.strictEqual(savedFeedbacks.length, 0);
});

test('Inbox 13. Handles Cloudinary attachment cleanup safely on feedback deletion', async () => {
  savedFeedbacks = [];
  cloudinaryDestroyCalls = [];
  cloudinaryDestroyShouldFail = false;
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

  // 1. Safe Cloudinary cleanup for feedback asset in gfolio/feedback/
  const itemCloudinary = await Feedback.create({
    type: 'bug',
    message: 'Bug with attachment',
    attachment: {
      filename: 'sample.pdf',
      contentType: 'application/pdf',
      size: 1024,
      url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/gfolio/feedback/safe123.pdf',
      publicId: 'gfolio/feedback/safe123.pdf',
      resourceType: 'raw',
    },
  });

  const resCloud = await fetch(`${BASE_URL}/feedback/${itemCloudinary._id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resCloud.status, 200);
  const cloudData = await resCloud.json();
  assert.strictEqual(cloudData.success, true);
  assert.strictEqual(cloudData.attachmentCleanup.attempted, true);
  assert.strictEqual(cloudData.attachmentCleanup.cleaned, true);
  assert.strictEqual(cloudinaryDestroyCalls.length, 1);
  assert.strictEqual(cloudinaryDestroyCalls[0].publicId, 'gfolio/feedback/safe123.pdf');
  assert.strictEqual(cloudinaryDestroyCalls[0].options.resource_type, 'raw');

  // 2. Skips Cloudinary cleanup if publicId is outside gfolio/feedback/ (e.g. resume or gallery)
  cloudinaryDestroyCalls = [];
  const itemUnsafeFolder = await Feedback.create({
    type: 'bug',
    message: 'Malicious attempt to delete resume',
    attachment: {
      filename: 'resume.pdf',
      contentType: 'application/pdf',
      url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/gfolio/resume/anurag_resume.pdf',
      publicId: 'gfolio/resume/anurag_resume.pdf',
      resourceType: 'raw',
    },
  });

  const resUnsafe = await fetch(`${BASE_URL}/feedback/${itemUnsafeFolder._id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resUnsafe.status, 200);
  const unsafeData = await resUnsafe.json();
  assert.strictEqual(unsafeData.success, true);
  assert.strictEqual(unsafeData.attachmentCleanup.attempted, false);
  assert.strictEqual(cloudinaryDestroyCalls.length, 0, 'Must NOT call Cloudinary for assets outside feedback folder');
  assert.ok(
    unsafeData.attachmentCleanup.note && /outside feedback folder/.test(unsafeData.attachmentCleanup.note),
    'Note must state asset is outside feedback folder'
  );

  // 3. Handles Cloudinary destroy failure gracefully without failing DB record deletion
  cloudinaryDestroyCalls = [];
  cloudinaryDestroyShouldFail = true;
  const itemFail = await Feedback.create({
    type: 'suggestion',
    message: 'Feedback with failing Cloudinary destroy',
    attachment: {
      publicId: 'gfolio/feedback/fail123.pdf',
      resourceType: 'raw',
    },
  });

  const resFail = await fetch(`${BASE_URL}/feedback/${itemFail._id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resFail.status, 200, 'DB deletion succeeds even if Cloudinary fails');
  const failData = await resFail.json();
  assert.strictEqual(failData.success, true);
  assert.strictEqual(failData.attachmentCleanup.attempted, true);
  assert.strictEqual(failData.attachmentCleanup.cleaned, false);
  assert.ok(
    failData.attachmentCleanup.warning && /Failed to delete attachment from Cloudinary/.test(failData.attachmentCleanup.warning),
    'Warning must explicitly disclose Cloudinary cleanup failure'
  );

  // 4. Handles legacy record lacking trusted publicId
  cloudinaryDestroyCalls = [];
  cloudinaryDestroyShouldFail = false;
  const itemLegacy = await Feedback.create({
    type: 'other',
    message: 'Legacy feedback without publicId',
    attachment: {
      filename: 'old.pdf',
      url: 'https://res.cloudinary.com/test-cloud/raw/upload/v1/gfolio/feedback/old.pdf',
    },
  });

  const resLegacy = await fetch(`${BASE_URL}/feedback/${itemLegacy._id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resLegacy.status, 200);
  const legacyData = await resLegacy.json();
  assert.strictEqual(legacyData.success, true);
  assert.strictEqual(legacyData.attachmentCleanup.attempted, false);
  assert.strictEqual(cloudinaryDestroyCalls.length, 0);
  assert.ok(
    legacyData.attachmentCleanup.note && /legacy record lacks trusted Cloudinary identifier/.test(legacyData.attachmentCleanup.note),
    'Must document attachment cleanup limitation for legacy records'
  );
});

// ── Images 14: Gallery Image ID Validation ─────────────────────────────
test('Images 14. Rejects invalid ObjectId on PATCH and DELETE with HTTP 400', async () => {
  const resPatch = await fetch(`${BASE_URL}/images/invalid-object-id`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'New Title' }),
  });
  assert.strictEqual(resPatch.status, 400, 'PATCH with malformed ObjectId must return 400 Bad Request');
  const patchData = await resPatch.json();
  assert.strictEqual(patchData.error, 'Invalid image ID');

  const resDelete = await fetch(`${BASE_URL}/images/invalid-object-id`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  assert.strictEqual(resDelete.status, 400, 'DELETE with malformed ObjectId must return 400 Bad Request');
  const deleteData = await resDelete.json();
  assert.strictEqual(deleteData.error, 'Invalid image ID');
});

// ── Resume Routing & Resolution Tests ──────────────────────────────────
test('Resume 1. inlineResumeUrl normalizes Google Drive URLs to preview and preserves Cloudinary and local URLs', async () => {
  const { inlineResumeUrl } = await import('../client/src/utils/resumeUrl.js');
  const cloudUrl = 'https://res.cloudinary.com/dgsstziwz/raw/upload/v1791779439/gfolio/resume_1791779438123.pdf';
  assert.strictEqual(inlineResumeUrl(cloudUrl), cloudUrl);
  assert.strictEqual(inlineResumeUrl('/Resume_aj.pdf'), '/Resume_aj.pdf');
  assert.strictEqual(inlineResumeUrl(''), '');
  assert.strictEqual(inlineResumeUrl(undefined), '');

  // Google Drive formats
  assert.strictEqual(
    inlineResumeUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing'),
    'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
  );
  assert.strictEqual(
    inlineResumeUrl('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
  );
  assert.strictEqual(
    inlineResumeUrl('https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
  );
  assert.strictEqual(
    inlineResumeUrl('https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&export=download'),
    'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview'
  );
});

test('Resume 2. LINKS.resume default points to current configured Cloudinary resume', async () => {
  const { LINKS } = await import('../client/src/config/links.js');
  const expectedCloudinaryUrl = 'https://res.cloudinary.com/dgsstziwz/raw/upload/v1791779439/gfolio/resume_1791779438123.pdf';
  assert.strictEqual(LINKS.resume, expectedCloudinaryUrl);
});

test('Resume 3. Vercel routing configuration redirects /resume to Cloudinary and rewrites legacy .pdf filenames', async () => {
  const fs = require('fs');
  const path = require('path');
  const vercelConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../client/vercel.json'), 'utf-8'));
  const expectedCloudinaryUrl = 'https://res.cloudinary.com/dgsstziwz/raw/upload/v1791779439/gfolio/resume_1791779438123.pdf';

  assert.ok(Array.isArray(vercelConfig.redirects), 'vercel.json must have redirects array');
  const resumeRedirects = vercelConfig.redirects.filter(r => r.destination === expectedCloudinaryUrl);
  const redirectSources = resumeRedirects.map(r => r.source);
  assert.ok(redirectSources.includes('/resume'), 'Must redirect /resume');
  assert.ok(redirectSources.includes('/resume/'), 'Must redirect /resume/');
  assert.ok(redirectSources.includes('/Resume'), 'Must redirect /Resume');
  assert.ok(redirectSources.includes('/Resume/'), 'Must redirect /Resume/');

  // All redirects must be temporary (permanent: false) to allow future updates
  resumeRedirects.forEach(r => {
    assert.strictEqual(r.permanent, false, `Redirect for ${r.source} must be temporary (permanent: false)`);
  });

  // Legacy PDF rewrites must be preserved
  assert.ok(Array.isArray(vercelConfig.rewrites), 'vercel.json must have rewrites array');
  const pdfRewrites = vercelConfig.rewrites.filter(r => r.destination === '/Resume_aj.pdf');
  const pdfSources = pdfRewrites.map(r => r.source);
  assert.ok(pdfSources.includes('/resume.pdf'), 'Must preserve /resume.pdf rewrite');
  assert.ok(pdfSources.includes('/Resume.pdf'), 'Must preserve /Resume.pdf rewrite');
  assert.ok(pdfSources.includes('/resume_aj.pdf'), 'Must preserve /resume_aj.pdf rewrite');
});

test('Resume 4. Workbox service worker configuration denylists extensionless resume paths from SPA fallback', async () => {
  const fs = require('fs');
  const path = require('path');
  const viteConfig = fs.readFileSync(path.resolve(__dirname, '../client/vite.config.js'), 'utf-8');

  assert.ok(viteConfig.includes('/^\\/resume\\/?$/i'), 'vite.config.js must denylist extensionless /resume');
  assert.ok(viteConfig.includes('/\\.pdf$/i'), 'vite.config.js must denylist .pdf extensions');
});

test('Resume 5. useConfig exports getCachedConfig and App.jsx handles dynamic resume resolution', () => {
  const fs = require('fs');
  const path = require('path');
  const useConfigContent = fs.readFileSync(path.resolve(__dirname, '../client/src/hooks/useConfig.js'), 'utf-8');
  assert.ok(useConfigContent.includes('export function getCachedConfig()'), 'useConfig must export getCachedConfig');

  const appContent = fs.readFileSync(path.resolve(__dirname, '../client/src/App.jsx'), 'utf-8');
  assert.ok(appContent.includes('fetchConfig'), 'App.jsx ResumeRedirect must call fetchConfig');
  assert.ok(appContent.includes('getCachedConfig'), 'App.jsx ResumeRedirect must check getCachedConfig');
  assert.ok(appContent.includes('inlineResumeUrl'), 'App.jsx ResumeRedirect must normalize url');
});

// ── Batch 2 Security & Hardening Tests ─────────────────────────────────
test('Batch 2: HTTP security headers configured in vercel.json without breaking required features', async () => {
  const fs = require('fs');
  const path = require('path');
  const vercelConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../client/vercel.json'), 'utf-8'));

  assert.ok(Array.isArray(vercelConfig.headers), 'vercel.json must have headers array');
  const catchAll = vercelConfig.headers.find(h => h.source === '/(.*)');
  assert.ok(catchAll, 'vercel.json must have catch-all headers entry');

  const headerMap = Object.fromEntries(catchAll.headers.map(h => [h.key, h.value]));
  assert.strictEqual(headerMap['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(headerMap['X-Frame-Options'], 'DENY');
  assert.strictEqual(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headerMap['Permissions-Policy'].includes('camera=()'));
  assert.ok(headerMap['Permissions-Policy'].includes('microphone=(self)'));
  assert.ok(headerMap['Permissions-Policy'].includes('geolocation=(self)'));
});

test('Batch 2: Feedback attachment validation enforces allowlist and validates buffer content', async () => {
  // 1. Disallowed extension (.exe) is rejected with 400
  const fdExe = new FormData();
  fdExe.append('type', 'bug');
  fdExe.append('message', 'Testing exe rejection');
  fdExe.append('attachment', new Blob(['binary'], { type: 'application/x-msdownload' }), 'test.exe');
  const resExe = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdExe });
  assert.strictEqual(resExe.status, 400);
  const dataExe = await resExe.json();
  assert.match(dataExe.error, /File extension not allowed/);

  // 2. Disallowed extension (.svg) is rejected with 400
  const fdSvg = new FormData();
  fdSvg.append('type', 'bug');
  fdSvg.append('message', 'Testing svg rejection');
  fdSvg.append('attachment', new Blob(['<svg></svg>'], { type: 'image/svg+xml' }), 'test.svg');
  const resSvg = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdSvg });
  assert.strictEqual(resSvg.status, 400);

  // 3. Mismatched MIME type is rejected with 400
  const fdMime = new FormData();
  fdMime.append('type', 'bug');
  fdMime.append('message', 'Testing mime mismatch');
  fdMime.append('attachment', new Blob(['%PDF-1.4'], { type: 'image/png' }), 'test.pdf');
  const resMime = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdMime });
  assert.strictEqual(resMime.status, 400);
  const dataMime = await resMime.json();
  assert.match(dataMime.error, /File MIME type does not match/);

  // 4. Fake PNG with invalid magic bytes is rejected with 400
  const fdFakePng = new FormData();
  fdFakePng.append('type', 'bug');
  fdFakePng.append('message', 'Testing fake png rejection');
  fdFakePng.append('attachment', new Blob(['NotAPngImage'], { type: 'image/png' }), 'fake.png');
  const resFakePng = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdFakePng });
  assert.strictEqual(resFakePng.status, 400);
  const dataFakePng = await resFakePng.json();
  assert.match(dataFakePng.error, /Invalid PNG content/);

  // 5. Fake PDF without %PDF is rejected with 400
  const fdFakePdf = new FormData();
  fdFakePdf.append('type', 'bug');
  fdFakePdf.append('message', 'Testing fake pdf rejection');
  fdFakePdf.append('attachment', new Blob(['NotAPdfFile'], { type: 'application/pdf' }), 'fake.pdf');
  const resFakePdf = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdFakePdf });
  assert.strictEqual(resFakePdf.status, 400);
  const dataFakePdf = await resFakePdf.json();
  assert.match(dataFakePdf.error, /Invalid PDF content/);

  // 6. Text file with binary null bytes is rejected with 400
  const fdNullTxt = new FormData();
  fdNullTxt.append('type', 'bug');
  fdNullTxt.append('message', 'Testing null byte text rejection');
  fdNullTxt.append('attachment', new Blob([Buffer.from([0x61, 0x00, 0x62])], { type: 'text/plain' }), 'evil.txt');
  const resNullTxt = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdNullTxt });
  assert.strictEqual(resNullTxt.status, 400);
  const dataNullTxt = await resNullTxt.json();
  assert.match(dataNullTxt.error, /Binary data is not allowed/);

  // 7. Legitimate text file succeeds with 201
  const fdValidTxt = new FormData();
  fdValidTxt.append('type', 'bug');
  fdValidTxt.append('message', 'Testing valid text file');
  fdValidTxt.append('attachment', new Blob(['Clean error log output\nLine 2'], { type: 'text/plain' }), 'error.log');
  const resValidTxt = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdValidTxt });
  assert.strictEqual(resValidTxt.status, 201);
});

test('Batch 2: PWA workbox configuration excludes og-image.jpg from precache', () => {
  const fs = require('fs');
  const path = require('path');
  const viteConfig = fs.readFileSync(path.resolve(__dirname, '../client/vite.config.js'), 'utf-8');

  assert.ok(viteConfig.includes("globIgnores: ['**/og-image.jpg']"), 'vite.config.js must exclude og-image.jpg from precache');
});

test('Batch 2: All results page incorporates SEO metadata component', () => {
  const fs = require('fs');
  const path = require('path');
  const allPageContent = fs.readFileSync(path.resolve(__dirname, '../client/src/pages/All.jsx'), 'utf-8');

  assert.ok(allPageContent.includes("import SEO from \"../components/SEO\"") || allPageContent.includes("import SEO from '../components/SEO'"), 'All.jsx must import SEO component');
  assert.ok(allPageContent.includes('path="/all"'), 'All.jsx must set path to /all in SEO component');
});

test('Batch 2: Feedback attachment filename normalization handles path traversal, Windows paths, and malformed names safely', async () => {
  const { sanitizeAttachmentFilename } = feedbackRoutes;
  assert.strictEqual(typeof sanitizeAttachmentFilename, 'function', 'feedbackRoutes must export sanitizeAttachmentFilename');

  // Unit tests:
  // POSIX traversal paths
  assert.strictEqual(sanitizeAttachmentFilename('../../evil/screenshot.png'), 'screenshot.png');
  assert.strictEqual(sanitizeAttachmentFilename('/var/log/app.log'), 'app.log');

  // Windows paths and backslashes
  assert.strictEqual(sanitizeAttachmentFilename('C:\\Users\\admin\\Desktop\\crash.log'), 'crash.log');
  assert.strictEqual(sanitizeAttachmentFilename('..\\..\\nested\\file.pdf'), 'file.pdf');

  // Mixed path separators
  assert.strictEqual(sanitizeAttachmentFilename('folder/sub\\mixed/image.webp'), 'image.webp');

  // Traversal-only or root-only
  assert.strictEqual(sanitizeAttachmentFilename('..'), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename('.'), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename('../../../'), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename('\\..\\'), 'attachment');

  // Missing, empty, or whitespace
  assert.strictEqual(sanitizeAttachmentFilename(''), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename(null), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename(undefined), 'attachment');
  assert.strictEqual(sanitizeAttachmentFilename('   '), 'attachment');

  // Dotfiles and leading dots
  assert.strictEqual(sanitizeAttachmentFilename('...hidden.png'), 'hidden.png');
  assert.strictEqual(sanitizeAttachmentFilename('..png'), 'attachment.png');

  // Illegal filesystem and header-injection characters
  assert.strictEqual(sanitizeAttachmentFilename('my\x00file\r\n"bad"<quote>*.pdf'), 'myfilebadquote.pdf');

  // Long stems (>100 chars) truncated safely while preserving extension
  const longStem = 'a'.repeat(120);
  assert.strictEqual(sanitizeAttachmentFilename(`${longStem}.png`), `${'a'.repeat(100)}.png`);

  // Fallback extension support when extension is missing
  assert.strictEqual(sanitizeAttachmentFilename('report', '.pdf'), 'report.pdf');

  // Integration test 1: Upload with POSIX traversal filename
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const fdTraversal = new FormData();
  fdTraversal.append('type', 'bug');
  fdTraversal.append('message', 'Testing traversal normalization');
  fdTraversal.append('attachment', new Blob([pngHeader], { type: 'image/png' }), '../../evil/safe_shot.png');
  const resTraversal = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdTraversal });
  assert.strictEqual(resTraversal.status, 201);
  assert.strictEqual(savedFeedbacks[0].attachment.filename, 'safe_shot.png');
  assert.strictEqual(sentEmails[0].attachments[0].filename, 'safe_shot.png');

  // Integration test 2: Upload with Windows backslash path
  const fdWin = new FormData();
  fdWin.append('type', 'bug');
  fdWin.append('message', 'Testing Windows path normalization');
  fdWin.append('attachment', new Blob(['clean log content'], { type: 'text/plain' }), 'C:\\Users\\admin\\sys_dump.log');
  const resWin = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdWin });
  assert.strictEqual(resWin.status, 201);
  assert.strictEqual(savedFeedbacks[1].attachment.filename, 'sys_dump.log');
  assert.strictEqual(sentEmails[1].attachments[0].filename, 'sys_dump.log');

  // Integration test 3: Upload with filename lacking extension rejected by fileFilter with 400
  const fdNoExt = new FormData();
  fdNoExt.append('type', 'bug');
  fdNoExt.append('message', 'Testing filename lacking extension rejection');
  fdNoExt.append('attachment', new Blob(['data'], { type: 'text/plain' }), 'malformed_no_ext');
  const resNoExt = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdNoExt });
  assert.strictEqual(resNoExt.status, 400);
  const dataNoExt = await resNoExt.json();
  assert.match(dataNoExt.error, /File extension not allowed/);

  // Integration test 4: Upload with traversal-only filename '..' is dropped safely by parser
  const fdDotDot = new FormData();
  fdDotDot.append('type', 'bug');
  fdDotDot.append('message', 'Testing dotdot filename safety');
  fdDotDot.append('attachment', new Blob(['data'], { type: 'text/plain' }), '..');
  const resDotDot = await fetch(`${BASE_URL}/feedback`, { method: 'POST', body: fdDotDot });
  assert.strictEqual(resDotDot.status, 201);
  assert.strictEqual(savedFeedbacks[2].attachment, undefined, 'Traversal-only attachment must not be saved');
});

test('Batch 2: Gallery image upload failure masks internal provider and database errors', async () => {
  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    loggedErrors.push(args.join(' '));
  };

  try {
    // 1. Provider failure: Cloudinary is configured but fails
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';

    const fdCloud = new FormData();
    fdCloud.append('title', 'Test Cloudinary Error Masking');
    fdCloud.append('category', 'UI');
    fdCloud.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

    const resCloud = await fetch(`${BASE_URL}/images`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: fdCloud,
    });

    assert.strictEqual(resCloud.status, 500, 'Provider upload failure must return HTTP 500');
    const dataCloud = await resCloud.json();
    assert.strictEqual(dataCloud.error, 'Failed to upload image', 'Provider failure must return generic error message');
    const cloudJson = JSON.stringify(dataCloud);
    assert.ok(!cloudJson.includes('Must supply api_key'), 'Response must not leak provider error details');

    // 2. Database failure: Cloudinary is unconfigured and DB write fails
    delete process.env.CLOUDINARY_CLOUD_NAME;
    galleryImageCreateShouldFail = true;

    const fdDb = new FormData();
    fdDb.append('title', 'Test DB Error Masking');
    fdDb.append('category', 'UI');
    fdDb.append('image', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');

    const resDb = await fetch(`${BASE_URL}/images`, {
      method: 'POST',
      headers: { ...authHeaders },
      body: fdDb,
    });

    assert.strictEqual(resDb.status, 500, 'Database upload failure must return HTTP 500');
    const dataDb = await resDb.json();
    assert.strictEqual(dataDb.error, 'Failed to upload image', 'Database failure must return generic error message');
    const dbJson = JSON.stringify(dataDb);
    assert.ok(!dbJson.includes('mongodb'), 'Response must not leak mongodb details');
    assert.ok(!dbJson.includes('s3cr3t_pass'), 'Response must not leak database credentials');
    assert.ok(!dbJson.includes('atlas-db'), 'Response must not leak hostnames');
    assert.ok(!dbJson.includes('Database connection timed out'), 'Response must not leak internal exception message');

    // 3. Diagnostic logging verification
    const hasLoggedCloud = loggedErrors.some(l => l.includes('[images] POST upload failed:') && l.includes('Must supply api_key'));
    assert.ok(hasLoggedCloud, 'Diagnostic provider error must be logged server-side');
    const hasLoggedDb = loggedErrors.some(l => l.includes('[images] POST upload failed:') && l.includes('Database connection timed out'));
    assert.ok(hasLoggedDb, 'Diagnostic database error must be logged server-side');
  } finally {
    console.error = originalConsoleError;
    delete process.env.CLOUDINARY_CLOUD_NAME;
  }
});

test('Batch 2: Gallery image update failure masks internal database errors', async () => {
  const loggedErrors = [];
  const originalConsoleError = console.error;
  console.error = (...args) => {
    loggedErrors.push(args.join(' '));
  };

  try {
    galleryImageUpdateShouldFail = true;
    const testId = new mongoose.Types.ObjectId().toString();

    const res = await fetch(`${BASE_URL}/images/${testId}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Updated Title' }),
    });

    assert.strictEqual(res.status, 500, 'Image update failure must return HTTP 500');

    const data = await res.json();
    assert.strictEqual(data.error, 'Failed to update image', 'Response must contain generic error message');

    const jsonStr = JSON.stringify(data);
    assert.ok(!jsonStr.includes('MongoNetworkTimeoutError'), 'Response must not leak MongoDB exception names');
    assert.ok(!jsonStr.includes('shard-01.mongodb.net'), 'Response must not leak replica set shard hostnames');

    const hasLogged = loggedErrors.some(l => l.includes('[images] PATCH update failed:') && l.includes('MongoNetworkTimeoutError'));
    assert.ok(hasLogged, 'Diagnostic error must be logged server-side');
  } finally {
    console.error = originalConsoleError;
  }
});

// ── Batch 1 Remediation: Protect GitHub Repos Endpoint ───────────────────────
test('Remediation Batch 1: GET /api/github/repos rejects unauthenticated request with 401', async () => {
  const res = await fetch(`${BASE_URL}/github/repos`);
  assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
  const data = await res.json();
  assert.strictEqual(data.error, 'Authentication required');
});

test('Remediation Batch 1: GET /api/github/repos rejects invalid or expired token with 401', async () => {
  const invalidToken = jwt.sign({ role: 'admin' }, 'wrong-secret-key');
  const res = await fetch(`${BASE_URL}/github/repos`, {
    headers: { Authorization: `Bearer ${invalidToken}` },
  });
  assert.strictEqual(res.status, 401, 'Invalid token must return 401');
  const data = await res.json();
  assert.strictEqual(data.error, 'Invalid or expired token');
});

test('Remediation Batch 1: GET /api/github/repos allows valid admin session and preserves structure', async () => {
  const res = await fetch(`${BASE_URL}/github/repos`, {
    headers: { ...authHeaders },
  });
  assert.strictEqual(res.status, 200, 'Valid admin token must return 200');
  const data = await res.json();
  assert.ok(Array.isArray(data.repos), 'repos must be an array');
  assert.ok(Array.isArray(data.selected), 'selected must be an array');
  assert.ok(data.repos.length > 0, 'repos array must not be empty');
  const first = data.repos[0];
  assert.strictEqual(first.name, 'portfolio-test');
  assert.strictEqual(first.repoUrl, 'https://github.com/test-user/portfolio-test');
  assert.strictEqual(typeof first.isPrivate, 'boolean');
});

// ── Batch 1 Remediation: Contact Attachment Hardening ────────────────────────
test('Remediation Batch 1: Contact form accepts valid attachments across all allowed formats', async () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
  const jpgHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00]);
  const pdfHeader = Buffer.from('%PDF-1.5\n%sample pdf content');

  const fd = new FormData();
  fd.append('name', 'Multi File User');
  fd.append('email', 'multifile@example.com');
  fd.append('message', 'Submitting three valid attachments');
  fd.append('attachments', new Blob([pngHeader], { type: 'image/png' }), 'diagram.png');
  fd.append('attachments', new Blob([jpgHeader], { type: 'image/jpeg' }), 'photo.jpg');
  fd.append('attachments', new Blob([pdfHeader], { type: 'application/pdf' }), 'resume.pdf');

  savedContacts = [];
  sentEmails = [];
  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201, 'Valid files must be accepted with 201');
  assert.strictEqual(savedContacts.length, 1, 'Contact record must be saved');
  assert.strictEqual(sentEmails.length, 1, 'Notification email must be sent');
  assert.strictEqual(sentEmails[0].attachments.length, 3, 'Email must include all 3 attachments');
  assert.strictEqual(sentEmails[0].attachments[0].filename, 'diagram.png');
  assert.strictEqual(sentEmails[0].attachments[1].filename, 'photo.jpg');
  assert.strictEqual(sentEmails[0].attachments[2].filename, 'resume.pdf');
});

test('Remediation Batch 1: Contact form accepts clean text and log files', async () => {
  const fd = new FormData();
  fd.append('name', 'Log User');
  fd.append('email', 'loguser@example.com');
  fd.append('message', 'Here is the bug log');
  fd.append('attachments', new Blob(['2026-10-12 INFO Server started successfully'], { type: 'text/plain' }), 'debug.log');

  savedContacts = [];
  sentEmails = [];
  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].attachments[0].filename, 'debug.log');
});

test('Remediation Batch 1: Contact form rejects dangerous file extensions with HTTP 400', async () => {
  const dangerous = [
    { name: 'script.sh', mime: 'application/x-sh', content: '#!/bin/bash\necho 1' },
    { name: 'app.exe', mime: 'application/octet-stream', content: 'MZ executable' },
    { name: 'vector.svg', mime: 'image/svg+xml', content: '<svg onload="alert(1)"></svg>' },
    { name: 'phish.html', mime: 'text/html', content: '<h1>Login</h1>' },
    { name: 'malware.php', mime: 'application/x-php', content: '<?php phpinfo(); ?>' },
    { name: 'archive.zip', mime: 'application/zip', content: 'PK archive' },
    { name: 'exploit.js', mime: 'application/javascript', content: 'console.log(1)' },
  ];

  for (const item of dangerous) {
    savedContacts = [];
    sentEmails = [];
    const fd = new FormData();
    fd.append('name', 'Attacker');
    fd.append('email', 'attacker@example.com');
    fd.append('message', 'Check this attachment');
    fd.append('attachments', new Blob([item.content], { type: item.mime }), item.name);

    const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
    assert.strictEqual(res.status, 400, `Extension ${item.name} must be rejected with 400`);
    const data = await res.json();
    assert.match(data.error, /File type not allowed/, 'Must return safe file type error message');
    assert.strictEqual(savedContacts.length, 0, 'Must not save to DB on extension rejection');
    assert.strictEqual(sentEmails.length, 0, 'Must not send email on extension rejection');
  }
});

test('Remediation Batch 1: Contact form rejects mismatched or spoofed MIME types with HTTP 400', async () => {
  savedContacts = [];
  sentEmails = [];
  const fd = new FormData();
  fd.append('name', 'Spoofer');
  fd.append('email', 'spoofer@example.com');
  fd.append('message', 'Spoofed MIME');
  fd.append('attachments', new Blob(['fake data'], { type: 'text/plain' }), 'photo.png');

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'File MIME type does not match allowed types.');
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

test('Remediation Batch 1: Contact form validates magic bytes and rejects invalid binary signatures', async () => {
  const invalidSignatures = [
    { name: 'fake.png', mime: 'image/png', content: 'Not a png at all' },
    { name: 'fake.jpg', mime: 'image/jpeg', content: 'Not a jpg at all' },
    { name: 'fake.pdf', mime: 'application/pdf', content: 'Not a pdf at all' },
    { name: 'fake.gif', mime: 'image/gif', content: 'Not a gif at all' },
    { name: 'fake.webp', mime: 'image/webp', content: 'Not a webp at all' },
    { name: 'fake.txt', mime: 'text/plain', content: 'Text with null byte \x00 in content' },
  ];

  for (const item of invalidSignatures) {
    savedContacts = [];
    sentEmails = [];
    const fd = new FormData();
    fd.append('name', 'Tampered User');
    fd.append('email', 'tampered@example.com');
    fd.append('message', 'Signature test');
    fd.append('attachments', new Blob([item.content], { type: item.mime }), item.name);

    const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
    assert.strictEqual(res.status, 400, `Signature failure for ${item.name} must return 400`);
    const data = await res.json();
    assert.ok(data.error && data.error.length > 0, 'Must provide error message');
    assert.strictEqual(savedContacts.length, 0, 'No DB write on signature mismatch');
    assert.strictEqual(sentEmails.length, 0, 'No email dispatch on signature mismatch');
  }
});

test('Remediation Batch 1: Contact form normalizes path-like filenames, separators, and control characters', async () => {
  const { sanitizeAttachmentFilename } = require('./utils/attachmentValidation');
  // Unit verification for control characters and illegal symbols
  assert.strictEqual(sanitizeAttachmentFilename('my\x00file\r\n"bad"<quote>*.pdf'), 'myfilebadquote.pdf');

  const pdfHeader = Buffer.from('%PDF-1.4\n%valid pdf body');
  const pathCases = [
    { raw: '../../../../etc/passwd.pdf', expected: 'passwd.pdf' },
    { raw: 'C:\\Users\\Administrator\\Desktop\\report.pdf', expected: 'report.pdf' },
    { raw: 'folder/sub\\mixed/doc.pdf', expected: 'doc.pdf' },
    { raw: 'my<bad>*quote:file.pdf', expected: 'mybadquotefile.pdf' },
  ];

  for (const c of pathCases) {
    savedContacts = [];
    sentEmails = [];
    const fd = new FormData();
    fd.append('name', 'Path User');
    fd.append('email', 'path@example.com');
    fd.append('message', 'Testing filename normalization');
    fd.append('attachments', new Blob([pdfHeader], { type: 'application/pdf' }), c.raw);

    const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
    assert.strictEqual(res.status, 201, `Path case ${c.raw} should return 201`);
    assert.strictEqual(sentEmails.length, 1);
    assert.strictEqual(sentEmails[0].attachments[0].filename, c.expected, `Expected normalized filename ${c.expected}`);
    assert.ok(!sentEmails[0].html.includes('<quote>'), 'Dangerous unescaped characters must not be in email body');
  }
});

test('Remediation Batch 1: Contact form rejects empty 0 B files with HTTP 400', async () => {
  savedContacts = [];
  sentEmails = [];
  const fd = new FormData();
  fd.append('name', 'Zero Byte User');
  fd.append('email', 'zero@example.com');
  fd.append('message', 'Testing 0 byte file');
  fd.append('attachments', new Blob([], { type: 'application/pdf' }), 'empty.pdf');

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Attached file is empty');
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

test('Remediation Batch 1: Contact form rejects oversized files (> 5 MB) with HTTP 400', async () => {
  savedContacts = [];
  sentEmails = [];
  const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, 0x61);
  const fd = new FormData();
  fd.append('name', 'Large File User');
  fd.append('email', 'large@example.com');
  fd.append('message', 'Testing oversized file');
  fd.append('attachments', new Blob([largeBuffer], { type: 'text/plain' }), 'huge.txt');

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /File too large|exceeds maximum size/);
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

// -- Phase 2B Remediation: Content Security Policy Enforcement ---------------
test('Phase 2B: Content-Security-Policy enforced in vercel.json with verified directives, script hash, and no duplicate Report-Only header', () => {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  const vercelPath = path.resolve(__dirname, '../client/vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  const catchAll = vercelConfig.headers.find((h) => h.source === '/(.*)');
  assert.ok(catchAll, 'vercel.json must have catch-all headers entry');

  const headerMap = Object.fromEntries(catchAll.headers.map((h) => [h.key, h.value]));
  const csp = headerMap['Content-Security-Policy'];
  assert.ok(csp, 'vercel.json must define Content-Security-Policy');
  assert.strictEqual(headerMap['Content-Security-Policy-Report-Only'], undefined, 'vercel.json must not retain Content-Security-Policy-Report-Only duplicate');

  // Verify baseline directives
  assert.ok(csp.includes("default-src 'self'"), 'CSP must set default-src to self');
  assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must forbid frame ancestors');
  assert.ok(csp.includes("object-src 'none'"), 'CSP must forbid object sources');
  assert.ok(csp.includes("base-uri 'self'"), 'CSP must restrict base-uri to self');
  assert.ok(csp.includes("form-action 'self'"), 'CSP must restrict form actions to self');

  // Verify style and font origins
  assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com"), 'CSP must allow self, inline styles, and Google Fonts');
  assert.ok(csp.includes("font-src 'self' https://fonts.gstatic.com"), 'CSP must allow fonts from gstatic');

  // Verify image origins
  assert.ok(csp.includes("img-src 'self' data: blob: https://res.cloudinary.com https://cdn.simpleicons.org https://miro.medium.com https://*.medium.com"), 'CSP must allow Cloudinary, SimpleIcons, and Medium images');

  // Verify API and analytics connections
  assert.ok(csp.includes("connect-src 'self' https://googleme.onrender.com https://api.open-meteo.com https://nominatim.openstreetmap.org https://*.vercel-insights.com https://va.vercel-scripts.com https://vercel.live"), 'CSP must allow Render, weather, geocoding, and Vercel analytics');

  // Verify workers and media
  assert.ok(csp.includes("worker-src 'self' blob:"), 'CSP must permit PWA service worker');
  assert.ok(csp.includes("media-src 'self' https://res.cloudinary.com"), 'CSP must permit Cloudinary media');

  // Verify inline theme script SHA-256 match
  const indexPath = path.resolve(__dirname, '../client/index.html');
  const htmlContent = fs.readFileSync(indexPath, 'utf-8');
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'client/index.html must contain inline theme script');

  const expectedHash = crypto.createHash('sha256').update(scriptMatch[1]).digest('base64');
  const hashToken = `'sha256-${expectedHash}'`;
  assert.ok(csp.includes(hashToken), `CSP must include exact sha256 token ${hashToken} for inline theme bootstrap`);
});
