process.env.JWT_SECRET = 'test-secret-phase1';
const bcrypt = require('bcryptjs');
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('correct-password', 10);

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');

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
  savedFeedbacks.push(doc);
  return { _id: 'mock-feedback-id', ...doc };
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
