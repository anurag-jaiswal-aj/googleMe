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
GalleryImage.create = async (doc) => doc;
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

const cors = require('cors');

const app = express();
app.use(express.json());

// Mount CORS exactly as in server/index.js
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://anuragjaiswal.me',
  'https://www.anuragjaiswal.me',
];
const vercelPreviewRegex = /^https:\/\/(?:googleme-aj|googleme|google-me|gfolio)(?:-[a-z0-9-]+)?\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (defaultOrigins.includes(origin)) return callback(null, true);
      if (vercelPreviewRegex.test(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);

app.use('/api/admin', adminAuthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/images', imagesRoutes);

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

// ── H3: HTML Escaping for Uploaded Attachment Filenames ──────────────────────
test('H3. Contact email escapes HTML in attachment filenames', async () => {
  const fd = new FormData();
  fd.append('name', 'Alice');
  fd.append('email', 'alice@example.com');
  fd.append('message', 'Hello there');
  const maliciousName = '<img src=x onerror=alert(1)>.pdf';
  fd.append('attachments', new Blob(['test content'], { type: 'application/pdf' }), maliciousName);

  const res = await fetch(`${BASE_URL}/contact`, { method: 'POST', body: fd });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(sentEmails.length, 1);
  const emailHtml = sentEmails[0].html;
  assert.ok(emailHtml.includes('&lt;img src=x onerror=alert(1)&gt;.pdf'), 'Attachment filename must be HTML-escaped');
  assert.ok(!emailHtml.includes('<img src=x onerror=alert(1)>.pdf'), 'Raw unescaped HTML tag must not exist');
});

// ── M2: CORS Origin Validation & Rejection ──────────────────────────────────
// ── M2: CORS Origin Validation & Rejection ──────────────────────────────────
test('M2. Allowed production and preview origins receive Access-Control-Allow-Origin', async () => {
  const allowedOriginsToTest = [
    // Exact production & local origins
    'http://localhost:3000',
    'http://localhost:5173',
    'https://anuragjaiswal.me',
    'https://www.anuragjaiswal.me',
    // Expected Vercel project production & preview hostnames
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

test('M2. Unrelated, malicious, or non-matching origins are rejected cleanly without 500 error', async () => {
  const disallowedOriginsToTest = [
    'https://attacker.vercel.app',
    'https://otherproject.vercel.app',
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
  fd.append('attachment', new Blob(['screenshot content'], { type: 'image/png' }), 'screenshot.png');
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
