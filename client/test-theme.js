import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import {
  normalizeDefaultTheme,
  resolveEffectiveTheme,
  safeGetStoredTheme,
  safeSetStoredTheme,
  safeRemoveStoredTheme,
  getSystemTheme,
} from './src/utils/themeHelper.js';

// ── SEC-22: Default Theme Configuration & Storage Regression Tests ───────────

test('SEC-22: normalizeDefaultTheme preserves valid values and falls back to system', () => {
  assert.strictEqual(normalizeDefaultTheme('light'), 'light');
  assert.strictEqual(normalizeDefaultTheme('dark'), 'dark');
  assert.strictEqual(normalizeDefaultTheme('system'), 'system');
  assert.strictEqual(normalizeDefaultTheme('  dark  '), 'dark');
  assert.strictEqual(normalizeDefaultTheme('  light  '), 'light');
  assert.strictEqual(normalizeDefaultTheme('  system  '), 'system');

  // Invalid or missing values must fall back to system
  assert.strictEqual(normalizeDefaultTheme(undefined), 'system');
  assert.strictEqual(normalizeDefaultTheme(null), 'system');
  assert.strictEqual(normalizeDefaultTheme(''), 'system');
  assert.strictEqual(normalizeDefaultTheme('   '), 'system');
  assert.strictEqual(normalizeDefaultTheme('neon-blue'), 'system');
  assert.strictEqual(normalizeDefaultTheme('DARK'), 'system');
  assert.strictEqual(normalizeDefaultTheme(123), 'system');
  assert.strictEqual(normalizeDefaultTheme({}), 'system');
  assert.strictEqual(normalizeDefaultTheme([]), 'system');
});

test('SEC-22: New visitor adopts configured dark default', () => {
  const isDark = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: 'dark',
    systemPrefersDark: false,
  });
  assert.strictEqual(isDark, true, 'New visitor with no saved preference must receive dark mode when site default is dark');
});

test('SEC-22: New visitor adopts configured light default', () => {
  const isDark = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: 'light',
    systemPrefersDark: true,
  });
  assert.strictEqual(isDark, false, 'New visitor with no saved preference must receive light mode when site default is light');
});

test('SEC-22: System default respects OS preference', () => {
  const isDarkWhenOsDark = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: 'system',
    systemPrefersDark: true,
  });
  assert.strictEqual(isDarkWhenOsDark, true, 'System default must be dark when OS prefers dark');

  const isDarkWhenOsLight = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: 'system',
    systemPrefersDark: false,
  });
  assert.strictEqual(isDarkWhenOsLight, false, 'System default must be light when OS prefers light');
});

test('SEC-22: Explicit saved light overrides configured dark', () => {
  const isDark = resolveEffectiveTheme({
    explicitPreference: 'light',
    defaultTheme: 'dark',
    systemPrefersDark: true,
  });
  assert.strictEqual(isDark, false, 'Explicitly saved light theme must strictly override configured dark default');
});

test('SEC-22: Explicit saved dark overrides configured light', () => {
  const isDark = resolveEffectiveTheme({
    explicitPreference: 'dark',
    defaultTheme: 'light',
    systemPrefersDark: false,
  });
  assert.strictEqual(isDark, true, 'Explicitly saved dark theme must strictly override configured light default');
});

test('SEC-22: Missing or invalid configuration falls back safely to system', () => {
  const invalidConfigs = [undefined, null, '', '   ', 'invalid-theme', 'neon', 42, true, {}];
  for (const bad of invalidConfigs) {
    const isDarkOsDark = resolveEffectiveTheme({
      explicitPreference: null,
      defaultTheme: bad,
      systemPrefersDark: true,
    });
    assert.strictEqual(isDarkOsDark, true, `Invalid config ${JSON.stringify(bad)} must fall back to OS dark`);

    const isDarkOsLight = resolveEffectiveTheme({
      explicitPreference: null,
      defaultTheme: bad,
      systemPrefersDark: false,
    });
    assert.strictEqual(isDarkOsLight, false, `Invalid config ${JSON.stringify(bad)} must fall back to OS light`);
  }
});

test('SEC-22: Config arriving after initial render updates a visitor who has no explicit preference', () => {
  // 1. Initial render before config arrives
  const initialTheme = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: undefined,
    systemPrefersDark: false,
  });
  assert.strictEqual(initialTheme, false, 'Initial state without config uses system light');

  // 2. Config arrives with defaultTheme: 'dark'
  const updatedTheme = resolveEffectiveTheme({
    explicitPreference: null,
    defaultTheme: 'dark',
    systemPrefersDark: false,
  });
  assert.strictEqual(updatedTheme, true, 'Arriving config must update visitor without explicit preference to dark');
});

test('SEC-22: Admin default changes do not override an explicit visitor choice', () => {
  // Visitor explicitly selected light
  const visitorChoice = 'light';

  // Admin changes site default from light to dark
  const themeAfterAdminChange = resolveEffectiveTheme({
    explicitPreference: visitorChoice,
    defaultTheme: 'dark',
    systemPrefersDark: true,
  });
  assert.strictEqual(themeAfterAdminChange, false, 'Admin default change must never override explicit visitor choice');
});

test('SEC-22: Storage operations work properly with healthy window.localStorage', () => {
  const dom = new JSDOM('', { url: 'http://localhost' });
  const originalWindow = globalThis.window;
  globalThis.window = dom.window;

  try {
    dom.window.localStorage.clear();
    assert.strictEqual(safeGetStoredTheme(), null, 'Empty storage must return null');

    safeSetStoredTheme('dark');
    assert.strictEqual(dom.window.localStorage.getItem('theme'), 'dark');
    assert.strictEqual(safeGetStoredTheme(), 'dark');

    safeSetStoredTheme('light');
    assert.strictEqual(dom.window.localStorage.getItem('theme'), 'light');
    assert.strictEqual(safeGetStoredTheme(), 'light');

    safeRemoveStoredTheme();
    assert.strictEqual(dom.window.localStorage.getItem('theme'), null);
    assert.strictEqual(safeGetStoredTheme(), null);

    // Any non-light/non-dark value in storage is treated as null
    dom.window.localStorage.setItem('theme', 'system');
    assert.strictEqual(safeGetStoredTheme(), null, 'Stored value "system" should be treated as uncustomized null');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('SEC-22: Storage reads, writes, and removals throwing exceptions do not crash theme logic', () => {
  const throwingStorage = {
    getItem() {
      throw new Error('SecurityError: The operation is insecure.');
    },
    setItem() {
      throw new Error('QuotaExceededError: The quota has been exceeded.');
    },
    removeItem() {
      throw new Error('SecurityError: The operation is insecure.');
    },
  };

  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: throwingStorage };

  try {
    // None of these should throw
    assert.strictEqual(safeGetStoredTheme(), null);
    assert.doesNotThrow(() => safeSetStoredTheme('dark'));
    assert.doesNotThrow(() => safeRemoveStoredTheme());

    // Theme resolution functions safely with storage disabled
    const isDark = resolveEffectiveTheme({
      explicitPreference: safeGetStoredTheme(),
      defaultTheme: 'dark',
      systemPrefersDark: false,
    });
    assert.strictEqual(isDark, true, 'Theme resolution must operate seamlessly even when storage throws');
  } finally {
    globalThis.window = originalWindow;
  }
});

test('SEC-22: matchMedia failure is safely handled without throwing', () => {
  const originalWindow = globalThis.window;
  globalThis.window = {
    matchMedia() {
      throw new Error('matchMedia unsupported');
    },
  };

  try {
    assert.strictEqual(getSystemTheme(), false, 'getSystemTheme must safely return false when matchMedia fails');
  } finally {
    globalThis.window = originalWindow;
  }
});
