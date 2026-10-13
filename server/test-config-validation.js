process.env.JWT_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');

// 1. Mock Database Models
const SiteConfig = require('./models/SiteConfig');
const PortfolioConfig = require('./models/PortfolioConfig');

let savedSiteConfigs = [];
let savedPortfolioConfigs = [];

SiteConfig.findOneAndUpdate = async (filter, update, options) => {
  savedSiteConfigs.push({ filter, update, options });
  return { ok: true, key: update.key, value: update.value };
};
SiteConfig.find = () => ({ lean: async () => [] });

PortfolioConfig.findOneAndUpdate = async (filter, update, options) => {
  savedPortfolioConfigs.push({ filter, update, options });
  return { ok: true, key: update.key, selectedRepos: update.selectedRepos };
};
PortfolioConfig.findOne = async () => ({ selectedRepos: [] });

// 2. Setup Express App
const app = express();
app.use(express.json());
const configRoutes = require('./routes/config');
const githubRoutes = require('./routes/github');
app.use('/api/config', configRoutes);
app.use('/api/github', githubRoutes);

const PORT = 5576;
const CONFIG_URL = `http://localhost:${PORT}/api/config`;
const GITHUB_URL = `http://localhost:${PORT}/api/github/selection`;

const adminToken = jwt.sign({ admin: true }, process.env.JWT_SECRET);
const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`,
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

test.beforeEach(() => {
  savedSiteConfigs = [];
  savedPortfolioConfigs = [];
});

// ── 1. Key Allowlist & Transactional Bulk Safety ─────────────────────────────

test('Config Validation: Unknown key is rejected with HTTP 400', async () => {
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'unrecognized_key', value: 'some value' }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Unknown configuration key "unrecognized_key"'));
  assert.strictEqual(savedSiteConfigs.length, 0);
});

test('Config Validation: Unknown key in bulk update fails fast with 400 and zero persistence', async () => {
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'defaultTheme', value: 'dark' },
        { key: 'maliciousKey', value: { payload: true } },
      ],
    }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Unknown configuration key "maliciousKey"'));
  // Fail-fast assertion: no documents should have been written to database
  assert.strictEqual(savedSiteConfigs.length, 0);
});

test('Config Validation: Backward compatibility key customSetting is accepted', async () => {
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'customSetting', value: { anyData: 123 } }),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(savedSiteConfigs.length, 1);
});

// ── 2. Scalar Validation ─────────────────────────────────────────────────────

test('Config Validation: mediumUsername rejects path traversal, URLs, and spaces', async () => {
  const badUsernames = ['../etc/passwd', 'attacker.com/rss', 'user name', 'foo@bar/baz'];
  for (const bad of badUsernames) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'mediumUsername', value: bad }),
    });
    assert.strictEqual(res.status, 400, `Should reject "${bad}"`);
    assert.strictEqual(savedSiteConfigs.length, 0);
  }
});

test('Config Validation: mediumUsername accepts clean alphanumeric usernames', async () => {
  const goodUsernames = ['janurag582004', '@janurag582004', 'anurag_jaiswal-99'];
  for (const good of goodUsernames) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'mediumUsername', value: good }),
    });
    assert.strictEqual(res.status, 200, `Should accept "${good}"`);
  }
  assert.strictEqual(savedSiteConfigs.length, 3);
});

test('Config Validation: githubUsername validates format and length', async () => {
  const badUsers = ['-invalid', 'user--name', 'user/repo', 'a'.repeat(45)];
  for (const bad of badUsers) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'githubUsername', value: bad }),
    });
    assert.strictEqual(res.status, 400, `Should reject "${bad}"`);
  }

  const resOk = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'githubUsername', value: 'anurag-jaiswal-aj' }),
  });
  assert.strictEqual(resOk.status, 200);
  assert.strictEqual(savedSiteConfigs.length, 1);
});

test('Config Validation: defaultTheme restricts to light, dark, system', async () => {
  const badTheme = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'defaultTheme', value: 'neon-blue' }),
  });
  assert.strictEqual(badTheme.status, 400);

  for (const t of ['light', 'dark', 'system']) {
    const ok = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'defaultTheme', value: t }),
    });
    assert.strictEqual(ok.status, 200);
  }
});

test('Config Validation: blogPostsPerPage enforces positive integer range 1-50', async () => {
  const badValues = [0, -5, 51, 100, 3.5, 'invalid', null];
  for (const val of badValues) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'blogPostsPerPage', value: val }),
    });
    assert.strictEqual(res.status, 400, `Should reject ${val}`);
  }

  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'blogPostsPerPage', value: 12 }),
  });
  assert.strictEqual(ok.status, 200);
});

// ── 3. URI and Protocol Security ─────────────────────────────────────────────

test('Config Validation: socialLinks rejects javascript: and data: schemes', async () => {
  const maliciousLinks = [
    { alternatePortfolio: 'javascript:alert(1)' },
    { github: 'javascript:void(0)' },
    { linkedin: 'data:text/html,<script>alert(1)</script>' },
    { twitter: 'vbscript:msgbox(1)' },
  ];
  for (const links of maliciousLinks) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'socialLinks', value: links }),
    });
    assert.strictEqual(res.status, 400);
  }
  assert.strictEqual(savedSiteConfigs.length, 0);
});

test('Config Validation: socialLinks accepts valid HTTP/HTTPS URLs and empty strings', async () => {
  const validLinks = {
    github: 'https://github.com/anurag-jaiswal-aj',
    linkedin: 'https://linkedin.com/in/anurag',
    twitter: 'https://x.com/anurag',
    leetcode: 'https://leetcode.com/u/anurag',
    codechef: '',
    email: 'janurag582004@gmail.com',
    alternatePortfolio: 'https://anurag-v2.vercel.app',
    mailto: 'mailto:janurag582004@gmail.com',
    resume: 'https://res.cloudinary.com/demo/image/upload/v1/resume.pdf',
  };
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: validLinks }),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(savedSiteConfigs.length, 1);
});

test('Config Validation: socialLinks handles empty representations and mailto variants', async () => {
  // Empty email representation accepted
  const emptyEmailRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { email: '' } }),
  });
  assert.strictEqual(emptyEmailRes.status, 200);

  // mailto: '' accepted
  const emptyMailtoRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { mailto: '' } }),
  });
  assert.strictEqual(emptyMailtoRes.status, 200);

  // mailto: 'mailto:' (empty email representation from Admin) accepted
  const mailtoPrefixRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { mailto: 'mailto:' } }),
  });
  assert.strictEqual(mailtoPrefixRes.status, 200);

  // Valid mailto address accepted
  const validMailtoRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { mailto: 'mailto:janurag582004@gmail.com' } }),
  });
  assert.strictEqual(validMailtoRes.status, 200);

  // Invalid non-empty mailto address rejected with HTTP 400
  const invalidMailtoRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { mailto: 'mailto:not-an-email' } }),
  });
  assert.strictEqual(invalidMailtoRes.status, 400);

  // Malformed non-empty email rejected with HTTP 400
  const invalidEmailRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { email: 'not-an-email' } }),
  });
  assert.strictEqual(invalidEmailRes.status, 400);

  // Invalid mailto scheme rejected with HTTP 400
  const invalidSchemeRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'socialLinks', value: { mailto: 'https://example.com' } }),
  });
  assert.strictEqual(invalidSchemeRes.status, 400);
});

test('Config Validation: resumeUrl and avatarUrl accept safe URLs and reject javascript:', async () => {
  const badResume = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'resumeUrl', value: 'javascript:alert(document.domain)' }),
  });
  assert.strictEqual(badResume.status, 400);

  const goodCloud = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'resumeUrl', value: 'https://res.cloudinary.com/test/resume.pdf' }),
  });
  assert.strictEqual(goodCloud.status, 200);

  const goodLocal = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'resumeUrl', value: '/Resume_aj.pdf' }),
  });
  assert.strictEqual(goodLocal.status, 200);

  const badAvatar = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: 'javascript:xss()' }),
  });
  assert.strictEqual(badAvatar.status, 400);

  const goodAvatar = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: 'https://res.cloudinary.com/test/photo.jpg' }),
  });
  assert.strictEqual(goodAvatar.status, 200);
});

// ── 4. Profile & Canonical Education ─────────────────────────────────────────

test('Config Validation: profile rejects non-object and invalid statusOn', async () => {
  const bad1 = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profile', value: 'string instead of object' }),
  });
  assert.strictEqual(bad1.status, 400);

  const bad2 = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profile', value: { name: 'Anurag', statusOn: 'yes' } }),
  });
  assert.strictEqual(bad2.status, 400);
});

test('Config Validation: profile accepts valid canonical education structure and partials', async () => {
  const canonicalProfile = {
    name: 'Anurag Jaiswal',
    title: 'Engineering Student',
    statusText: 'Open to Work',
    statusOn: true,
    footerDate: 'March 2026',
    education: {
      institution: 'Visvesvaraya Technological University',
      degree: 'Bachelor of Engineering in Computer Science',
      degreeShort: 'B.E. CS',
      years: '2023 - 2027',
      cgpa: '9.2',
      detail: '3rd Year · CGPA 9.2',
    },
  };
  const res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profile', value: canonicalProfile }),
  });
  assert.strictEqual(res.status, 200);

  // Partial update (only name) is also permitted
  const partial = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profile', value: { name: 'A. Jaiswal' } }),
  });
  assert.strictEqual(partial.status, 200);
});

// ── 5. Timelines, Skills, and Colors ─────────────────────────────────────────

test('Config Validation: knowledgeSkills validates structure, bounds, and hex colors', async () => {
  const badSkills = [
    'not an array',
    [{ name: '', pct: 50, color: '#4285F4' }],
    [{ name: 'React', pct: 150, color: '#4285F4' }],
    [{ name: 'React', pct: -10, color: '#4285F4' }],
    [{ name: 'React', pct: 80, color: 'invalid-hex' }],
  ];
  for (const bad of badSkills) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'knowledgeSkills', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodSkills = [
    { name: 'JavaScript', pct: 90, color: '#4285F4' },
    { name: 'React', pct: 85, color: '#34A853' },
  ];
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'knowledgeSkills', value: goodSkills }),
  });
  assert.strictEqual(ok.status, 200);
});

test('Config Validation: education timeline validates entry requirements and colors', async () => {
  const badEducation = [
    'not-an-array',
    [{ school: '', degree: '', year: '2023' }],
    [{ school: 'VTU', degree: 'CS', color: '#123' }], // 3-digit hex rejected
  ];
  for (const bad of badEducation) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'education', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodEducation = [
    {
      school: 'Visvesvaraya Technological University',
      degree: 'Bachelor of Engineering in Computer Science',
      year: '2023 - 2027',
      detail: '3rd Year · CGPA 9.2',
      color: '#4285F4',
    },
    {
      school: 'J.B.P.I.C, Ambedkar Nagar',
      degree: 'Pre-University',
      year: '2022 - 2023',
      detail: 'PCM · 91%',
      color: '#4285F4',
    },
  ];
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'education', value: goodEducation }),
  });
  assert.strictEqual(ok.status, 200);
});

test('Config Validation: experience timeline validates required fields', async () => {
  const badExp = [
    'not-an-array',
    [{ role: '', company: '' }],
    [{ role: 'Engineer', company: 'Corp', color: 'not-hex' }],
    [{ role: 'Engineer', company: 'Corp', badges: 'not-an-array' }],
  ];
  for (const bad of badExp) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'experience', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodExp = [
    {
      role: 'Full Stack Developer Intern',
      company: 'Tech Corp',
      period: '2024 - Present',
      description: 'Built features using MERN stack.',
      color: '#4285F4',
      badges: ['React', 'Node.js'],
    },
  ];
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'experience', value: goodExp }),
  });
  assert.strictEqual(ok.status, 200);
});

test('Config Validation: certifications validates name and URL safety', async () => {
  const badCerts = [
    'not-an-array',
    [{ name: '' }],
    [{ name: 'AWS Cloud', link: 'javascript:steal()' }],
  ];
  for (const bad of badCerts) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'certifications', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodCerts = [
    {
      name: 'Meta Front-End Developer',
      issuer: 'Coursera',
      year: '2024',
      color: '#4285F4',
      link: 'https://coursera.org/verify/example',
    },
  ];
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'certifications', value: goodCerts }),
  });
  assert.strictEqual(ok.status, 200);
});

test('Config Validation: bioParagraphs accepts string and array of strings', async () => {
  const badBio = [123, [123, 'valid'], { obj: 'invalid' }];
  for (const bad of badBio) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'bioParagraphs', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const okString = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'bioParagraphs', value: 'Single paragraph bio.' }),
  });
  assert.strictEqual(okString.status, 200);

  const okArray = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'bioParagraphs', value: ['Paragraph 1', 'Paragraph 2'] }),
  });
  assert.strictEqual(okArray.status, 200);
});

test('Config Validation: skills categorized list validates structure', async () => {
  const badSkills = [
    'not-an-array',
    [{ category: '' }],
    [{ category: 'Frontend', items: 'not-an-array' }],
    [{ category: 'Frontend', items: [123] }],
  ];
  for (const bad of badSkills) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'skills', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodSkills = [
    { category: 'Frontend', items: ['React', 'TypeScript', 'TailwindCSS'] },
    { category: 'Backend', items: ['Node.js', 'Express', 'MongoDB'] },
  ];
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'skills', value: goodSkills }),
  });
  assert.strictEqual(ok.status, 200);
});

test('Config Validation: contactInfo validates email and string lengths', async () => {
  const badContact = [
    'not-an-object',
    { email: 'not-an-email' },
    { phone: '1'.repeat(60) },
  ];
  for (const bad of badContact) {
    const res = await fetch(CONFIG_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ key: 'contactInfo', value: bad }),
    });
    assert.strictEqual(res.status, 400);
  }

  const goodContact = {
    email: 'janurag582004@gmail.com',
    phone: '+91 9876543210',
    location: 'Bengaluru, India',
  };
  const ok = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'contactInfo', value: goodContact }),
  });
  assert.strictEqual(ok.status, 200);
});

// ── 6. GitHub Repository Selection Route Validation ──────────────────────────

test('GitHub Selection: Rejects unauthenticated request with 401', async () => {
  const res = await fetch(GITHUB_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ selectedRepos: [{ name: 'googleMe' }] }),
  });
  assert.strictEqual(res.status, 401);
});

test('GitHub Selection: Rejects non-array selectedRepos with 400', async () => {
  const res = await fetch(GITHUB_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ selectedRepos: 'not-an-array' }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'selectedRepos must be an array');
});

test('GitHub Selection: Rejects raw strings, missing or invalid names, and invalid schema fields', async () => {
  const badPayloads = [
    ['quick-tool'], // Raw string entry rejected
    [{ name: 'googleMe' }, 'quick-tool'], // Mixed raw string rejected
    [{}], // Missing repository name
    [{ featured: true }], // Missing repository name with other fields
    [{ name: '' }], // Empty repository name
    [{ name: '   ' }], // Whitespace repository name
    [{ name: 'repo/with/slashes' }], // Slashes not allowed in repo name
    [{ name: 'bad repo name with spaces' }], // Spaces not allowed
    [{ name: 'valid', featured: 'not-a-boolean' }], // Invalid featured type
    [{ name: 'valid', featured: 1 }], // Invalid featured type (number)
    [{ name: 'valid', extraTags: 'not-an-array' }], // extraTags must be an array
    [{ name: 'valid', extraTags: [123] }], // extraTags elements must be strings
    [{ name: 'valid', extraTags: ['a'.repeat(60)] }], // extraTags element exceeds 50 chars
  ];
  for (const bad of badPayloads) {
    const res = await fetch(GITHUB_URL, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ selectedRepos: bad }),
    });
    assert.strictEqual(res.status, 400, `Payload ${JSON.stringify(bad)} should be rejected with 400`);
  }
  assert.strictEqual(savedPortfolioConfigs.length, 0);
});

test('GitHub Selection: Accepts empty array and valid object entries with expected shape retention', async () => {
  // Empty array is accepted
  const emptyRes = await fetch(GITHUB_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ selectedRepos: [] }),
  });
  assert.strictEqual(emptyRes.status, 200);
  const emptyData = await emptyRes.json();
  assert.strictEqual(emptyData.success, true);
  assert.deepStrictEqual(emptyData.selectedRepos, []);
  assert.deepStrictEqual(savedPortfolioConfigs[0].update.selectedRepos, []);

  // Valid object entries are accepted and retain their shape
  const validSelection = [
    { name: 'googleMe', featured: true, extraTags: ['React', 'MERN'] },
    { name: 'portfolio-v1', featured: false, extraTags: [] },
    { name: 'quick-tool' },
  ];
  const res = await fetch(GITHUB_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ selectedRepos: validSelection }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.deepStrictEqual(data.selectedRepos, validSelection);
  assert.strictEqual(savedPortfolioConfigs.length, 2);
  assert.strictEqual(savedPortfolioConfigs[1].options.runValidators, true);
  assert.deepStrictEqual(savedPortfolioConfigs[1].update.selectedRepos, validSelection);
});
