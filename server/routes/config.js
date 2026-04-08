const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const SiteConfig = require('../models/SiteConfig');
const requireAuth = require('../middleware/auth');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF files are allowed'));
    cb(null, true);
  },
});

// Simple in-memory cache — avoids a DB round-trip on every page load
let _cache = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

function invalidateCache() {
  _cache = null;
}

// GET /api/config — public
router.get('/', async (req, res) => {
  try {
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
      return res.json(_cache.data);
    }
    const docs = await SiteConfig.find({}).lean();
    const data = Object.fromEntries(docs.map((d) => [d.key, d.value]));
    _cache = { data, fetchedAt: Date.now() };
    res.json(data);
  } catch (err) {
    console.error('[config] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// POST /api/config — admin only
router.post('/', requireAuth, async (req, res) => {
  try {
    const { key, value, updates } = req.body;
    if (updates && Array.isArray(updates)) {
      await Promise.all(
        updates.map(({ key: k, value: v }) =>
          SiteConfig.findOneAndUpdate({ key: k }, { key: k, value: v }, { upsert: true, new: true })
        )
      );
      invalidateCache();
      return res.json({ ok: true });
    }
    if (!key) return res.status(400).json({ error: 'key is required' });
    const doc = await SiteConfig.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    invalidateCache();
    res.json(doc);
  } catch (err) {
    console.error('[config] POST failed:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// POST /api/config/resume — upload PDF to Cloudinary, save URL — admin only
router.post('/resume', requireAuth, resumeUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    let resumeUrl;

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'gfolio', resource_type: 'auto', public_id: 'resume', use_filename: false, unique_filename: false, overwrite: true, access_mode: 'public' },
          (err, r) => (err ? reject(err) : resolve(r))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      resumeUrl = result.secure_url;
    } else {
      return res.status(500).json({ error: 'Cloudinary not configured' });
    }

    await SiteConfig.findOneAndUpdate(
      { key: 'resumeUrl' },
      { key: 'resumeUrl', value: resumeUrl },
      { upsert: true, new: true }
    );
    invalidateCache();
    res.json({ ok: true, resumeUrl });
  } catch (err) {
    console.error('[config] Resume upload failed:', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
