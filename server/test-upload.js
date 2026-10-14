process.env.JWT_SECRET = 'test-secret';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const jwt = require('jsonwebtoken');
const { Writable } = require('stream');

// 1. Mocks
const SiteConfig = require('./models/SiteConfig');
let dbCallCount = 0;
let dbShouldFail = false;
let lastDbFilter = null;
let lastDbUpdate = null;
// Preserve original in case it's needed, mock findOneAndUpdate
SiteConfig.findOneAndUpdate = async (filter, update) => {
  if (dbShouldFail) throw new Error('DB Error');
  dbCallCount++;
  lastDbFilter = filter;
  lastDbUpdate = update;
  return { ok: true };
};
// Mock find to prevent GET /api/config from crashing if it's hit, though we only test POST
SiteConfig.find = () => ({ lean: async () => [] });

const { v2: cloudinary } = require('cloudinary');
let cloudinaryCallCount = 0;
let cloudinaryShouldFail = false;
let lastCloudinaryOpts = null;
cloudinary.uploader.upload_stream = (opts, cb) => {
  lastCloudinaryOpts = opts;
  cloudinaryCallCount++;
  if (cloudinaryShouldFail) {
    return new Writable({
      write(chunk, enc, next) {
        cb(new Error('Cloudinary Error'));
        next();
      }
    });
  }
  return new Writable({
    write(chunk, enc, next) { next(); },
    final(cbStream) {
      const url = opts.public_id && opts.public_id.includes('avatar')
        ? 'https://res.cloudinary.com/mock/avatar.jpg'
        : 'https://res.cloudinary.com/mock/resume.pdf';
      cb(null, { secure_url: url });
      cbStream();
    }
  });
};

// 2. Setup Express app
const app = express();
app.use(express.json());
// Important: mount the routes AFTER setting process.env so cloudinary gets configured in config.js
const configRoutes = require('./routes/config');
app.use('/api/config', configRoutes);

// 3. Tests
const PORT = 5555;
const BASE_URL = `http://localhost:${PORT}/api/config/resume-upload`;
const AVATAR_BASE_URL = `http://localhost:${PORT}/api/config/avatar-upload`;
const token = jwt.sign({ admin: true }, process.env.JWT_SECRET);
const headers = { 'Authorization': `Bearer ${token}` };

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
  cloudinaryCallCount = 0;
  cloudinaryShouldFail = false;
  lastCloudinaryOpts = null;
});

test('1. Unauthenticated request is rejected', async () => {
  const res = await fetch(BASE_URL, { method: 'POST' });
  assert.strictEqual(res.status, 401);
});

test('2. Missing file is rejected', async () => {
  const fd = new FormData();
  // no file appended
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /PDF file is required/);
});

test('3. Non-PDF file is rejected', async () => {
  const fd = new FormData();
  fd.append('resume', new Blob(['fake image data'], { type: 'image/png' }), 'test.png');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Only PDF files are allowed/);
});

test('4. Invalid PDF signature is rejected', async () => {
  const fd = new FormData();
  // Valid mimetype, but invalid content bytes
  fd.append('resume', new Blob(['Not a PDF file'], { type: 'application/pdf' }), 'test.pdf');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid file content. Must be a PDF/);
});

test('5. File larger than 5 MB is rejected', async () => {
  const fd = new FormData();
  // 6MB buffer
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
  fd.append('resume', new Blob([largeBuffer], { type: 'application/pdf' }), 'large.pdf');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /File too large/); // Multer default error message
});

test('6. Valid PDF upload succeeds and saves', async () => {
  const fd = new FormData();
  // Needs to start with %PDF
  const validBuffer = Buffer.from('%PDF-1.4 mock content');
  fd.append('resume', new Blob([validBuffer], { type: 'application/pdf' }), 'resume.pdf');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.resumeUrl, 'https://res.cloudinary.com/mock/resume.pdf');
  assert.strictEqual(cloudinaryCallCount, 1);
  assert.strictEqual(dbCallCount, 1);
  assert.deepStrictEqual(lastDbFilter, { key: 'resumeUrl' });
  assert.strictEqual(lastDbUpdate.key, 'resumeUrl');
  assert.strictEqual(lastDbUpdate.value, 'https://res.cloudinary.com/mock/resume.pdf');

  // Assert Cloudinary options
  assert.strictEqual(lastCloudinaryOpts.resource_type, 'raw');
  assert.match(lastCloudinaryOpts.public_id, /\.pdf$/);
});

test('7. Cloudinary failure returns a safe error and does not update setting', async () => {
  cloudinaryShouldFail = true;
  const fd = new FormData();
  const validBuffer = Buffer.from('%PDF-1.4 mock content');
  fd.append('resume', new Blob([validBuffer], { type: 'application/pdf' }), 'resume.pdf');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 500);
  const data = await res.json();
  assert.strictEqual(data.error, 'Failed to upload resume');
  assert.strictEqual(cloudinaryCallCount, 1);
  assert.strictEqual(dbCallCount, 0); // Should not have hit the database
});

test('8. Database update failure is handled safely', async () => {
  dbShouldFail = true;
  const fd = new FormData();
  const validBuffer = Buffer.from('%PDF-1.4 mock content');
  fd.append('resume', new Blob([validBuffer], { type: 'application/pdf' }), 'resume.pdf');
  const res = await fetch(BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 500);
  const data = await res.json();
  assert.strictEqual(data.error, 'Failed to upload resume');
  assert.strictEqual(cloudinaryCallCount, 1); // Cloudinary still uploaded
  assert.strictEqual(dbCallCount, 0); // The mock throws before incrementing
});

test('9. Avatar upload: Unauthenticated request is rejected', async () => {
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST' });
  assert.strictEqual(res.status, 401);
});

test('10. Avatar upload: Missing file is rejected', async () => {
  const fd = new FormData();
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Image file is required/);
});

test('11. Avatar upload: Non-image file is rejected', async () => {
  const fd = new FormData();
  const textBuffer = Buffer.from('plain text file');
  fd.append('avatar', new Blob([textBuffer], { type: 'text/plain' }), 'document.txt');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Only image files are allowed/);
});

test('12. Avatar upload: Invalid image signature is rejected', async () => {
  const fd = new FormData();
  const fakeImgBuffer = Buffer.from('not an actual image');
  fd.append('avatar', new Blob([fakeImgBuffer], { type: 'image/jpeg' }), 'fake.jpg');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Invalid file content/);
});

test('13. Avatar upload: File larger than 5 MB is rejected', async () => {
  const fd = new FormData();
  const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
  fd.append('avatar', new Blob([largeBuffer], { type: 'image/jpeg' }), 'large.jpg');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /File too large/);
});

test('14. Avatar upload: Valid image upload succeeds and saves both avatarUrl and profilePhotoUrl', async () => {
  const fd = new FormData();
  // Valid JPEG header bytes: 0xff, 0xd8, 0xff
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  fd.append('avatar', new Blob([validJpeg], { type: 'image/jpeg' }), 'avatar.jpg');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.avatarUrl, 'https://res.cloudinary.com/mock/avatar.jpg');
  assert.strictEqual(data.profilePhotoUrl, 'https://res.cloudinary.com/mock/avatar.jpg');
  assert.strictEqual(cloudinaryCallCount, 1);
  assert.strictEqual(dbCallCount, 2); // Updates both avatarUrl and profilePhotoUrl
  assert.strictEqual(lastDbUpdate.value, 'https://res.cloudinary.com/mock/avatar.jpg');
});

test('15. Avatar upload: Cloudinary failure returns safe error and does not update setting', async () => {
  cloudinaryShouldFail = true;
  const fd = new FormData();
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  fd.append('avatar', new Blob([validJpeg], { type: 'image/jpeg' }), 'avatar.jpg');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 500);
  const data = await res.json();
  assert.strictEqual(data.error, 'Failed to upload profile photo');
  assert.strictEqual(cloudinaryCallCount, 1);
  assert.strictEqual(dbCallCount, 0);
});

test('16. Avatar upload: Database update failure is handled safely', async () => {
  dbShouldFail = true;
  const fd = new FormData();
  const validJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  fd.append('avatar', new Blob([validJpeg], { type: 'image/jpeg' }), 'avatar.jpg');
  const res = await fetch(AVATAR_BASE_URL, { method: 'POST', headers, body: fd });
  assert.strictEqual(res.status, 500);
  const data = await res.json();
  assert.strictEqual(data.error, 'Failed to upload profile photo');
  assert.strictEqual(cloudinaryCallCount, 1);
  assert.strictEqual(dbCallCount, 0);
});
