const express = require('express');
const router = express.Router();
const SiteConfig = require('../models/SiteConfig');
const requireAuth = require('../middleware/auth');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
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

// POST /api/config/resume-upload — admin only
router.post('/resume-upload', requireAuth, (req, res) => {
  uploadPdf.single('resume')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'PDF file is required' });
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(500).json({ error: 'Cloudinary is not configured on this server.' });
      }

      // Verify magic bytes for PDF (%PDF)
      const header = req.file.buffer.toString('utf-8', 0, 4);
      if (header !== '%PDF') {
        return res.status(400).json({ error: 'Invalid file content. Must be a PDF.' });
      }

      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'gfolio', resource_type: 'raw', public_id: `resume_${Date.now()}.pdf` },
          (uploadErr, result) => (uploadErr ? reject(uploadErr) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      const result = await uploadPromise;
      const newResumeUrl = result.secure_url;

      const doc = await SiteConfig.findOneAndUpdate(
        { key: 'resumeUrl' },
        { key: 'resumeUrl', value: newResumeUrl },
        { upsert: true, new: true }
      );
      invalidateCache();
      res.json({ resumeUrl: newResumeUrl });
    } catch (uploadErr) {
      console.error('[config] POST /resume-upload failed:', uploadErr.message);
      res.status(500).json({ error: uploadErr.message || 'Failed to upload resume' });
    }
  });
});

module.exports = router;
