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
SiteConfig.find = () => ({ lean: async () => savedSiteConfigs.map(s => ({ key: s.update.key, value: s.update.value })) });

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

  // profilePhotoUrl validates identically
  const badProfilePhoto = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: 'javascript:xss()' }),
  });
  assert.strictEqual(badProfilePhoto.status, 400);

  const malformedPhoto = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: 'not-a-valid-url' }),
  });
  assert.strictEqual(malformedPhoto.status, 400);

  const goodProfilePhoto = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/profile.png' }),
  });
  assert.strictEqual(goodProfilePhoto.status, 200);

  // Empty string is accepted as "no photo configured" / removal
  const removeAvatar = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: '' }),
  });
  assert.strictEqual(removeAvatar.status, 200);

  const removeProfilePhoto = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: '' }),
  });
  assert.strictEqual(removeProfilePhoto.status, 200);
});

test('Config Validation: profile photo update preserves existing configuration and exposes public config safely', async () => {
  // Update photo via bulk update alongside other fields
  const bulkRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_public.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/avatar_public.jpg' },
        { key: 'githubUsername', value: 'anurag-jaiswal-aj' },
      ],
    }),
  });
  assert.strictEqual(bulkRes.status, 200);

  // Fetch public config
  const getRes = await fetch(CONFIG_URL);
  assert.strictEqual(getRes.status, 200);
  const publicConfig = await getRes.json();

  // Exposes public photo URL
  assert.strictEqual(publicConfig.avatarUrl, 'https://res.cloudinary.com/test/avatar_public.jpg');
  assert.strictEqual(publicConfig.profilePhotoUrl, 'https://res.cloudinary.com/test/avatar_public.jpg');
  // Existing values preserved
  assert.strictEqual(publicConfig.githubUsername, 'anurag-jaiswal-aj');

  // Must not expose any secrets or credentials
  assert.strictEqual(publicConfig.CLOUDINARY_API_SECRET, undefined);
  assert.strictEqual(publicConfig.JWT_SECRET, undefined);
  assert.strictEqual(publicConfig.adminPassword, undefined);
});

test('Avatar Config Consistency: Updating profilePhotoUrl or avatarUrl synchronizes both keys and preserves unrelated settings', async () => {
  // 1. Seed initial configuration with an unrelated setting and an existing photo
  const seedRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'githubUsername', value: 'anurag-jaiswal-aj' },
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/initial_avatar.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/initial_avatar.jpg' },
      ],
    }),
  });
  assert.strictEqual(seedRes.status, 200);

  // 2. Direct single update to profilePhotoUrl must synchronize avatarUrl and preserve githubUsername
  const singlePhotoRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/updated_photo.jpg' }),
  });
  assert.strictEqual(singlePhotoRes.status, 200);

  const getAfterPhoto = await fetch(CONFIG_URL);
  assert.strictEqual(getAfterPhoto.status, 200);
  const configAfterPhoto = await getAfterPhoto.json();
  assert.strictEqual(configAfterPhoto.profilePhotoUrl, 'https://res.cloudinary.com/test/updated_photo.jpg');
  assert.strictEqual(configAfterPhoto.avatarUrl, 'https://res.cloudinary.com/test/updated_photo.jpg');
  assert.strictEqual(configAfterPhoto.githubUsername, 'anurag-jaiswal-aj');

  // 3. Direct single update to avatarUrl must synchronize profilePhotoUrl and preserve githubUsername
  const singleAvatarRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: 'https://res.cloudinary.com/test/updated_avatar.jpg' }),
  });
  assert.strictEqual(singleAvatarRes.status, 200);

  const getAfterAvatar = await fetch(CONFIG_URL);
  assert.strictEqual(getAfterAvatar.status, 200);
  const configAfterAvatar = await getAfterAvatar.json();
  assert.strictEqual(configAfterAvatar.avatarUrl, 'https://res.cloudinary.com/test/updated_avatar.jpg');
  assert.strictEqual(configAfterAvatar.profilePhotoUrl, 'https://res.cloudinary.com/test/updated_avatar.jpg');
  assert.strictEqual(configAfterAvatar.githubUsername, 'anurag-jaiswal-aj');

  // 4. Bulk update with only profilePhotoUrl must synchronize avatarUrl and preserve githubUsername
  const bulkPhotoOnlyRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/bulk_photo_only.jpg' },
      ],
    }),
  });
  assert.strictEqual(bulkPhotoOnlyRes.status, 200);

  const getAfterBulkPhoto = await fetch(CONFIG_URL);
  const configAfterBulkPhoto = await getAfterBulkPhoto.json();
  assert.strictEqual(configAfterBulkPhoto.profilePhotoUrl, 'https://res.cloudinary.com/test/bulk_photo_only.jpg');
  assert.strictEqual(configAfterBulkPhoto.avatarUrl, 'https://res.cloudinary.com/test/bulk_photo_only.jpg');
  assert.strictEqual(configAfterBulkPhoto.githubUsername, 'anurag-jaiswal-aj');
});

test('Avatar Config Consistency: Photo removal through either key clears both keys and prevents stale fallback', async () => {
  // 1. Seed active photo in both keys
  const seedRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/active_photo.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/active_photo.jpg' },
        { key: 'defaultTheme', value: 'dark' },
      ],
    }),
  });
  assert.strictEqual(seedRes.status, 200);

  // 2. Remove via single update to profilePhotoUrl: must clear avatarUrl as well
  const removeViaProfile = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: '' }),
  });
  assert.strictEqual(removeViaProfile.status, 200);

  const getAfterProfileRemoval = await fetch(CONFIG_URL);
  const configAfterProfileRemoval = await getAfterProfileRemoval.json();
  assert.strictEqual(configAfterProfileRemoval.profilePhotoUrl, '');
  assert.strictEqual(configAfterProfileRemoval.avatarUrl, '');
  assert.strictEqual(configAfterProfileRemoval.defaultTheme, 'dark');

  // 3. Re-set photo via single update to avatarUrl
  const restoreRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: 'https://res.cloudinary.com/test/restored_photo.jpg' }),
  });
  assert.strictEqual(restoreRes.status, 200);

  // 4. Remove via single update to avatarUrl: must clear profilePhotoUrl as well
  const removeViaAvatar = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: '' }),
  });
  assert.strictEqual(removeViaAvatar.status, 200);

  const getAfterAvatarRemoval = await fetch(CONFIG_URL);
  const configAfterAvatarRemoval = await getAfterAvatarRemoval.json();
  assert.strictEqual(configAfterAvatarRemoval.avatarUrl, '');
  assert.strictEqual(configAfterAvatarRemoval.profilePhotoUrl, '');
  assert.strictEqual(configAfterAvatarRemoval.defaultTheme, 'dark');

  // 5. Bulk removal with only one key clears both
  await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'avatarUrl', value: 'https://res.cloudinary.com/test/bulk_temp.jpg' }),
  });
  const bulkRemoveRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [{ key: 'profilePhotoUrl', value: '' }],
    }),
  });
  assert.strictEqual(bulkRemoveRes.status, 200);

  const getAfterBulkRemoval = await fetch(CONFIG_URL);
  const configAfterBulkRemoval = await getAfterBulkRemoval.json();
  assert.strictEqual(configAfterBulkRemoval.avatarUrl, '');
  assert.strictEqual(configAfterBulkRemoval.profilePhotoUrl, '');
});

test('Avatar Config Consistency: Invalid avatar URLs fail fast without changing stored configuration or unrelated settings', async () => {
  // 1. Seed valid baseline state
  const baselineRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/safe_avatar.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/safe_avatar.jpg' },
        { key: 'githubUsername', value: 'anurag-jaiswal-aj' },
      ],
    }),
  });
  assert.strictEqual(baselineRes.status, 200);

  // 2. Reject single update with dangerous URI protocol
  const badSingleRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ key: 'profilePhotoUrl', value: 'javascript:alert(document.cookie)' }),
  });
  assert.strictEqual(badSingleRes.status, 400);

  // Verify stored config was NOT modified
  const getAfterBadSingle = await fetch(CONFIG_URL);
  const configAfterBadSingle = await getAfterBadSingle.json();
  assert.strictEqual(configAfterBadSingle.avatarUrl, 'https://res.cloudinary.com/test/safe_avatar.jpg');
  assert.strictEqual(configAfterBadSingle.profilePhotoUrl, 'https://res.cloudinary.com/test/safe_avatar.jpg');
  assert.strictEqual(configAfterBadSingle.githubUsername, 'anurag-jaiswal-aj');

  // 3. Reject bulk update containing invalid avatar URL and valid other updates
  const badBulkRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'not-a-valid-http-url' },
        { key: 'githubUsername', value: 'unintended-partial-update' },
      ],
    }),
  });
  assert.strictEqual(badBulkRes.status, 400);

  // Verify zero persistence / fail-fast: neither avatarUrl nor githubUsername changed
  const getAfterBadBulk = await fetch(CONFIG_URL);
  const configAfterBadBulk = await getAfterBadBulk.json();
  assert.strictEqual(configAfterBadBulk.avatarUrl, 'https://res.cloudinary.com/test/safe_avatar.jpg');
  assert.strictEqual(configAfterBadBulk.profilePhotoUrl, 'https://res.cloudinary.com/test/safe_avatar.jpg');
  assert.strictEqual(configAfterBadBulk.githubUsername, 'anurag-jaiswal-aj');
});

test('Avatar Config Consistency: Conflicting avatar keys in bulk update resolve to canonical avatarUrl regardless of order', async () => {
  // Order 1: avatarUrl first, profilePhotoUrl second
  const order1Res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/canonical_1.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/secondary_1.jpg' },
      ],
    }),
  });
  assert.strictEqual(order1Res.status, 200);

  const get1 = await fetch(CONFIG_URL);
  assert.strictEqual(get1.status, 200);
  const config1 = await get1.json();
  assert.strictEqual(config1.avatarUrl, 'https://res.cloudinary.com/test/canonical_1.jpg');
  assert.strictEqual(config1.profilePhotoUrl, 'https://res.cloudinary.com/test/canonical_1.jpg');

  // Order 2: profilePhotoUrl first, avatarUrl second
  const order2Res = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/secondary_2.jpg' },
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/canonical_2.jpg' },
      ],
    }),
  });
  assert.strictEqual(order2Res.status, 200);

  const get2 = await fetch(CONFIG_URL);
  assert.strictEqual(get2.status, 200);
  const config2 = await get2.json();
  assert.strictEqual(config2.avatarUrl, 'https://res.cloudinary.com/test/canonical_2.jpg');
  assert.strictEqual(config2.profilePhotoUrl, 'https://res.cloudinary.com/test/canonical_2.jpg');
});

test('Avatar Config Consistency: Valid avatar alongside invalid unrelated setting fails fast with HTTP 400 and zero persistence', async () => {
  // 1. Seed initial baseline state
  const baselineRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/base_avatar.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/base_avatar.jpg' },
        { key: 'githubUsername', value: 'clean-username' },
      ],
    }),
  });
  assert.strictEqual(baselineRes.status, 200);

  // 2. Submit valid avatar update alongside invalid githubUsername
  const badRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/attempted_new_avatar.jpg' },
        { key: 'githubUsername', value: '-invalid-leading-dash' },
      ],
    }),
  });
  assert.strictEqual(badRes.status, 400);

  // 3. Verify neither the avatar configuration nor the unrelated setting was persisted
  const getAfter = await fetch(CONFIG_URL);
  assert.strictEqual(getAfter.status, 200);
  const configAfter = await getAfter.json();
  assert.strictEqual(configAfter.avatarUrl, 'https://res.cloudinary.com/test/base_avatar.jpg');
  assert.strictEqual(configAfter.profilePhotoUrl, 'https://res.cloudinary.com/test/base_avatar.jpg');
  assert.strictEqual(configAfter.githubUsername, 'clean-username');
});

test('Avatar Config Consistency: Duplicate avatar keys follow last-occurrence and preserve canonical precedence', async () => {
  // 1. Duplicate avatarUrl entries: verify last occurrence wins and profilePhotoUrl synchronizes
  const dupAvatarRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_first.jpg' },
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_second.jpg' },
      ],
    }),
  });
  assert.strictEqual(dupAvatarRes.status, 200);

  const getAfterDup = await fetch(CONFIG_URL);
  const configAfterDup = await getAfterDup.json();
  assert.strictEqual(configAfterDup.avatarUrl, 'https://res.cloudinary.com/test/avatar_second.jpg');
  assert.strictEqual(configAfterDup.profilePhotoUrl, 'https://res.cloudinary.com/test/avatar_second.jpg');

  // 2. Duplicate avatarUrl with intervening profilePhotoUrl: canonical key still governs both
  const mixedDupRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_early.jpg' },
        { key: 'profilePhotoUrl', value: 'https://res.cloudinary.com/test/profile_ignored.jpg' },
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_final.jpg' },
      ],
    }),
  });
  assert.strictEqual(mixedDupRes.status, 200);

  const getAfterMixed = await fetch(CONFIG_URL);
  const configAfterMixed = await getAfterMixed.json();
  assert.strictEqual(configAfterMixed.avatarUrl, 'https://res.cloudinary.com/test/avatar_final.jpg');
  assert.strictEqual(configAfterMixed.profilePhotoUrl, 'https://res.cloudinary.com/test/avatar_final.jpg');
});

test('Avatar Config Consistency: Bulk update containing only avatarUrl synchronizes profilePhotoUrl and preserves unrelated settings', async () => {
  // 1. Seed baseline with unrelated settings
  const seedRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'defaultTheme', value: 'dark' },
        { key: 'githubUsername', value: 'anurag-jaiswal-aj' },
      ],
    }),
  });
  assert.strictEqual(seedRes.status, 200);

  // 2. Submit bulk update containing only avatarUrl
  const bulkAvatarOnlyRes = await fetch(CONFIG_URL, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      updates: [
        { key: 'avatarUrl', value: 'https://res.cloudinary.com/test/avatar_only_bulk.jpg' },
      ],
    }),
  });
  assert.strictEqual(bulkAvatarOnlyRes.status, 200);

  // 3. Verify profilePhotoUrl receives the same value and unrelated settings are preserved
  const getAfter = await fetch(CONFIG_URL);
  assert.strictEqual(getAfter.status, 200);
  const configAfter = await getAfter.json();
  assert.strictEqual(configAfter.avatarUrl, 'https://res.cloudinary.com/test/avatar_only_bulk.jpg');
  assert.strictEqual(configAfter.profilePhotoUrl, 'https://res.cloudinary.com/test/avatar_only_bulk.jpg');
  assert.strictEqual(configAfter.defaultTheme, 'dark');
  assert.strictEqual(configAfter.githubUsername, 'anurag-jaiswal-aj');
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
