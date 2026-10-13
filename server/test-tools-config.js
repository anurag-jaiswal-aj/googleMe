process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock SiteConfig
const SiteConfig = require('./models/SiteConfig');
let lastSavedFilter = null;
let lastSavedUpdate = null;
let saveCount = 0;

SiteConfig.findOneAndUpdate = async (filter, update) => {
  lastSavedFilter = filter;
  lastSavedUpdate = update;
  saveCount++;
  return { key: update.key, value: update.value };
};
SiteConfig.find = () => ({ lean: async () => [] });

const app = express();
app.use(express.json());
const configRoutes = require('./routes/config');
app.use('/api/config', configRoutes);

const PORT = 5566;
const BASE_URL = `http://localhost:${PORT}/api/config`;
const adminToken = jwt.sign({ admin: true }, process.env.JWT_SECRET);
const authHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${adminToken}`,
};

let server;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

test.after(() => {
  server.close();
});

const sampleValidTools = [
  {
    category: 'Languages',
    title: 'Languages I Code In',
    color: '#4285F4',
    snippet: 'Core programming languages.',
    items: [
      { name: 'JavaScript', level: 'Expert', desc: 'Modern ECMAScript.' },
      { name: 'Python', level: 'Expert', desc: 'Data processing and scripting.' },
    ],
  },
  {
    category: 'Backend',
    title: 'Backend Systems',
    color: '#34A853',
    snippet: 'Server development.',
    items: [
      { name: 'Node.js', level: 'Proficient', desc: 'Event-driven backend.' },
    ],
  },
];

test('Tools Config: Unauthenticated POST /api/config is rejected with 401', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'tools', value: sampleValidTools }),
  });
  assert.strictEqual(res.status, 401);
});

test('Tools Config: Non-array value is rejected with 400', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: { invalid: true } }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /must be an array/i);
});

test('Tools Config: Empty array value is rejected with 400', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: [] }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /at least one category/i);
});

test('Tools Config: Missing category name is rejected with 400', async () => {
  const invalidPayload = [
    {
      category: '',
      title: 'Valid Title',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: invalidPayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /requires a non-empty category name/i);
});

test('Tools Config: Invalid hex color format is rejected with 400', async () => {
  const invalidPayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: 'red', // Not 6-digit hex
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: invalidPayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /valid 6-digit hex color/i);
});

test('Tools Config: Category without skills is rejected with 400', async () => {
  const invalidPayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: invalidPayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /at least one skill/i);
});

test('Tools Config: Invalid skill proficiency level is rejected with 400', async () => {
  const invalidPayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Master', desc: 'Desc' }], // Master is not allowed
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: invalidPayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /invalid level/i);
});

test('Tools Config: Skill with missing name or description is rejected with 400', async () => {
  const invalidPayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: '', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: invalidPayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /requires a non-empty name/i);
});

test('Tools Config: Valid single update succeeds and persists', async () => {
  const initialSaveCount = saveCount;
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: sampleValidTools }),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(saveCount, initialSaveCount + 1);
  assert.deepStrictEqual(lastSavedFilter, { key: 'tools' });
  assert.deepStrictEqual(lastSavedUpdate.value, sampleValidTools);
});

test('Tools Config: Bulk update with invalid tools item is rejected with 400', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'bioParagraphs', value: ['Bio'] },
        { key: 'tools', value: [{ category: 'Bad', title: '', color: '#111', snippet: '', items: [] }] },
      ],
    }),
  });
  assert.strictEqual(res.status, 400);
});

test('Tools Config: Bulk update with valid tools item succeeds', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'tools', value: sampleValidTools },
      ],
    }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.ok, true);
});

test('Tools Config: Non-tools configuration keys continue to work without restriction', async () => {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'customSetting', value: { anyData: 123 } }),
  });
  assert.strictEqual(res.status, 200);
});

test('Tools Config: Duplicate category names with exact match are rejected with 400', async () => {
  const duplicatePayload = [
    {
      category: 'Languages',
      title: 'Languages 1',
      color: '#4285F4',
      snippet: 'Snippet 1',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: 'Languages',
      title: 'Languages 2',
      color: '#34A853',
      snippet: 'Snippet 2',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: duplicatePayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Duplicate category name "Languages". Category names must be unique.');
});

test('Tools Config: Duplicate category names with case differences are rejected with 400', async () => {
  const duplicatePayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: 'LANGUAGES',
      title: 'Languages Upper',
      color: '#34A853',
      snippet: 'Snippet',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: duplicatePayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Duplicate category name "LANGUAGES". Category names must be unique.');
});

test('Tools Config: Duplicate category names with leading/trailing whitespace are rejected with 400', async () => {
  const duplicatePayload = [
    {
      category: 'Languages',
      title: 'Languages',
      color: '#4285F4',
      snippet: 'Snippet',
      items: [{ name: 'JS', level: 'Expert', desc: 'Desc' }],
    },
    {
      category: '   languages   ',
      title: 'Languages Spaced',
      color: '#34A853',
      snippet: 'Snippet',
      items: [{ name: 'Python', level: 'Expert', desc: 'Desc' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: duplicatePayload }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'Duplicate category name "languages". Category names must be unique.');
});

test('Tools Config: Valid distinct category names succeed and persist', async () => {
  const distinctPayload = [
    {
      category: 'Frontend',
      title: 'Frontend Web',
      color: '#4285F4',
      snippet: 'Web UI',
      items: [{ name: 'React', level: 'Expert', desc: 'Component architecture' }],
    },
    {
      category: 'Backend',
      title: 'Backend Systems',
      color: '#34A853',
      snippet: 'Servers and APIs',
      items: [{ name: 'Node.js', level: 'Proficient', desc: 'Express and APIs' }],
    },
  ];
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'tools', value: distinctPayload }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.key, 'tools');
  assert.deepStrictEqual(data.value, distinctPayload);
});
