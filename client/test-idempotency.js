import test from 'node:test';
import assert from 'node:assert';
import { generateIdempotencyKey, createIdempotencyKeyManager } from './src/utils/idempotency.js';

// SEC-24: Client Idempotency Generation and Retry Behavior Tests

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('SEC-24: generateIdempotencyKey generates valid RFC 4122 v4 UUIDs', () => {
  for (let i = 0; i < 50; i++) {
    const key = generateIdempotencyKey();
    assert.strictEqual(typeof key, 'string');
    assert.strictEqual(key.length, 36);
    assert.match(key, UUID_V4_REGEX, `Key "${key}" must be a valid UUID v4`);
  }
});

test('SEC-24: consecutive keys are distinct', () => {
  const keys = new Set();
  for (let i = 0; i < 100; i++) {
    const key = generateIdempotencyKey();
    assert.ok(!keys.has(key), 'Generated keys must be unique');
    keys.add(key);
  }
});

test('SEC-24: fallback using crypto.getRandomValues produces valid RFC 4122 UUID v4', () => {
  const originalRandomUUID = globalThis.crypto?.randomUUID;
  try {
    // Temporarily remove randomUUID to test getRandomValues fallback path
    if (globalThis.crypto) {
      delete globalThis.crypto.randomUUID;
    }

    const key = generateIdempotencyKey();
    assert.strictEqual(typeof key, 'string');
    assert.strictEqual(key.length, 36);
    assert.match(key, UUID_V4_REGEX, `Fallback key "${key}" must be a valid UUID v4`);

    // Verify version 4 nibble (index 14) and variant (index 19)
    assert.strictEqual(key[14], '4', 'Must set version nibble 4');
    assert.ok(['8', '9', 'a', 'b'].includes(key[19].toLowerCase()), 'Must set RFC 4122 variant nibble');
  } finally {
    if (originalRandomUUID && globalThis.crypto) {
      globalThis.crypto.randomUUID = originalRandomUUID;
    }
  }
});

test('SEC-24: refuses insecure random generation when crypto is absent', () => {
  const originalCrypto = globalThis.crypto;
  try {
    delete globalThis.crypto;
    assert.throws(
      () => generateIdempotencyKey(),
      /Cryptographically secure random values unavailable/i,
      'Must throw and refuse Math.random fallback'
    );
  } finally {
    globalThis.crypto = originalCrypto;
  }
});

test('SEC-24: createIdempotencyKeyManager preserves identical key across retries and refreshes on clear', () => {
  const manager = createIdempotencyKeyManager();
  assert.strictEqual(manager.getKey(), null);

  // Attempt 1
  const key1 = manager.getOrCreateKey();
  assert.match(key1, UUID_V4_REGEX);
  assert.strictEqual(manager.getKey(), key1);

  // Attempt 2 (retry on error)
  const key2 = manager.getOrCreateKey();
  assert.strictEqual(key1, key2, 'Retry must return the identical active idempotency key');

  // Attempt 3 (another retry)
  const key3 = manager.getOrCreateKey();
  assert.strictEqual(key1, key3, 'Subsequent retry must return the identical active idempotency key');

  // Clear on successful submission or form reset
  manager.clearKey();
  assert.strictEqual(manager.getKey(), null);

  // Next logical submission generates a brand new key
  const key4 = manager.getOrCreateKey();
  assert.match(key4, UUID_V4_REGEX);
  assert.notStrictEqual(key1, key4, 'New submission after clear must receive fresh key');
});

test('SEC-24: synchronous submittingRef guard suppresses rapid repeated clicks', async () => {
  const submittingRef = { current: false };
  let dispatchedCalls = 0;

  const handleSubmit = async () => {
    if (submittingRef.current) {
      return; // Suppressed
    }
    submittingRef.current = true;
    dispatchedCalls++;

    try {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 20));
    } finally {
      submittingRef.current = false;
    }
  };

  // Simulate user rapidly clicking button in same tick
  const click1 = handleSubmit();
  const click2 = handleSubmit();
  const click3 = handleSubmit();

  await Promise.all([click1, click2, click3]);

  assert.strictEqual(dispatchedCalls, 1, 'Only first click should initiate dispatch; subsequent clicks must be blocked');

  // After completion, next click is allowed
  await handleSubmit();
  assert.strictEqual(dispatchedCalls, 2, 'Subsequent click after completion must be permitted');
});
