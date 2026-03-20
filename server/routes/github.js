const express = require('express');
const router = express.Router();
const PortfolioConfig = require('../models/PortfolioConfig');
const requireAuth = require('../middleware/auth');

const GITHUB_USER = process.env.GITHUB_USERNAME || 'anurag-jaiswal-aj';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

let repoCache = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const githubHeaders = () => {
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
};

// Fetch all languages for a single repo, sorted by byte count
async function fetchRepoLanguages(fullName) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${fullName}/languages`,
      { headers: githubHeaders() }
    );
    if (!res.ok) return [];
    const data = await res.json(); // { HTML: 4200, CSS: 1800, JavaScript: 900 }
    return Object.entries(data)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang);
  } catch {
    return [];
  }
}

// Fetch all public repos + their language breakdowns
async function fetchAllRepos() {
  if (repoCache && Date.now() - repoCache.fetchedAt < CACHE_TTL_MS) {
    return repoCache.data;
  }

  let page = 1;
  let all = [];
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&page=${page}&sort=updated`,
      { headers: githubHeaders() }
    );
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    all = all.concat(batch);
    if (batch.length < 100) break;
    page++;
  }

  const nonForks = all.filter((r) => !r.fork);

  // Fetch languages for all repos in parallel
  const languagesPerRepo = await Promise.all(
    nonForks.map((r) => fetchRepoLanguages(r.full_name))
  );

  const repos = nonForks.map((r, i) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    repoUrl: r.html_url,
    demoUrl: r.homepage || '',
    languages: languagesPerRepo[i], // ['HTML', 'CSS', 'JavaScript']
    stars: r.stargazers_count,
    forks: r.forks_count,
    updatedAt: r.updated_at,
    topics: r.topics || [],
    isPrivate: r.private,
  }));

  repoCache = { data: repos, fetchedAt: Date.now() };
  return repos;
}

// GET /api/github/repos — all repos for admin picker
router.get('/repos', async (req, res, next) => {
  try {
    const repos = await fetchAllRepos();
    const config = await PortfolioConfig.findOne({ key: 'github_selection' });
    const selected = config?.selectedRepos ?? [];
    res.json({ repos, selected });
  } catch (err) {
    next(err);
  }
});

// POST /api/github/selection — save selected repo names + featured flags (admin only)
router.post('/selection', requireAuth, async (req, res, next) => {
  const { selectedRepos } = req.body;
  if (!Array.isArray(selectedRepos)) {
    return res.status(400).json({ error: 'selectedRepos must be an array' });
  }
  try {
    await PortfolioConfig.findOneAndUpdate(
      { key: 'github_selection' },
      { selectedRepos },
      { upsert: true, new: true }
    );
    res.json({ success: true, selectedRepos });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.fetchAllRepos = fetchAllRepos;
