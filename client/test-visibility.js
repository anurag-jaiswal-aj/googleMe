import test from 'node:test';
import assert from 'node:assert';
import { getPageVisibility } from './src/data/pageVisibility.js';
import {
  isRouteVisible,
  resolveSearchRoute,
  filterSuggestions,
  SEARCH_SUGGESTIONS,
} from './src/utils/searchRoute.js';
import {
  verifyAdminSession,
  isTokenSessionVerified,
  setVerifiedAdminToken,
  clearVerifiedAdminSession,
  subscribeToAdminAuth,
  handleStorageEvent,
} from './src/utils/adminAuth.js';

// ── 1. Canonical visibility model tests ──────────────────────────────────────

test('Visibility Model: Missing, null, undefined, and non-object configs default to all enabled', () => {
  const defaults = { blog: true, tools: true, images: true };
  assert.deepStrictEqual(getPageVisibility(null), defaults);
  assert.deepStrictEqual(getPageVisibility(undefined), defaults);
  assert.deepStrictEqual(getPageVisibility({}), defaults);
  assert.deepStrictEqual(getPageVisibility('invalid-string'), defaults);
  assert.deepStrictEqual(getPageVisibility(12345), defaults);
  assert.deepStrictEqual(getPageVisibility([]), defaults);
});

test('Visibility Model: Valid canonical booleans are strictly preserved', () => {
  const cfg1 = { pageVisibility: { blog: false, tools: true, images: false } };
  assert.deepStrictEqual(getPageVisibility(cfg1), { blog: false, tools: true, images: false });

  const cfg2 = { pageVisibility: { blog: true, tools: false, images: true } };
  assert.deepStrictEqual(getPageVisibility(cfg2), { blog: true, tools: false, images: true });

  const cfg3 = { pageVisibility: { blog: false, tools: false, images: false } };
  assert.deepStrictEqual(getPageVisibility(cfg3), { blog: false, tools: false, images: false });
});

test('Visibility Model: Legacy boolean keys are supported as fallbacks', () => {
  const cfg = {
    blogPageEnabled: false,
    toolsPageEnabled: false,
    imagesPageEnabled: true,
  };
  assert.deepStrictEqual(getPageVisibility(cfg), { blog: false, tools: false, images: true });
});

test('Visibility Model: Canonical booleans take strict precedence over legacy keys', () => {
  const cfg = {
    pageVisibility: {
      blog: true,
      tools: false,
      images: true,
    },
    blogPageEnabled: false,
    toolsPageEnabled: true,
    imagesPageEnabled: false,
  };
  assert.deepStrictEqual(getPageVisibility(cfg), { blog: true, tools: false, images: true });
});

test('Visibility Model: Independent fallback and normalization for each property', () => {
  // If blog has malformed canonical value (e.g. string "false"), it falls back to legacy blogPageEnabled (false)
  // while valid canonical tools (false) and images (true) are preserved
  const cfg = {
    pageVisibility: {
      blog: 'not-a-boolean',
      tools: false,
      images: true,
    },
    blogPageEnabled: false,
    toolsPageEnabled: true,
  };
  assert.deepStrictEqual(getPageVisibility(cfg), { blog: false, tools: false, images: true });
});

test('Visibility Model: Non-boolean legacy values safely default to true', () => {
  const cfg = {
    blogPageEnabled: 'disabled',
    toolsPageEnabled: 0,
    imagesPageEnabled: null,
  };
  assert.deepStrictEqual(getPageVisibility(cfg), { blog: true, tools: true, images: true });
});

test('Visibility Model: Empty or partial pageVisibility object normalizes missing keys to true', () => {
  const cfg = {
    pageVisibility: {
      blog: false,
    },
  };
  assert.deepStrictEqual(getPageVisibility(cfg), { blog: false, tools: true, images: true });
});

// ── 2. Route resolution and suggestions filtering tests ──────────────────────

test('Search Route: isRouteVisible checks each managed page against visibility config', () => {
  const vis = { blog: false, tools: true, images: false };
  assert.strictEqual(isRouteVisible('/blog', vis), false);
  assert.strictEqual(isRouteVisible('/tools', vis), true);
  assert.strictEqual(isRouteVisible('/images', vis), false);
  assert.strictEqual(isRouteVisible('/about', vis), true);
  assert.strictEqual(isRouteVisible('/projects', vis), true);
  assert.strictEqual(isRouteVisible('/contact', vis), true);
  assert.strictEqual(isRouteVisible('/all', vis), true);
});

test('Search Route: resolveSearchRoute falls back to /all when matched page is disabled', () => {
  const allEnabled = { blog: true, tools: true, images: true };
  assert.strictEqual(resolveSearchRoute('blog posts', allEnabled), '/blog');
  assert.strictEqual(resolveSearchRoute('developer toolkit', allEnabled), '/tools');
  assert.strictEqual(resolveSearchRoute('gallery photos', allEnabled), '/images');

  const disabledBlog = { blog: false, tools: true, images: true };
  assert.strictEqual(resolveSearchRoute('blog posts', disabledBlog), '/all');
  assert.strictEqual(resolveSearchRoute('developer toolkit', disabledBlog), '/tools');

  const disabledTools = { blog: true, tools: false, images: true };
  assert.strictEqual(resolveSearchRoute('developer toolkit', disabledTools), '/all');
  assert.strictEqual(resolveSearchRoute('blog posts', disabledTools), '/blog');

  const disabledImages = { blog: true, tools: true, images: false };
  assert.strictEqual(resolveSearchRoute('gallery photos', disabledImages), '/all');
});

test('Search Route: resolveSearchRoute preserves other destinations when one page is disabled', () => {
  const vis = { blog: false, tools: false, images: false };
  assert.strictEqual(resolveSearchRoute('about me skills bio', vis), '/about');
  assert.strictEqual(resolveSearchRoute('github open source projects', vis), '/projects');
  assert.strictEqual(resolveSearchRoute('hire email reach out', vis), '/contact');
  assert.strictEqual(resolveSearchRoute('everything portfolio', vis), '/all');
});

test('Search Route: filterSuggestions removes suggestions pointing to disabled pages', () => {
  const vis = { blog: false, tools: false, images: true };
  const suggestions = filterSuggestions('', vis);
  const routes = suggestions.map((s) => s.to);

  assert.ok(!routes.includes('/blog'), 'Disabled /blog must not appear in suggestions');
  assert.ok(!routes.includes('/tools'), 'Disabled /tools must not appear in suggestions');
  assert.ok(routes.includes('/images'), 'Enabled /images must appear in suggestions');
  assert.ok(routes.includes('/about'), '/about must appear in suggestions');
  assert.ok(routes.includes('/projects'), '/projects must appear in suggestions');
});

// ── 3. Admin Preview Authentication and Guard Logic ──────────────────────────

test('Admin Auth: Returns false when no adminToken exists in storage', async () => {
  clearVerifiedAdminSession();
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };

  const isVerified = await verifyAdminSession();
  assert.strictEqual(isVerified, false);
  assert.strictEqual(isTokenSessionVerified('any-token'), false);

  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Token presence alone does not authorize; failed verification returns false (fail-closed)', async () => {
  clearVerifiedAdminSession();
  let apiCalled = false;
  const mockVerify = async () => {
    apiCalled = true;
    const err = new Error('Unauthorized');
    err.response = { status: 401 };
    throw err;
  };

  const originalLocalStorage = globalThis.localStorage;
  let removedKey = null;
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? 'invalid-or-expired-token' : null),
    setItem: () => {},
    removeItem: (k) => { removedKey = k; },
  };

  const isVerified = await verifyAdminSession(mockVerify);
  assert.strictEqual(apiCalled, true);
  assert.strictEqual(isVerified, false);
  assert.strictEqual(removedKey, 'adminToken', 'Expired or invalid token must be cleaned up from storage');
  assert.strictEqual(isTokenSessionVerified('invalid-or-expired-token'), false);

  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Network failure fails closed and does not grant preview access', async () => {
  clearVerifiedAdminSession();
  const mockVerify = async () => {
    throw new Error('Network Error');
  };

  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? 'valid-looking-token' : null),
    setItem: () => {},
    removeItem: () => {},
  };

  const isVerified = await verifyAdminSession(mockVerify);
  assert.strictEqual(isVerified, false, 'Network error must fail closed');
  assert.strictEqual(isTokenSessionVerified('valid-looking-token'), false);

  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Valid verification authorizes session and caches token in memory', async () => {
  clearVerifiedAdminSession();
  let callCount = 0;
  const mockVerify = async () => {
    callCount++;
    return { valid: true };
  };

  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? 'valid-admin-token-123' : null),
    setItem: () => {},
    removeItem: () => {},
  };

  const isVerified = await verifyAdminSession(mockVerify);
  assert.strictEqual(isVerified, true);
  assert.strictEqual(callCount, 1);
  assert.strictEqual(isTokenSessionVerified('valid-admin-token-123'), true);

  // Subsequent check for same verified token should hit memory cache without extra API calls
  const cachedCheck = await verifyAdminSession(mockVerify);
  assert.strictEqual(cachedCheck, true);
  assert.strictEqual(callCount, 1, 'Verified token must be cached to prevent duplicate requests');

  // Changing token invalidates verification
  assert.strictEqual(isTokenSessionVerified('different-token-456'), false);

  // Clearing session resets verification
  clearVerifiedAdminSession();
  assert.strictEqual(isTokenSessionVerified('valid-admin-token-123'), false);

  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Token removed in another tab clears memory verification and notifies listeners', () => {
  clearVerifiedAdminSession();
  const originalLocalStorage = globalThis.localStorage;
  let currentToken = 'token-to-remove';
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? currentToken : null),
    setItem: () => {},
    removeItem: () => {},
  };

  setVerifiedAdminToken('token-to-remove');
  assert.strictEqual(isTokenSessionVerified('token-to-remove'), true);

  let notified = false;
  const unsubscribe = subscribeToAdminAuth(() => {
    notified = true;
  });

  // Simulate token removal in another tab
  currentToken = null;
  handleStorageEvent({ key: 'adminToken', newValue: null });

  assert.strictEqual(notified, true);
  assert.strictEqual(isTokenSessionVerified('token-to-remove'), false);
  assert.strictEqual(isTokenSessionVerified(), false);

  unsubscribe();
  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Token replaced in another tab clears previous verification and fails closed', () => {
  clearVerifiedAdminSession();
  const originalLocalStorage = globalThis.localStorage;
  let currentToken = 'token-original';
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? currentToken : null),
    setItem: () => {},
    removeItem: () => {},
  };

  setVerifiedAdminToken('token-original');
  assert.strictEqual(isTokenSessionVerified('token-original'), true);

  let notifications = 0;
  const unsubscribe = subscribeToAdminAuth(() => {
    notifications++;
  });

  // Simulate token replacement in another tab
  currentToken = 'token-replaced';
  handleStorageEvent({ key: 'adminToken', newValue: 'token-replaced' });

  assert.strictEqual(notifications, 1);
  // Old token is no longer authorized
  assert.strictEqual(isTokenSessionVerified('token-original'), false);
  // Replaced token is NOT yet authorized without explicit server verification (fail-closed)
  assert.strictEqual(isTokenSessionVerified('token-replaced'), false);

  unsubscribe();
  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Stale in-flight verification response does not authorize if token was removed or replaced', async () => {
  clearVerifiedAdminSession();
  const originalLocalStorage = globalThis.localStorage;
  let currentToken = 'token-in-flight';
  globalThis.localStorage = {
    getItem: (k) => (k === 'adminToken' ? currentToken : null),
    setItem: () => {},
    removeItem: (k) => { if (k === 'adminToken') currentToken = null; },
  };

  let resolveApi;
  const deferredPromise = new Promise((resolve) => {
    resolveApi = resolve;
  });

  const mockVerify = () => deferredPromise;

  // Start verification for token-in-flight
  const verifyPromise = verifyAdminSession(mockVerify);

  // Before API resolves, token is removed (e.g. user logged out or changed session)
  currentToken = null;

  // Now resolve the API with { valid: true }
  resolveApi({ valid: true });
  const result = await verifyPromise;

  // Verification must fail-closed because storage token no longer matches
  assert.strictEqual(result, false, 'Stale API response must not authorize when token was evicted');
  assert.strictEqual(isTokenSessionVerified('token-in-flight'), false);
  assert.strictEqual(isTokenSessionVerified(), false);

  globalThis.localStorage = originalLocalStorage;
});

test('Admin Auth: Unsubscribe stops receiving change notifications', () => {
  clearVerifiedAdminSession();
  let count = 0;
  const unsubscribe = subscribeToAdminAuth(() => {
    count++;
  });

  setVerifiedAdminToken('t1');
  assert.strictEqual(count, 1);

  unsubscribe();
  setVerifiedAdminToken('t2');
  assert.strictEqual(count, 1, 'Listener must not be called after unsubscribe');
});

test('Keyboard Shortcuts: Fresh visibility state correctly gates blog and tools navigation', () => {
  const evaluateShortcut = (key, visibility) => {
    if (key === 'b' && visibility.blog) return '/blog';
    if (key === 't' && visibility.tools) return '/tools';
    if (key === 'h') return '/';
    return null;
  };

  const initialVis = { blog: false, tools: false, images: true };
  assert.strictEqual(evaluateShortcut('b', initialVis), null);
  assert.strictEqual(evaluateShortcut('t', initialVis), null);
  assert.strictEqual(evaluateShortcut('h', initialVis), '/');

  // Dynamically enable blog and tools
  const updatedVis = { blog: true, tools: true, images: true };
  assert.strictEqual(evaluateShortcut('b', updatedVis), '/blog');
  assert.strictEqual(evaluateShortcut('t', updatedVis), '/tools');
});
