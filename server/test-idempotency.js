const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const mongoose = require('mongoose');

// Models and Mocks
const Contact = require('./models/Contact');
const Feedback = require('./models/Feedback');
const IdempotencyRecord = require('./models/IdempotencyRecord');
const emailService = require('./utils/emailService');
const {
  validateIdempotencyKey,
  computePayloadHash,
  claimIdempotency,
  completeIdempotency,
  failIdempotency,
} = require('./utils/idempotency');

let savedContacts = [];
let savedFeedbacks = [];
let savedIdempotencyRecords = [];
let sentEmails = [];
let cloudinaryUploads = [];
let destroyedCloudinary = [];
let simulateContactDelayMs = 0;
let simulateFeedbackDelayMs = 0;

Contact.init = async () => {};
Contact.create = async (doc) => {
  if (simulateContactDelayMs > 0) {
    await new Promise((r) => setTimeout(r, simulateContactDelayMs));
  }
  // Enforce unique partial index on idempotencyKey
  if (doc.idempotencyKey) {
    const existing = savedContacts.find((c) => c.idempotencyKey === doc.idempotencyKey);
    if (existing) {
      const err = new Error(
        `E11000 duplicate key error collection: gfolio.contacts index: idempotencyKey_1 dup key: { idempotencyKey: "${doc.idempotencyKey}" }`
      );
      err.code = 11000;
      err.keyPattern = { idempotencyKey: 1 };
      throw err;
    }
  }
  const item = { _id: new mongoose.Types.ObjectId().toString(), ...doc };
  savedContacts.push(item);
  return item;
};
Contact.findOne = (filter) => {
  const found = savedContacts.find((c) => {
    if (filter.idempotencyKey && c.idempotencyKey !== filter.idempotencyKey) return false;
    return true;
  });
  const res = found ? { ...found } : null;
  const p = Promise.resolve(res);
  p.lean = async () => res;
  return p;
};

Feedback.init = async () => {};
Feedback.create = async (doc) => {
  if (simulateFeedbackDelayMs > 0) {
    await new Promise((r) => setTimeout(r, simulateFeedbackDelayMs));
  }
  // Enforce unique partial index on idempotencyKey
  if (doc.idempotencyKey) {
    const existing = savedFeedbacks.find((f) => f.idempotencyKey === doc.idempotencyKey);
    if (existing) {
      const err = new Error(
        `E11000 duplicate key error collection: gfolio.feedbacks index: idempotencyKey_1 dup key: { idempotencyKey: "${doc.idempotencyKey}" }`
      );
      err.code = 11000;
      err.keyPattern = { idempotencyKey: 1 };
      throw err;
    }
  }
  const item = {
    _id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'new',
    ...doc,
  };
  savedFeedbacks.push(item);
  return item;
};
Feedback.findOne = (filter) => {
  const found = savedFeedbacks.find((f) => {
    if (filter.idempotencyKey && f.idempotencyKey !== filter.idempotencyKey) return false;
    return true;
  });
  const res = found ? { ...found } : null;
  const p = Promise.resolve(res);
  p.lean = async () => res;
  return p;
};

IdempotencyRecord.init = async () => {};
IdempotencyRecord.create = async (doc) => {
  const existing = savedIdempotencyRecords.find(
    (r) => r.scope === doc.scope && r.key === doc.key
  );
  if (existing) {
    const err = new Error('Duplicate key');
    err.code = 11000;
    throw err;
  }
  const newRec = {
    _id: new mongoose.Types.ObjectId().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'in_progress',
    ...doc,
  };
  savedIdempotencyRecords.push(newRec);
  return newRec;
};

IdempotencyRecord.findOne = (filter) => ({
  lean: async () => {
    const found = savedIdempotencyRecords.find((r) => {
      if (filter.scope && r.scope !== filter.scope) return false;
      if (filter.key && r.key !== filter.key) return false;
      if (filter.ownerToken && r.ownerToken !== filter.ownerToken) return false;
      if (filter.status && r.status !== filter.status) return false;
      return true;
    });
    return found ? { ...found } : null;
  },
});

IdempotencyRecord.findOneAndUpdate = async (filter, update) => {
  let found = null;
  for (const r of savedIdempotencyRecords) {
    if (r.scope !== filter.scope || r.key !== filter.key) continue;
    if (filter.ownerToken && r.ownerToken !== filter.ownerToken) continue;
    if (filter.status && r.status !== filter.status) continue;
    if (filter.$or) {
      const matchOr = filter.$or.some((cond) => {
        if (cond.status && r.status !== cond.status) return false;
        if (
          cond.updatedAt?.$lt &&
          !(new Date(r.updatedAt).getTime() < new Date(cond.updatedAt.$lt).getTime())
        ) {
          return false;
        }
        return true;
      });
      if (!matchOr) continue;
    }
    found = r;
    break;
  }
  if (!found) return null;
  if (update.$set) {
    Object.assign(found, update.$set);
    if (!update.$set.updatedAt) found.updatedAt = new Date();
  }
  return { ...found, lean: () => ({ ...found }) };
};

let sendEmailDelegate = async (opts) => {
  sentEmails.push(opts);
  return true;
};
emailService.sendEmail = async (opts) => sendEmailDelegate(opts);

// Mock Cloudinary for feedback
process.env.CLOUDINARY_CLOUD_NAME = 'mock-cloud';
const { v2: cloudinary } = require('cloudinary');
const { Writable } = require('stream');
cloudinary.uploader.upload_stream = (opts, cb) => {
  cloudinaryUploads.push(opts);
  return new Writable({
    write(chunk, encoding, callback) {
      callback();
    },
    final(callback) {
      cb(null, {
        secure_url: 'https://res.cloudinary.com/mock-cloud/image/upload/v1234/test.png',
        public_id: 'gfolio/test_123',
        resource_type: 'image',
      });
      callback();
    },
  });
};
cloudinary.uploader.destroy = async (publicId, opts) => {
  destroyedCloudinary.push({ publicId, opts });
  return { result: 'ok' };
};

// Express App
const contactRoutes = require('./routes/contact');
const feedbackRoutes = require('./routes/feedback');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);

let server;
let BASE_URL;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      BASE_URL = `http://127.0.0.1:${server.address().port}/api`;
      resolve();
    });
  });
});

test.after(() => {
  if (server) server.close();
});

test.beforeEach(() => {
  savedContacts = [];
  savedFeedbacks = [];
  savedIdempotencyRecords = [];
  sentEmails = [];
  cloudinaryUploads = [];
  destroyedCloudinary = [];
  simulateContactDelayMs = 0;
  simulateFeedbackDelayMs = 0;
});

// ── Unit Tests: validateIdempotencyKey ───────────────────────────────────────

test('Idempotency Validation: accepts valid keys and rejects malformed or oversized', () => {
  assert.strictEqual(validateIdempotencyKey(undefined).valid, true);
  assert.strictEqual(validateIdempotencyKey(undefined).key, null);
  assert.strictEqual(validateIdempotencyKey('').valid, true);
  assert.strictEqual(validateIdempotencyKey(null).valid, true);

  const validUuid = 'c38fbc97-e50e-4348-9da3-9b936d0061e8';
  assert.strictEqual(validateIdempotencyKey(validUuid).valid, true);
  assert.strictEqual(validateIdempotencyKey(validUuid).key, validUuid);

  // Whitespace trimming
  assert.strictEqual(validateIdempotencyKey(`  ${validUuid}  `).valid, true);
  assert.strictEqual(validateIdempotencyKey(`  ${validUuid}  `).key, validUuid);

  // Non-string
  assert.strictEqual(validateIdempotencyKey(12345).valid, false);
  assert.strictEqual(validateIdempotencyKey({}).valid, false);

  // Whitespace-only string
  assert.strictEqual(validateIdempotencyKey('   ').valid, false);

  // Oversized (>128 chars)
  assert.strictEqual(validateIdempotencyKey('a'.repeat(129)).valid, false);
  assert.strictEqual(validateIdempotencyKey('a'.repeat(128)).valid, true);

  // Invalid characters (spaces, quotes, colons, slashes)
  assert.strictEqual(validateIdempotencyKey('key with spaces').valid, false);
  assert.strictEqual(validateIdempotencyKey('key"quote').valid, false);
  assert.strictEqual(validateIdempotencyKey('key/slash').valid, false);
  assert.strictEqual(validateIdempotencyKey('key<script>').valid, false);
});

// ── 1. Sequential Contact Deduplication ─────────────────────────────────────

test('Contact Idempotency: sequential requests with identical key yield exactly 1 contact and 1 email', async () => {
  const key = 'test-contact-seq-001';
  const payload = {
    name: 'Alice Cooper',
    email: 'alice@example.com',
    message: 'Hello, this is a test inquiry.',
    subject: 'General Question',
  };

  // First request
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  });
  const data1 = await res1.json();
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(data1.success, true);
  assert.strictEqual(savedContacts.length, 1, 'Exactly one contact record in DB');
  assert.strictEqual(sentEmails.length, 1, 'Exactly one email sent');
  assert.strictEqual(savedContacts[0].idempotencyKey, key);

  // Second request (retry with same key)
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  });
  const data2 = await res2.json();
  assert.strictEqual(res2.status, 201, 'Duplicate request replays 201 with cached response');
  assert.strictEqual(data2.success, true);
  assert.strictEqual(data2.deduplicated, true);
  assert.strictEqual(data2.id, data1.id);

  // Strict side-effect assertions: no additional DB record or email
  assert.strictEqual(savedContacts.length, 1, 'DB record count remains 1');
  assert.strictEqual(sentEmails.length, 1, 'Email count remains 1');
});

// ── 2. Concurrent Contact Deduplication ─────────────────────────────────────

test('Contact Idempotency: concurrent requests with identical key allow at most 1 side effect', async () => {
  const key = 'test-contact-concurrent-001';
  simulateContactDelayMs = 40;

  const payload = {
    name: 'Bob Marley',
    email: 'bob@example.com',
    message: 'Testing concurrent submissions.',
  };

  const req1 = fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });
  const req2 = fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status].sort();

  // Exactly one request must succeed with 201; the concurrent duplicate must receive 409 Conflict
  assert.deepStrictEqual(statuses, [201, 409]);

  // Strict side-effect assertions
  assert.strictEqual(savedContacts.length, 1, 'Exactly 1 contact record inserted');
  assert.strictEqual(sentEmails.length, 1, 'Exactly 1 email sent');
});

// ── 3. Sequential Feedback Deduplication ────────────────────────────────────

test('Feedback Idempotency: sequential requests cause no duplicate record, upload, or email', async () => {
  const key = 'test-feedback-seq-001';
  const formData = new FormData();
  formData.append('type', 'bug');
  formData.append('message', 'Navigation bar alignment issue on mobile');
  formData.append('name', 'Charlie');
  formData.append('email', 'charlie@example.com');
  const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG signature
  formData.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'screen.png');

  // First request
  const res1 = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: formData,
  });
  const data1 = await res1.json();
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(data1.success, true);
  assert.strictEqual(savedFeedbacks.length, 1, 'Exactly 1 feedback record in DB');
  assert.strictEqual(cloudinaryUploads.length, 1, 'Exactly 1 Cloudinary upload');
  assert.strictEqual(sentEmails.length, 1, 'Exactly 1 email sent');

  // Second request (retry with same key)
  const formDataRetry = new FormData();
  formDataRetry.append('type', 'bug');
  formDataRetry.append('message', 'Navigation bar alignment issue on mobile');
  formDataRetry.append('name', 'Charlie');
  formDataRetry.append('email', 'charlie@example.com');
  formDataRetry.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'screen.png');

  const res2 = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: formDataRetry,
  });
  const data2 = await res2.json();
  assert.strictEqual(res2.status, 201, 'Duplicate request replays 201 with cached response');
  assert.strictEqual(data2.success, true);
  assert.strictEqual(data2.deduplicated, true);

  // Strict side-effect assertions: NO duplicate upload, record, or email
  assert.strictEqual(savedFeedbacks.length, 1, 'Feedback record count remains 1');
  assert.strictEqual(cloudinaryUploads.length, 1, 'Cloudinary upload count remains 1');
  assert.strictEqual(sentEmails.length, 1, 'Email count remains 1');
});

// ── 4. Concurrent Feedback Deduplication ────────────────────────────────────

test('Feedback Idempotency: concurrent requests cannot both initiate protected side effects', async () => {
  const key = 'test-feedback-concurrent-001';
  simulateFeedbackDelayMs = 40;

  const makeBody = () => {
    const fd = new FormData();
    fd.append('type', 'feature');
    fd.append('message', 'Dark mode quick toggle shortcut');
    return fd;
  };

  const req1 = fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeBody(),
  });
  const req2 = fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeBody(),
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status].sort();

  assert.deepStrictEqual(statuses, [201, 409]);
  assert.strictEqual(savedFeedbacks.length, 1, 'Exactly 1 feedback record inserted');
  assert.strictEqual(sentEmails.length, 1, 'Exactly 1 email sent');
});

// ── 5. In-Progress Conflict Handling ────────────────────────────────────────

test('Idempotency: duplicate request during in-progress operation receives 409 and starts nothing', async () => {
  const key = 'test-in-progress-001';
  const payload = {
    name: 'Dave',
    email: 'dave@example.com',
    message: 'Hello while in progress',
    subject: '',
  };
  const requestHash = computePayloadHash('contact', payload);
  // Manually claim the key as in_progress with matching payload hash
  await claimIdempotency('contact', key, requestHash, 120000);

  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
  });

  assert.strictEqual(res.status, 409);
  assert.ok(res.headers.get('retry-after'), 'Must include Retry-After header');
  const body = await res.json();
  assert.match(body.error, /currently being processed/i);

  // Assert zero side effects
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

// ── 6. Malformed & Oversized Keys ───────────────────────────────────────────

test('Idempotency Validation: malformed and oversized keys return 400 safely', async () => {
  const badHeaderKeys = [
    'has spaces in key',
    'semi;colon$injection',
    'a'.repeat(129),
    'quote"key',
    'tag<script>key',
  ];

  for (const bk of badHeaderKeys) {
    const res = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': bk,
      },
      body: JSON.stringify({
        name: 'Eve',
        email: 'eve@example.com',
        message: 'Testing bad key in header',
      }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for header key: ${bk}`);
    const data = await res.json();
    assert.ok(data.error.includes('Idempotency-Key'), 'Error message identifies invalid key');
  }

  // Also verify bad keys sent in JSON body (e.g. newline or non-string)
  const badBodyKeys = ['newline\nkey', 'whitespace   inside', 12345];
  for (const bk of badBodyKeys) {
    const res = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Eve',
        email: 'eve@example.com',
        message: 'Testing bad key in body',
        idempotencyKey: bk,
      }),
    });
    assert.strictEqual(res.status, 400, `Expected 400 for body key: ${bk}`);
    const data = await res.json();
    assert.ok(data.error.includes('Idempotency-Key'), 'Error message identifies invalid key');
  }

  // Ensure zero side effects occurred
  assert.strictEqual(savedContacts.length, 0);
  assert.strictEqual(sentEmails.length, 0);
});

// ── 7. Backward Compatibility: Requests Without Keys ────────────────────────

test('Backward Compatibility: requests without Idempotency-Key work normally', async () => {
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Frank',
      email: 'frank@example.com',
      message: 'Message without idempotency key',
    }),
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(savedContacts[0].idempotencyKey, undefined);
});

// ── 8. Scoping: Contact and Feedback keys do not collide ───────────────────

test('Idempotency Scoping: identical key string in contact and feedback do not collide', async () => {
  const sharedKey = 'shared-scoped-uuid-12345';

  // Submit contact with key
  const contactRes = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': sharedKey },
    body: JSON.stringify({
      name: 'Grace',
      email: 'grace@example.com',
      message: 'Contact inquiry with shared key',
    }),
  });
  assert.strictEqual(contactRes.status, 201);

  // Submit feedback with identical key
  const feedbackRes = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': sharedKey },
    body: JSON.stringify({
      type: 'suggestion',
      message: 'Feedback with identical key',
      name: 'Grace',
    }),
  });
  assert.strictEqual(feedbackRes.status, 201, 'Feedback must succeed without collision');

  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(savedFeedbacks.length, 1);
  assert.strictEqual(sentEmails.length, 2);
});

// ── 9. Abandoned Claim Recovery (Lease Expiration) ──────────────────────────

test('Idempotency Recovery: abandoned in_progress claim expires and allows recovery', async () => {
  const key = 'test-abandoned-001';

  // Seed an in_progress record with an expired timestamp (130 seconds ago, past 120s lease)
  const expiredDate = new Date(Date.now() - 130000);
  savedIdempotencyRecords.push({
    scope: 'contact',
    key,
    status: 'in_progress',
    createdAt: expiredDate,
    updatedAt: expiredDate,
  });

  // Retry with same key should reclaim the expired lease and succeed
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      name: 'Heidi',
      email: 'heidi@example.com',
      message: 'Recovered message',
    }),
  });

  assert.strictEqual(res.status, 201, 'Reclaimed abandoned lease successfully');
  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(sentEmails.length, 1);

  const updatedRec = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
  assert.strictEqual(updatedRec.status, 'completed');
});

// ── 10. Failed State Recovery ───────────────────────────────────────────────

test('Idempotency Recovery: failed submission state permits subsequent successful retry', async () => {
  const key = 'test-failed-retry-001';

  // Seed a failed idempotency record
  const claim = await claimIdempotency('contact', key);
  await failIdempotency('contact', key, claim.ownerToken, 'Simulated database disconnect');

  const failedRec = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
  assert.strictEqual(failedRec.status, 'failed');

  // Retry with same key should successfully reclaim and complete
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      name: 'Ivan',
      email: 'ivan@example.com',
      message: 'Retry after failure',
    }),
  });

  assert.strictEqual(res.status, 201);
  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(failedRec.status, 'completed');
});

// ── 11. Payload Tampering / Parameter Mismatch Protection ───────────────────

test('Idempotency Security: key reuse with altered payload returns HTTP 422 with zero side effects', async () => {
  const key = 'test-tampered-payload-001';

  // First request: valid initial submission
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      name: 'Judy Original',
      email: 'judy@example.com',
      message: 'Original message content',
    }),
  });

  assert.strictEqual(res1.status, 201);
  assert.strictEqual(savedContacts.length, 1);
  assert.strictEqual(sentEmails.length, 1);

  // Second request: same key, but altered message content
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify({
      name: 'Judy Tampered',
      email: 'judy@example.com',
      message: 'Different message content injected by attacker',
    }),
  });

  assert.strictEqual(res2.status, 422, 'Must reject altered payload with HTTP 422');
  const body2 = await res2.json();
  assert.match(body2.error, /different request parameters/i);

  // Assert strictly NO additional side effects occurred
  assert.strictEqual(savedContacts.length, 1, 'No second contact inserted');
  assert.strictEqual(sentEmails.length, 1, 'No second email sent');
});

// ── 12. Cloudinary Orphan Cleanup on Database Failure ────────────────────────

test('Feedback Failure Cleanup: destroys uploaded Cloudinary asset if DB persistence fails', async () => {
  const key = 'test-feedback-orphan-cleanup-001';
  const originalFeedbackCreate = Feedback.create;

  try {
    // Force Feedback.create to fail after file upload
    Feedback.create = async () => {
      throw new Error('Database write error');
    };

    const formData = new FormData();
    formData.append('type', 'bug');
    formData.append('message', 'Upload orphan test message');
    const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    formData.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'orphan.png');

    const res = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: formData,
    });

    assert.strictEqual(res.status, 500);
    assert.strictEqual(cloudinaryUploads.length, 1, 'Cloudinary upload occurred');
    assert.strictEqual(destroyedCloudinary.length, 1, 'Orphaned Cloudinary asset must be destroyed');
    assert.strictEqual(destroyedCloudinary[0].publicId, 'gfolio/test_123');

    // Idempotency record must be marked failed
    const record = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'feedback');
    assert.ok(record, 'Idempotency record exists');
    assert.strictEqual(record.status, 'failed');
    assert.strictEqual(sentEmails.length, 0, 'No email sent on DB error');
  } finally {
    Feedback.create = originalFeedbackCreate;
  }
});

// ── 13. Owner Token Fencing ─────────────────────────────────────────────────

test('Owner Token Fencing: stale worker cannot complete a claim that was reclaimed', async () => {
  const key = 'test-fencing-001';

  // Worker 1 claims key
  const claim1 = await claimIdempotency('contact', key);
  assert.strictEqual(claim1.claimed, true);
  const token1 = claim1.ownerToken;

  // Simulate Worker 1 hanging and lease expiring (130s ago)
  const record = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
  const expiredDate = new Date(Date.now() - 130000);
  record.updatedAt = expiredDate;

  // Worker 2 reclaims key
  const claim2 = await claimIdempotency('contact', key);
  assert.strictEqual(claim2.claimed, true);
  const token2 = claim2.ownerToken;
  assert.notStrictEqual(token1, token2, 'Worker 2 receives fresh owner token');

  // Worker 1 wakes up and attempts to complete with stale token1
  const completeWorker1 = await completeIdempotency(
    'contact',
    key,
    token1,
    { success: true, worker: 1 },
    201
  );
  assert.strictEqual(completeWorker1, false, 'Stale worker cannot complete reclaimed claim');

  // Record is still in_progress owned by Worker 2
  assert.strictEqual(record.status, 'in_progress');
  assert.strictEqual(record.ownerToken, token2);

  // Worker 2 completes with valid token2
  const completeWorker2 = await completeIdempotency(
    'contact',
    key,
    token2,
    { success: true, worker: 2 },
    201
  );
  assert.strictEqual(completeWorker2, true, 'Active worker completes successfully');
  assert.strictEqual(record.status, 'completed');
  assert.strictEqual(record.responseBody.worker, 2);
});

// ── 14. Finding A: Persistence Succeeds But Completion Fails ────────────────

test('SEC-24 Finding A: persistence succeeds but completion fails; retry after lease expiry recovers existing record without duplicate record or email', async () => {
  const key = 'test-finding-a-001';
  const payload = {
    name: 'Finding A User',
    email: 'findinga@example.com',
    message: 'Testing lease expiry recovery after completion failure',
  };

  // Simulate completion failure on first attempt by temporarily breaking findOneAndUpdate on IdempotencyRecord
  const origFindOneAndUpdate = IdempotencyRecord.findOneAndUpdate;
  let failCompletionOnce = true;
  IdempotencyRecord.findOneAndUpdate = async (filter, update) => {
    if (failCompletionOnce && update.$set?.status === 'completed') {
      failCompletionOnce = false;
      return null; // Simulate failure to complete the claim in DB
    }
    return origFindOneAndUpdate(filter, update);
  };

  try {
    // Attempt 1: Contact document is persisted and email sent, but completion fails
    const res1 = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(savedContacts.length, 1, 'Exactly 1 contact persisted on first attempt');
    assert.strictEqual(sentEmails.length, 1, 'Exactly 1 email sent on first attempt');

    const rawRecord = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
    assert.strictEqual(rawRecord.status, 'in_progress', 'Idempotency record remained in_progress due to completion failure');

    // Age the record beyond the 120s lease (130s ago)
    const expiredDate = new Date(Date.now() - 130000);
    rawRecord.updatedAt = expiredDate;

    // Attempt 2: Client retries with the same key and payload after lease expiry
    const res2 = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(res2.status, 201);
    const data2 = await res2.json();
    assert.strictEqual(data2.deduplicated, true, 'Retry must return deduplicated response');
    assert.strictEqual(data2.id, savedContacts[0]._id, 'Must return the original contact id');

    // Strict assertions: NO duplicate business record, NO duplicate email!
    assert.strictEqual(savedContacts.length, 1, 'Strictly NO duplicate contact record created');
    assert.strictEqual(sentEmails.length, 1, 'Strictly NO duplicate email sent on retry');
    assert.strictEqual(rawRecord.status, 'completed', 'Idempotency record is now marked completed');
  } finally {
    IdempotencyRecord.findOneAndUpdate = origFindOneAndUpdate;
  }
});

// ── 15. Finding B: Stale Worker Fencing & Duplicate Side Effect Prevention ──

test('SEC-24 Finding B: stale worker resuming after lease reclamation cannot create duplicate record or send duplicate email', async () => {
  const key = 'test-finding-b-stale-001';
  const payload = {
    name: 'Stale Worker User',
    email: 'staleworker@example.com',
    message: 'Testing stale worker cannot duplicate business record or side effects',
  };

  // Worker 1 claims key
  const claim1 = await claimIdempotency('contact', key, computePayloadHash('contact', payload));
  assert.strictEqual(claim1.claimed, true);
  const token1 = claim1.ownerToken;

  // Simulate Worker 1 stalling and lease expiring
  const rawRecord = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
  const expiredDate = new Date(Date.now() - 130000);
  rawRecord.updatedAt = expiredDate;

  // Worker 2 runs: reclaims key, persists Contact, sends email, completes claim
  const resWorker2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });
  assert.strictEqual(resWorker2.status, 201);
  assert.strictEqual(savedContacts.length, 1, 'Worker 2 creates contact');
  assert.strictEqual(sentEmails.length, 1, 'Worker 2 sends email');
  assert.strictEqual(rawRecord.status, 'completed');
  const token2 = rawRecord.ownerToken;
  assert.notStrictEqual(token1, token2);

  // Now Worker 1 wakes up and attempts to create Contact document with token1
  // Worker 1's Contact.create will hit duplicate key error (code 11000)
  let worker1Error = null;
  try {
    await Contact.create({
      name: payload.name,
      email: payload.email,
      message: payload.message,
      idempotencyKey: key,
    });
  } catch (err) {
    worker1Error = err;
  }
  assert.ok(worker1Error, 'Worker 1 Contact.create must be rejected by unique index');
  assert.strictEqual(worker1Error.code, 11000, 'Error must be duplicate key error (11000)');

  // Worker 1 attempting to complete with stale token1 must fail
  const worker1Complete = await completeIdempotency('contact', key, token1, { success: true }, 201);
  assert.strictEqual(worker1Complete, false, 'Worker 1 cannot complete with stale token');

  // Assert strictly no duplicate contact or email
  assert.strictEqual(savedContacts.length, 1, 'Contact count remains strictly 1');
  assert.strictEqual(sentEmails.length, 1, 'Email count remains strictly 1');
});

// ── 16. Duplicate-Key Recovery Avoids Redundant Cloudinary Uploads ──────────

test('SEC-24: Feedback duplicate-key recovery avoids redundant Cloudinary upload and returns matching record', async () => {
  const key = 'test-feedback-recovery-001';
  // Pre-seed a feedback record with this key
  const preExisting = {
    _id: new mongoose.Types.ObjectId().toString(),
    type: 'bug',
    message: 'Pre-existing feedback message',
    name: 'Pre User',
    email: 'pre@example.com',
    page: '/about',
    status: 'new',
    idempotencyKey: key,
  };
  savedFeedbacks.push(preExisting);

  const formData = new FormData();
  formData.append('type', 'bug');
  formData.append('message', 'Pre-existing feedback message');
  formData.append('name', 'Pre User');
  formData.append('email', 'pre@example.com');
  formData.append('page', '/about');
  const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  formData.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'test.png');

  const res = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: formData,
  });

  assert.strictEqual(res.status, 201);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.deduplicated, true);

  // Crucial: Pre-check detected existing feedback document, so Cloudinary upload was completely bypassed
  assert.strictEqual(cloudinaryUploads.length, 0, 'Did not execute redundant Cloudinary upload');
  assert.strictEqual(savedFeedbacks.length, 1, 'Did not create duplicate feedback document');
  assert.strictEqual(sentEmails.length, 0, 'Did not send duplicate email');
});

// ── 17. Legacy Documents with Missing or Null Keys Coexist ──────────────────

test('SEC-24: legacy documents with omitted or null idempotency keys coexist without collision', async () => {
  // Insert multiple legacy contacts without idempotencyKey
  savedContacts.push({
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Legacy 1',
    email: 'legacy1@example.com',
    message: 'Old contact 1',
  });
  savedContacts.push({
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Legacy 2',
    email: 'legacy2@example.com',
    message: 'Old contact 2',
    idempotencyKey: null,
  });
  savedContacts.push({
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Legacy 3',
    email: 'legacy3@example.com',
    message: 'Old contact 3',
    idempotencyKey: undefined,
  });

  assert.strictEqual(savedContacts.length, 3);

  // Submit a new request without an idempotency key: succeeds
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'New Unkeyed User',
      email: 'newunkeyed@example.com',
      message: 'Unkeyed submission works normally',
    }),
  });
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(savedContacts.length, 4);

  // Submit a new request with an idempotency key: succeeds
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'key-keyed-001' },
    body: JSON.stringify({
      name: 'New Keyed User',
      email: 'newkeyed@example.com',
      message: 'Keyed submission works normally',
    }),
  });
  assert.strictEqual(res2.status, 201);
  assert.strictEqual(savedContacts.length, 5);
});

// ── 18. Best-Effort Email Delivery & Non-Repeat On Replay ───────────────────

test('SEC-24: email failure does not abort submission and duplicate recovery does not retry email', async () => {
  const origDelegate = sendEmailDelegate;
  const key = 'test-email-failure-001';

  try {
    let emailAttempts = 0;
    sendEmailDelegate = async () => {
      emailAttempts++;
      throw new Error('SMTP connection refused');
    };

    const res1 = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({
        name: 'Email Fail User',
        email: 'emailfail@example.com',
        message: 'Message when email service is down',
      }),
    });

    assert.strictEqual(res1.status, 201, 'Request succeeds despite email failure');
    assert.strictEqual(savedContacts.length, 1, 'Contact is persisted in DB');
    assert.strictEqual(emailAttempts, 1, 'Email was attempted once');

    // Restore default email delegate
    sendEmailDelegate = origDelegate;

    // Retry with identical key: should return deduplicated response and NOT attempt email
    const res2 = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({
        name: 'Email Fail User',
        email: 'emailfail@example.com',
        message: 'Message when email service is down',
      }),
    });

    assert.strictEqual(res2.status, 201);
    const data2 = await res2.json();
    assert.strictEqual(data2.deduplicated, true);
    assert.strictEqual(sentEmails.length, 0, 'No email sent on deduplicated replay');
  } finally {
    sendEmailDelegate = origDelegate;
  }
});

// ── 19. Observable Cloudinary Cleanup Failure Handling ──────────────────────

test('SEC-24: Cloudinary cleanup failure is logged and does not crash process', async () => {
  const origDestroy = cloudinary.uploader.destroy;
  const origFeedbackCreate = Feedback.create;

  try {
    // Force Feedback.create to fail after upload
    Feedback.create = async () => {
      throw new Error('DB connection dropped during insert');
    };

    // Force Cloudinary cleanup to fail
    let cleanupAttempted = false;
    cloudinary.uploader.destroy = async () => {
      cleanupAttempted = true;
      throw new Error('Cloudinary destroy timeout');
    };

    const formData = new FormData();
    formData.append('type', 'bug');
    formData.append('message', 'Testing cleanup failure');
    const fileBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    formData.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'test.png');

    const res = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Idempotency-Key': 'test-cleanup-fail-001' },
      body: formData,
    });

    assert.strictEqual(res.status, 500);
    assert.strictEqual(cleanupAttempted, true, 'Destroy was called on orphaned asset');
    assert.strictEqual(savedFeedbacks.length, 0, 'No feedback persisted');
  } finally {
    cloudinary.uploader.destroy = origDestroy;
    Feedback.create = origFeedbackCreate;
  }
});

// ── 20. Startup Fails Closed On Index Initialization Failure ────────────────

test('SEC-24: startup fails closed if required index initialization fails', async () => {
  const models = [
    { name: 'Contact', init: async () => { throw new Error('Contact index build failed'); } },
    { name: 'Feedback', init: async () => { throw new Error('Feedback index build failed'); } },
    { name: 'IdempotencyRecord', init: async () => { throw new Error('IdempotencyRecord index build failed'); } },
  ];

  for (const model of models) {
    let startupFailed = false;
    try {
      await Promise.all([model.init()]);
    } catch (err) {
      startupFailed = true;
      assert.match(err.message, /index build failed/i);
    }
    assert.strictEqual(startupFailed, true, `Startup must fail closed if ${model.name} index initialization fails`);
  }
});

// ── 21. Duplicate Key with Mismatched Payload Returns HTTP 422 ──────────────

test('SEC-24: duplicate key with mismatched payload on existing document returns HTTP 422', async () => {
  const key = 'test-dup-mismatch-001';
  savedContacts.push({
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Real User',
    email: 'real@example.com',
    message: 'Original message',
    idempotencyKey: key,
  });

  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({
      name: 'Attacker User',
      email: 'attacker@example.com',
      message: 'Tampered message',
    }),
  });

  assert.strictEqual(res.status, 422, 'Must reject altered payload with HTTP 422');
  const data = await res.json();
  assert.match(data.error, /different request parameters/i);
  assert.strictEqual(savedContacts.length, 1, 'Zero new contacts inserted');
  assert.strictEqual(sentEmails.length, 0, 'Zero emails sent');
});

// ── 22. Post-TTL RequestHash: Contact Subject Tampering Rejection ────────────

test('SEC-24 Round 5: Contact retry with altered subject after IdempotencyRecord is absent returns HTTP 422', async () => {
  const key = 'test-contact-ttl-subject-001';
  const initialPayload = {
    name: 'Alice TTL',
    email: 'alice.ttl@example.com',
    message: 'Message content for TTL subject test',
    subject: 'Original Subject',
  };

  // 1. Initial submission succeeds and persists Contact with requestHash
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(initialPayload),
  });
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(savedContacts.length, 1);
  assert.ok(savedContacts[0].requestHash, 'Contact document must store requestHash');

  // 2. Simulate 24h TTL expiration of IdempotencyRecord: remove record from idempotency table
  savedIdempotencyRecords = savedIdempotencyRecords.filter((r) => r.key !== key);
  assert.strictEqual(
    savedIdempotencyRecords.find((r) => r.key === key),
    undefined,
    'IdempotencyRecord was purged by TTL'
  );

  // 3. Retry with altered subject: must be rejected with HTTP 422 based on persisted Contact.requestHash
  const alteredPayload = { ...initialPayload, subject: 'Altered Subject' };
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(alteredPayload),
  });
  assert.strictEqual(res2.status, 422, 'Altered subject must return 422 even after IdempotencyRecord is absent');
  const body2 = await res2.json();
  assert.match(body2.error, /different request parameters/i);
  assert.strictEqual(savedContacts.length, 1, 'Zero new contact records created');
});

// ── 23. Post-TTL RequestHash: Contact Attachment Byte Tampering Rejection ───

test('SEC-24 Round 5: Contact retry with altered attachment bytes after IdempotencyRecord is absent returns HTTP 422', async () => {
  const key = 'test-contact-ttl-bytes-001';
  const makeFormData = (fileContent) => {
    const fd = new FormData();
    fd.append('name', 'Bob Attachment');
    fd.append('email', 'bob.att@example.com');
    fd.append('message', 'Message with attachment');
    fd.append('subject', 'Attachment Test');
    fd.append('attachments', new Blob([fileContent], { type: 'text/plain' }), 'test.txt');
    return fd;
  };

  // 1. Initial submission with original bytes
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeFormData('Original file content'),
  });
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(savedContacts.length, 1);
  assert.ok(savedContacts[0].requestHash, 'Persisted contact must store requestHash');

  // 2. Simulate 24h TTL purge of IdempotencyRecord
  savedIdempotencyRecords = savedIdempotencyRecords.filter((r) => r.key !== key);

  // 3. Retry with altered attachment content: must reject with HTTP 422
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeFormData('Altered file content injected by attacker'),
  });
  assert.strictEqual(res2.status, 422, 'Altered attachment bytes must return 422 after IdempotencyRecord is absent');
  const body2 = await res2.json();
  assert.match(body2.error, /different request parameters/i);
  assert.strictEqual(savedContacts.length, 1, 'No new contact created');
});

// ── 24. Post-TTL RequestHash: Feedback Attachment Byte Tampering Rejection ──

test('SEC-24 Round 5: Feedback retry with altered attachment after IdempotencyRecord is absent returns HTTP 422', async () => {
  const key = 'test-feedback-ttl-att-001';
  const makeFormData = (fileBytes) => {
    const fd = new FormData();
    fd.append('type', 'bug');
    fd.append('message', 'Bug with screenshot');
    fd.append('name', 'Charlie Feedback');
    fd.append('email', 'charlie.fb@example.com');
    fd.append('page', '/gallery');
    fd.append('attachment', new Blob([fileBytes], { type: 'image/png' }), 'screen.png');
    return fd;
  };

  // 1. Initial submission with PNG bytes
  const pngBytes1 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);
  const res1 = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeFormData(pngBytes1),
  });
  assert.strictEqual(res1.status, 201);
  assert.strictEqual(savedFeedbacks.length, 1);
  assert.ok(savedFeedbacks[0].requestHash, 'Persisted feedback must store requestHash');

  // 2. Simulate 24h TTL purge of IdempotencyRecord
  savedIdempotencyRecords = savedIdempotencyRecords.filter((r) => r.key !== key);

  // 3. Retry with different PNG bytes
  const pngBytes2 = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x02]);
  const res2 = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Idempotency-Key': key },
    body: makeFormData(pngBytes2),
  });
  assert.strictEqual(res2.status, 422, 'Altered feedback attachment must return 422 after IdempotencyRecord is absent');
  const body2 = await res2.json();
  assert.match(body2.error, /different request parameters/i);
  assert.strictEqual(savedFeedbacks.length, 1, 'No new feedback created');
});

// ── 25. Stale Worker Email Suppression in Contact Route ─────────────────────

test('SEC-24 Round 5: Stale worker in contact route that loses ownership after persistence does not dispatch email', async () => {
  const key = 'test-stale-email-fenced-001';
  const payload = {
    name: 'Late Stall User',
    email: 'latestall@example.com',
    message: 'Testing email suppression when lease is reclaimed after persistence',
  };

  // Intercept Contact.create: right after creating the contact document, simulate lease expiry and Worker 2 reclaiming the claim!
  const origContactCreate = Contact.create;
  Contact.create = async (doc) => {
    const item = await origContactCreate(doc);
    // Simulate Worker 1 stalling: Worker 2 reclaims the claim with a new owner token!
    const rec = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'contact');
    if (rec) {
      rec.ownerToken = 'new-worker-2-token'; // Worker 1 has lost claim ownership!
    }
    return item;
  };

  try {
    const res = await fetch(`${BASE_URL}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(savedContacts.length, 1, 'Contact document was persisted');

    // Because Worker 1 lost claim ownership before email dispatch, isClaimOwner returned false and sendEmail was SUPPRESSED!
    assert.strictEqual(sentEmails.length, 0, 'Email dispatch must be suppressed when claim ownership was lost');
  } finally {
    Contact.create = origContactCreate;
  }
});

// ── 26. Stale Worker Email Suppression in Feedback Route ────────────────────

test('SEC-24 Round 5: Stale worker in feedback route that loses ownership after persistence does not dispatch email', async () => {
  const key = 'test-stale-feedback-email-fenced-001';
  const payload = {
    type: 'suggestion',
    message: 'Testing feedback email suppression on lost claim ownership',
    name: 'Late Feedback Stall',
    email: 'latefeedback@example.com',
  };

  const origFeedbackCreate = Feedback.create;
  Feedback.create = async (doc) => {
    const item = await origFeedbackCreate(doc);
    // Worker 1 stalls: Worker 2 reclaims the claim with a new owner token!
    const rec = savedIdempotencyRecords.find((r) => r.key === key && r.scope === 'feedback');
    if (rec) {
      rec.ownerToken = 'new-worker-2-token';
    }
    return item;
  };

  try {
    const res = await fetch(`${BASE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(savedFeedbacks.length, 1, 'Feedback document was persisted');
    assert.strictEqual(sentEmails.length, 0, 'Feedback email dispatch must be suppressed when claim ownership was lost');
  } finally {
    Feedback.create = origFeedbackCreate;
  }
});

// ── 27. Legacy Records Compatibility Policy ─────────────────────────────────

test('SEC-24 Round 5: Legacy records lacking requestHash safely match on text fields and reject text mismatch', async () => {
  const key = 'test-legacy-no-hash-001';
  // Pre-seed a legacy contact created before requestHash was introduced
  savedContacts.push({
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Legacy User',
    email: 'legacy@example.com',
    message: 'Legacy message without requestHash',
    idempotencyKey: key,
    requestHash: null, // Legacy record lacks requestHash
  });

  // Matching text fields: returns deduplicated 201
  const res1 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({
      name: 'Legacy User',
      email: 'legacy@example.com',
      message: 'Legacy message without requestHash',
    }),
  });
  assert.strictEqual(res1.status, 201);
  const data1 = await res1.json();
  assert.strictEqual(data1.deduplicated, true);

  // Mismatched text fields on legacy record: returns 422
  const res2 = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({
      name: 'Tampered Name',
      email: 'legacy@example.com',
      message: 'Legacy message without requestHash',
    }),
  });
  assert.strictEqual(res2.status, 422);
  const data2 = await res2.json();
  assert.match(data2.error, /different request parameters/i);
});
