const express = require('express');
const router = express.Router();
const SiteConfig = require('../models/SiteConfig');
const requireAuth = require('../middleware/auth');

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

module.exports = router;
