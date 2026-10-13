process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');

// 1. Mock SiteConfig model
const SiteConfig = require('./models/SiteConfig');
let dbCallCount = 0;
let dbShouldFail = false;
let lastDbFilter = null;
let lastDbUpdate = null;

SiteConfig.findOneAndUpdate = async (filter, update, options) => {
  if (dbShouldFail) throw new Error('DB Error');
  dbCallCount++;
  lastDbFilter = filter;
  lastDbUpdate = update;
  return { ok: true, ...filter, ...update };
};

SiteConfig.find = () => ({
  lean: async () => [
    { key: 'pageVisibility', value: { blog: true, tools: false, images: true } },
    { key: 'defaultTheme', value: 'dark' },
  ]
});

// 2. Setup Express app
const app = express();
app.use(express.json());
const configRoutes = require('./routes/config');
app.use('/api/config', configRoutes);

// 3. Tests setup
const PORT = 5556;
const BASE_URL = `http://localhost:${PORT}/api/config`;
const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
};

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
  dbCallCount = 0;
  dbShouldFail = false;
  lastDbFilter = null;
  lastDbUpdate = null;
});

// ── Tests ────────────────────────────────────────────────────────────────────

test('Visibility Config: Unauthenticated POST /api/config is rejected with 401', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'pageVisibility', value: { blog: true, tools: true, images: true } }),
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(dbCallCount, 0);
});

test('Visibility Config: Unauthenticated bulk update is rejected with 401', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates: [{ key: 'pageVisibility', value: { blog: true, tools: true, images: true } }] }),
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(dbCallCount, 0);
});

test('Visibility Config: Valid pageVisibility save succeeds via POST /api/config', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      key: 'pageVisibility',
      value: { blog: false, tools: true, images: false },
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.key, 'pageVisibility');
  assert.deepStrictEqual(data.value, { blog: false, tools: true, images: false });
  assert.strictEqual(dbCallCount, 1);
  assert.deepStrictEqual(lastDbFilter, { key: 'pageVisibility' });
  assert.deepStrictEqual(lastDbUpdate.value, { blog: false, tools: true, images: false });
});

test('Visibility Config: Valid pageVisibility save succeeds via bulk update', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'pageVisibility', value: { blog: true, tools: false, images: true } },
        { key: 'defaultTheme', value: 'light' },
      ],
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.ok, true);
  assert.strictEqual(dbCallCount, 2);
});

test('Visibility Config: Rejects non-object pageVisibility with 400', async () => {
  const invalidValues = ['not-an-object', 123, null, true, ['blog']];
  for (const value of invalidValues) {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'pageVisibility', value }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for ${JSON.stringify(value)}`);
    const data = await res.json();
    assert.match(data.error, /pageVisibility must be an object|pageVisibility must be a non-null object/);
    assert.strictEqual(dbCallCount, 0);
  }
});

test('Visibility Config: Rejects non-boolean recognized keys with 400', async () => {
  const invalidPayloads = [
    { blog: 'true', tools: true, images: true },
    { blog: true, tools: 1, images: true },
    { blog: true, tools: true, images: null },
    { blog: 0, tools: false, images: true },
  ];
  for (const value of invalidPayloads) {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'pageVisibility', value }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for ${JSON.stringify(value)}`);
    const data = await res.json();
    assert.match(data.error, /must be a boolean/);
    assert.strictEqual(dbCallCount, 0);
  }
});

test('Visibility Config: Rejects unknown keys with 400 and explicit message', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      key: 'pageVisibility',
      value: { blog: true, tools: true, images: true, extraRoute: true },
    }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Unknown pageVisibility key "extraRoute"/);
  assert.match(data.error, /Allowed keys: blog, tools, images/);
  assert.strictEqual(dbCallCount, 0);
});

test('Visibility Config: Rejects invalid pageVisibility inside bulk update with 400', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'pageVisibility', value: { blog: 'invalid', tools: true, images: true } },
      ],
    }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /must be a boolean/);
  assert.strictEqual(dbCallCount, 0);
});

test('Visibility Config: Preserves existing config handling for other keys', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      key: 'defaultTheme',
      value: 'dark',
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.key, 'defaultTheme');
  assert.strictEqual(data.value, 'dark');
  assert.strictEqual(dbCallCount, 1);
});
