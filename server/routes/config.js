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

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
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
    if (data.avatarUrl !== undefined && data.profilePhotoUrl === undefined) {
      data.profilePhotoUrl = data.avatarUrl;
    } else if (data.profilePhotoUrl !== undefined && data.avatarUrl === undefined) {
      data.avatarUrl = data.profilePhotoUrl;
    }
    _cache = { data, fetchedAt: Date.now() };
    res.json(data);
  } catch (err) {
    console.error('[config] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to load config' });
  }
});

const VALID_TOOL_LEVELS = new Set(['Expert', 'Proficient', 'Intermediate', 'Beginner']);
const HEX6_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function validateToolsConfig(value) {
  if (!Array.isArray(value)) {
    return 'tools configuration must be an array of categories';
  }
  if (value.length === 0) {
    return 'tools configuration must contain at least one category';
  }
  const seenCategories = new Set();
  for (let ci = 0; ci < value.length; ci++) {
    const cat = value[ci];
    if (!cat || typeof cat !== 'object') {
      return `Category at index ${ci} must be an object`;
    }
    if (typeof cat.category !== 'string' || !cat.category.trim()) {
      return `Category at index ${ci} requires a non-empty category name`;
    }
    const catName = cat.category.trim();
    const normalizedName = catName.toLowerCase();
    if (seenCategories.has(normalizedName)) {
      return `Duplicate category name "${catName}". Category names must be unique.`;
    }
    seenCategories.add(normalizedName);
    if (typeof cat.title !== 'string' || !cat.title.trim()) {
      return `Category "${cat.category}" requires a non-empty title`;
    }
    if (typeof cat.color !== 'string' || !HEX6_COLOR_REGEX.test(cat.color.trim())) {
      return `Category "${cat.category}" requires a valid 6-digit hex color (e.g. #4285F4)`;
    }
    if (typeof cat.snippet !== 'string' || !cat.snippet.trim()) {
      return `Category "${cat.category}" requires a non-empty snippet`;
    }
    if (!Array.isArray(cat.items) || cat.items.length === 0) {
      return `Category "${cat.category}" must contain at least one skill`;
    }
    for (let si = 0; si < cat.items.length; si++) {
      const skill = cat.items[si];
      if (!skill || typeof skill !== 'object') {
        return `Skill at index ${si} in "${cat.category}" must be an object`;
      }
      if (typeof skill.name !== 'string' || !skill.name.trim()) {
        return `Skill at index ${si} in "${cat.category}" requires a non-empty name`;
      }
      if (!VALID_TOOL_LEVELS.has(skill.level)) {
        return `Skill "${skill.name || si}" in "${cat.category}" has an invalid level "${skill.level}". Allowed: Expert, Proficient, Intermediate, Beginner`;
      }
      if (typeof skill.desc !== 'string' || !skill.desc.trim()) {
        return `Skill "${skill.name}" in "${cat.category}" requires a non-empty description`;
      }
    }
  }
  return null;
}

const RECOGNIZED_PAGE_VISIBILITY_KEYS = new Set(['blog', 'tools', 'images']);

function validatePageVisibilityConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'pageVisibility must be an object';
  }
  for (const k of Object.keys(value)) {
    if (!RECOGNIZED_PAGE_VISIBILITY_KEYS.has(k)) {
      return `Unknown pageVisibility key "${k}". Allowed keys: blog, tools, images`;
    }
    if (typeof value[k] !== 'boolean') {
      return `pageVisibility.${k} must be a boolean`;
    }
  }
  return null;
}

const { validateConfigEntry } = require('../utils/configValidation');

// POST /api/config — admin only
router.post('/', requireAuth, async (req, res) => {
  try {
    const { key, value, updates } = req.body || {};
    if (updates !== undefined) {
      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'updates must be a non-empty array' });
      }
      for (const item of updates) {
        if (!item || typeof item.key !== 'string' || !item.key.trim()) {
          return res.status(400).json({ error: 'Each update item must contain a non-empty string key' });
        }
        const cleanKey = item.key.trim();
        if (cleanKey === 'tools') {
          const toolsErr = validateToolsConfig(item.value);
          if (toolsErr) {
            return res.status(400).json({ error: toolsErr });
          }
        } else if (cleanKey === 'pageVisibility') {
          const pvErr = validatePageVisibilityConfig(item.value);
          if (pvErr) {
            return res.status(400).json({ error: pvErr });
          }
        } else {
          const entryErr = validateConfigEntry(cleanKey, item.value);
          if (entryErr) {
            return res.status(400).json({ error: entryErr });
          }
        }
      }
      const finalUpdatesMap = new Map();
      for (const { key: k, value: v } of updates) {
        finalUpdatesMap.set(k.trim(), v);
      }
      if (finalUpdatesMap.has('avatarUrl') && finalUpdatesMap.has('profilePhotoUrl')) {
        // avatarUrl is canonical if both are supplied
        finalUpdatesMap.set('profilePhotoUrl', finalUpdatesMap.get('avatarUrl'));
      } else if (finalUpdatesMap.has('avatarUrl')) {
        finalUpdatesMap.set('profilePhotoUrl', finalUpdatesMap.get('avatarUrl'));
      } else if (finalUpdatesMap.has('profilePhotoUrl')) {
        finalUpdatesMap.set('avatarUrl', finalUpdatesMap.get('profilePhotoUrl'));
      }

      await Promise.all(
        Array.from(finalUpdatesMap.entries()).map(([k, v]) =>
          SiteConfig.findOneAndUpdate({ key: k }, { key: k, value: v }, { upsert: true, new: true })
        )
      );
      invalidateCache();
      return res.json({ ok: true });
    }
    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'key is required' });
    }
    const cleanKey = key.trim();
    if (cleanKey === 'tools') {
      const toolsErr = validateToolsConfig(value);
      if (toolsErr) {
        return res.status(400).json({ error: toolsErr });
      }
    } else if (cleanKey === 'pageVisibility') {
      const pvErr = validatePageVisibilityConfig(value);
      if (pvErr) {
        return res.status(400).json({ error: pvErr });
      }
    } else {
      const entryErr = validateConfigEntry(cleanKey, value);
      if (entryErr) {
        return res.status(400).json({ error: entryErr });
      }
    }
    if (cleanKey === 'avatarUrl' || cleanKey === 'profilePhotoUrl') {
      const counterpartKey = cleanKey === 'avatarUrl' ? 'profilePhotoUrl' : 'avatarUrl';
      const [doc] = await Promise.all([
        SiteConfig.findOneAndUpdate(
          { key: cleanKey },
          { key: cleanKey, value },
          { upsert: true, new: true }
        ),
        SiteConfig.findOneAndUpdate(
          { key: counterpartKey },
          { key: counterpartKey, value },
          { upsert: true, new: true }
        ),
      ]);
      invalidateCache();
      return res.json(doc);
    }

    const doc = await SiteConfig.findOneAndUpdate(
      { key: cleanKey },
      { key: cleanKey, value },
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
      res.status(500).json({ error: 'Failed to upload resume' });
    }
  });
});

// POST /api/config/avatar-upload - admin only
router.post('/avatar-upload', requireAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      if (!req.file) return res.status(400).json({ error: 'Image file is required' });
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
        return res.status(500).json({ error: 'Cloudinary is not configured on this server.' });
      }

      // Verify magic bytes for image formats (JPEG, PNG, GIF, WebP)
      const buf = req.file.buffer;
      const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      const isGif = buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
      const isWebp = buf.length >= 12 && buf.toString('utf-8', 0, 4) === 'RIFF' && buf.toString('utf-8', 8, 12) === 'WEBP';

      if (!isJpeg && !isPng && !isGif && !isWebp) {
        return res.status(400).json({ error: 'Invalid file content. Must be a valid image file.' });
      }

      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'gfolio',
            public_id: `avatar_${Date.now()}`,
            transformation: [{ width: 500, height: 500, crop: 'limit', fetch_format: 'auto', quality: 'auto' }]
          },
          (uploadErr, result) => (uploadErr ? reject(uploadErr) : resolve(result))
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

      const result = await uploadPromise;
      const newAvatarUrl = result.secure_url;

      await SiteConfig.findOneAndUpdate(
        { key: 'avatarUrl' },
        { key: 'avatarUrl', value: newAvatarUrl },
        { upsert: true, new: true }
      );
      await SiteConfig.findOneAndUpdate(
        { key: 'profilePhotoUrl' },
        { key: 'profilePhotoUrl', value: newAvatarUrl },
        { upsert: true, new: true }
      );
      invalidateCache();
      res.json({ avatarUrl: newAvatarUrl, profilePhotoUrl: newAvatarUrl });
    } catch (uploadErr) {
      console.error('[config] POST /avatar-upload failed:', uploadErr.message);
      res.status(500).json({ error: 'Failed to upload profile photo' });
    }
  });
});

module.exports = router;
