const express = require('express');
const router = express.Router();
const PortfolioConfig = require('../models/PortfolioConfig');
const { fetchAllRepos } = require('./github');
const fallback = require('../../shared/projects.json');

// GET /api/projects — returns only selected GitHub repos shaped like the old schema
router.get('/', async (req, res, next) => {
  try {
    const config = await PortfolioConfig.findOne({ key: 'github_selection' });
    const selected = config?.selectedRepos ?? []; // [{ name, featured }]

    if (selected.length === 0) return res.json(fallback);

    const repos = await fetchAllRepos();
    const nameOrder = selected.map((s) => (typeof s === 'string' ? s : s.name));
    const featuredSet = new Set(
      selected.filter((s) => typeof s !== 'string' && s.featured).map((s) => s.name)
    );

    const filtered = repos
      .filter((r) => nameOrder.includes(r.name))
      .sort((a, b) => nameOrder.indexOf(a.name) - nameOrder.indexOf(b.name))
      .map((r, i) => ({
        _id: r.name,
        title: r.name,
        description: r.description,
        techStack: r.languages?.length ? r.languages : (r.topics?.length ? r.topics : []),
        repoUrl: r.repoUrl,
        demoUrl: r.demoUrl,
        imageUrl: '',
        featured: featuredSet.has(r.name),
        order: i + 1,
        stars: r.stars,
        forks: r.forks,
      }));

    res.json(filtered);
  } catch (err) {
    console.error('Projects route error, using fallback:', err.message);
    res.json(fallback);
  }
});

module.exports = router;
