const express = require('express');
const router = express.Router();
const SiteConfig = require('../models/SiteConfig');
const requireAuth = require('../middleware/auth');

// GET /api/config — public, anyone can read site config
router.get('/', async (req, res) => {
  try {
    const docs = await SiteConfig.find({});
    const config = {};
    docs.forEach(d => { config[d.key] = d.value; });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

// POST /api/config — protected, admin only
router.post('/', requireAuth, async (req, res) => {
  try {
    const { key, value, updates } = req.body;

    if (updates && Array.isArray(updates)) {
      // Bulk upsert
      await Promise.all(
        updates.map(({ key: k, value: v }) =>
          SiteConfig.findOneAndUpdate(
            { key: k },
            { key: k, value: v },
            { upsert: true, new: true }
          )
        )
      );
      return res.json({ ok: true });
    }

    if (!key) return res.status(400).json({ error: 'key is required' });

    const doc = await SiteConfig.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

module.exports = router;
