/**
 * Unit and integration tests for Gallery Image Reordering
 *
 * Tests:
 * 1. PUT /api/images/reorder authorization (reject unauthenticated, accept admin)
 * 2. Payload validation (reject non-arrays, invalid ObjectIds, duplicate IDs)
 * 3. Empty gallery handling (200 on empty DB, 400 when DB is not empty)
 * 4. Stale/mismatched ID sets (reject missing IDs, reject partial ID sets)
 * 5. Persistence via bulkWrite and fallback to findByIdAndUpdate
 * 6. Public GET /api/images deterministic ordering (order asc, createdAt desc, _id asc)
 * 7. Legacy images without order field handled gracefully
 */

process.env.JWT_SECRET = 'test-gallery-reorder-secret';
const bcrypt = require('bcryptjs');
process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync('test-admin-password', 10);

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const GalleryImage = require('./models/GalleryImage');
const imagesRoutes = require('./routes/images');

// In-memory mock gallery storage
let mockGallery = [];
let bulkWriteCalled = false;
let bulkWriteOps = [];
let findByIdAndUpdateCalls = [];
let bulkWriteAvailable = true;

// Helper to create a chainable query object
function createMockQuery(getResult) {
  const query = {
    sort: (sortObj) => {
      query._sortObj = sortObj;
      return query;
    },
    select: (selectStr) => {
      query._selectStr = selectStr;
      return query;
    },
    then: (resolve, reject) => {
      try {
        let result = getResult();
        // If sortObj is provided, emulate basic sorting
        if (query._sortObj && Array.isArray(result)) {
          result = [...result].sort((a, b) => {
            const orderA = typeof a.order === 'number' && !isNaN(a.order) ? a.order : 0;
            const orderB = typeof b.order === 'number' && !isNaN(b.order) ? b.order : 0;
            if (orderA !== orderB) return orderA - orderB;
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (timeB !== timeA) return timeB - timeA;
            return String(a._id || '').localeCompare(String(b._id || ''));
          });
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    },
  };
  return query;
}

// Mock GalleryImage methods
GalleryImage.find = (filter = {}) => {
  return createMockQuery(() => {
    if (filter._id && filter._id.$in) {
      const allowed = filter._id.$in.map(String);
      return mockGallery.filter((img) => allowed.includes(String(img._id)));
    }
    return [...mockGallery];
  });
};

GalleryImage.countDocuments = async (filter = {}) => {
  if (filter && filter._id && filter._id.$in) {
    const allowed = filter._id.$in.map(String);
    return mockGallery.filter((img) => allowed.includes(String(img._id))).length;
  }
  return mockGallery.length;
};

GalleryImage.bulkWrite = async (ops) => {
  if (!bulkWriteAvailable) {
    throw new Error('bulkWrite unavailable');
  }
  bulkWriteCalled = true;
  bulkWriteOps = ops;
  for (const op of ops) {
    if (op.updateOne) {
      const id = String(op.updateOne.filter._id);
      const target = mockGallery.find((img) => String(img._id) === id);
      if (target && op.updateOne.update.$set) {
        Object.assign(target, op.updateOne.update.$set);
      }
    }
  }
  return { ok: 1, modifiedCount: ops.length };
};

GalleryImage.findByIdAndUpdate = async (id, update) => {
  findByIdAndUpdateCalls.push({ id: String(id), update });
  const target = mockGallery.find((img) => String(img._id) === String(id));
  if (target) {
    Object.assign(target, update);
  }
  return target;
};

// Setup Express application
const app = express();
app.use(express.json());
app.use('/api/images', imagesRoutes);

const PORT = 5592;
const BASE_URL = `http://localhost:${PORT}/api/images`;
const adminToken = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET);
const authHeaders = {
  Authorization: `Bearer ${adminToken}`,
  'Content-Type': 'application/json',
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

// Helper to seed mock images
function seedMockImages() {
  const id1 = new mongoose.Types.ObjectId().toString();
  const id2 = new mongoose.Types.ObjectId().toString();
  const id3 = new mongoose.Types.ObjectId().toString();
  mockGallery = [
    {
      _id: id1,
      title: 'Project Alpha',
      category: 'Projects',
      order: 0,
      createdAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      _id: id2,
      title: 'Certificate Beta',
      category: 'Certificates',
      order: 1,
      createdAt: new Date('2026-01-02T10:00:00Z'),
    },
    {
      _id: id3,
      title: 'UI Design Gamma',
      category: 'UI Work',
      order: 2,
      createdAt: new Date('2026-01-03T10:00:00Z'),
    },
  ];
  bulkWriteCalled = false;
  bulkWriteOps = [];
  findByIdAndUpdateCalls = [];
  bulkWriteAvailable = true;
  return { id1, id2, id3 };
}

// ═════════════════════════════════════════════════════════════
// 1. Authentication & Authorization Tests
// ═════════════════════════════════════════════════════════════

test('PUT /api/images/reorder rejects unauthenticated requests with 401', async () => {
  seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageIds: [mockGallery[0]._id] }),
  });
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.ok(data.error);
});

test('PUT /api/images/reorder rejects invalid token with 401', async () => {
  seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: {
      Authorization: 'Bearer invalid-token-xyz',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageIds: [mockGallery[0]._id] }),
  });
  assert.strictEqual(res.status, 401);
});

// ═════════════════════════════════════════════════════════════
// 2. Payload Structure Validation Tests
// ═════════════════════════════════════════════════════════════

test('PUT /api/images/reorder rejects non-array payload with 400', async () => {
  seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: 'not-an-array' }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /must be an array/i);
});

test('PUT /api/images/reorder rejects missing payload with 400', async () => {
  seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /must be an array/i);
});

test('PUT /api/images/reorder rejects malformed ObjectId with 400', async () => {
  const { id1, id2 } = seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [id1, 'not-a-valid-object-id', id2] }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid image ID/i);
});

test('PUT /api/images/reorder rejects duplicate IDs in payload with 400', async () => {
  const { id1, id2 } = seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [id1, id2, id1] }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Duplicate image IDs/i);
});

// ═════════════════════════════════════════════════════════════
// 3. Collection Matching & Edge Cases Tests
// ═════════════════════════════════════════════════════════════

test('PUT /api/images/reorder succeeds with empty array when gallery is empty', async () => {
  mockGallery = [];
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [] }),
  });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.count, 0);
});

test('PUT /api/images/reorder rejects empty array when gallery has images', async () => {
  seedMockImages();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [] }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Cannot submit an empty list/i);
});

test('PUT /api/images/reorder rejects unknown IDs not in database with 400', async () => {
  const { id1, id2 } = seedMockImages();
  const unknownId = new mongoose.Types.ObjectId().toString();
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [id1, id2, unknownId] }),
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /do not exist/i);
});

test('PUT /api/images/reorder rejects partial ID set (missing items) with 400', async () => {
  const { id1, id2 } = seedMockImages(); // 3 images exist in total
  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: [id1, id2] }), // only 2 provided
  });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /do not match the complete set/i);
});

// ═════════════════════════════════════════════════════════════
// 4. Successful Reordering & Persistence Tests
// ═════════════════════════════════════════════════════════════

test('PUT /api/images/reorder successfully updates positions via bulkWrite', async () => {
  const { id1, id2, id3 } = seedMockImages();
  // Reverse order: id3, id2, id1
  const reversedIds = [id3, id2, id1];

  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ imageIds: reversedIds }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.count, 3);
  assert.strictEqual(bulkWriteCalled, true);

  // Check updated positions in memory
  const img3 = mockGallery.find((i) => i._id === id3);
  const img2 = mockGallery.find((i) => i._id === id2);
  const img1 = mockGallery.find((i) => i._id === id1);
  assert.strictEqual(img3.order, 0);
  assert.strictEqual(img2.order, 1);
  assert.strictEqual(img1.order, 2);
});

test('PUT /api/images/reorder supports raw array body directly', async () => {
  const { id1, id2, id3 } = seedMockImages();
  const newOrder = [id2, id3, id1];

  const res = await fetch(`${BASE_URL}/reorder`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify(newOrder),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);

  const img2 = mockGallery.find((i) => i._id === id2);
  const img3 = mockGallery.find((i) => i._id === id3);
  const img1 = mockGallery.find((i) => i._id === id1);
  assert.strictEqual(img2.order, 0);
  assert.strictEqual(img3.order, 1);
  assert.strictEqual(img1.order, 2);
});

test('PUT /api/images/reorder falls back to findByIdAndUpdate when bulkWrite is unavailable', async () => {
  const { id1, id2, id3 } = seedMockImages();
  const originalBulkWrite = GalleryImage.bulkWrite;
  GalleryImage.bulkWrite = null; // Simulate environment where bulkWrite is not supported

  try {
    const newOrder = [id1, id3, id2];
    const res = await fetch(`${BASE_URL}/reorder`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ ids: newOrder }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(findByIdAndUpdateCalls.length, 3);

    const img1 = mockGallery.find((i) => i._id === id1);
    const img3 = mockGallery.find((i) => i._id === id3);
    const img2 = mockGallery.find((i) => i._id === id2);
    assert.strictEqual(img1.order, 0);
    assert.strictEqual(img3.order, 1);
    assert.strictEqual(img2.order, 2);
  } finally {
    GalleryImage.bulkWrite = originalBulkWrite;
  }
});

test('PUT /api/images/reorder returns 500 when bulkWrite throws an error', async () => {
  const { id1, id2, id3 } = seedMockImages();
  const originalBulkWrite = GalleryImage.bulkWrite;
  GalleryImage.bulkWrite = async () => {
    throw new Error('MongoBulkWriteError: write operation failed');
  };

  try {
    const res = await fetch(`${BASE_URL}/reorder`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ imageIds: [id1, id2, id3] }),
    });

    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /Failed to reorder images/i);
  } finally {
    GalleryImage.bulkWrite = originalBulkWrite;
  }
});

test('PUT /api/images/reorder returns 500 when bulkWrite returns hasWriteErrors', async () => {
  const { id1, id2, id3 } = seedMockImages();
  const originalBulkWrite = GalleryImage.bulkWrite;
  GalleryImage.bulkWrite = async () => ({
    ok: 1,
    hasWriteErrors: () => true,
  });

  try {
    const res = await fetch(`${BASE_URL}/reorder`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ imageIds: [id1, id2, id3] }),
    });

    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /Failed to reorder images/i);
  } finally {
    GalleryImage.bulkWrite = originalBulkWrite;
  }
});

test('PUT /api/images/reorder returns 500 when findByIdAndUpdate fallback rejects', async () => {
  const { id1, id2, id3 } = seedMockImages();
  const originalBulkWrite = GalleryImage.bulkWrite;
  const originalFindByIdAndUpdate = GalleryImage.findByIdAndUpdate;

  GalleryImage.bulkWrite = null;
  GalleryImage.findByIdAndUpdate = async () => {
    throw new Error('Database connection drop');
  };

  try {
    const res = await fetch(`${BASE_URL}/reorder`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ imageIds: [id1, id2, id3] }),
    });

    assert.strictEqual(res.status, 500);
    const data = await res.json();
    assert.match(data.error, /Failed to reorder images/i);
  } finally {
    GalleryImage.bulkWrite = originalBulkWrite;
    GalleryImage.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

// ═════════════════════════════════════════════════════════════
// 5. Deterministic Public GET /api/images Tests
// ═════════════════════════════════════════════════════════════

test('GET /api/images returns images sorted by order ascending', async () => {
  const { id1, id2, id3 } = seedMockImages();
  mockGallery.find((i) => i._id === id1).order = 2;
  mockGallery.find((i) => i._id === id2).order = 0;
  mockGallery.find((i) => i._id === id3).order = 1;

  const res = await fetch(BASE_URL);
  assert.strictEqual(res.status, 200);
  const items = await res.json();

  assert.strictEqual(items.length, 3);
  assert.strictEqual(items[0]._id, id2);
  assert.strictEqual(items[1]._id, id3);
  assert.strictEqual(items[2]._id, id1);
});

test('GET /api/images handles legacy items lacking order gracefully with deterministic fallback', async () => {
  const idA = new mongoose.Types.ObjectId().toString();
  const idB = new mongoose.Types.ObjectId().toString();
  const idC = new mongoose.Types.ObjectId().toString();

  // Legacy items with order = undefined/null/0
  mockGallery = [
    {
      _id: idA,
      title: 'Legacy Older',
      order: undefined,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    },
    {
      _id: idB,
      title: 'Legacy Newer',
      order: null,
      createdAt: new Date('2025-06-01T00:00:00Z'),
    },
    {
      _id: idC,
      title: 'Explicit Order 1',
      order: 1,
      createdAt: new Date('2025-03-01T00:00:00Z'),
    },
  ];

  const res = await fetch(BASE_URL);
  assert.strictEqual(res.status, 200);
  const items = await res.json();

  // idB and idA have order 0 (defaulted). idB has newer createdAt, so it must precede idA.
  // idC has order 1, so it must be last.
  assert.strictEqual(items[0]._id, idB);
  assert.strictEqual(items[1]._id, idA);
  assert.strictEqual(items[2]._id, idC);
});
