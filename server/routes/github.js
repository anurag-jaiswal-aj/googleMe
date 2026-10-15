const express = require('express');
const router = express.Router();
const PortfolioConfig = require('../models/PortfolioConfig');
const SiteConfig = require('../models/SiteConfig');
const requireAuth = require('../middleware/auth');
const { validateConfigEntry, validateGithubSelection } = require('../utils/configValidation');

const CANONICAL_GITHUB_USER = 'anurag-jaiswal-aj';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let repoCache = null; // { user: string, data: Array, fetchedAt: number }

function invalidateRepoCache() {
  repoCache = null;
}

const githubHeaders = () => {
  const token = process.env.GITHUB_TOKEN || '';
  const h = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

/**
 * Validates a candidate GitHub username string against the contract:
 * 1-39 characters consisting of alphanumeric characters and single hyphens.
 */
function isValidGithubUsername(candidate) {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  return validateConfigEntry('githubUsername', trimmed) === null;
}

/**
 * Resolves active GitHub username with precedence:
 * 1. SiteConfig.githubUsername from MongoDB (if valid and non-empty)
 * 2. process.env.GITHUB_USERNAME (if valid and non-empty)
 * 3. Canonical fallback 'anurag-jaiswal-aj'
 */
async function getGithubUser() {
  try {
    const doc = await SiteConfig.findOne({ key: 'githubUsername' }).lean();
    if (doc && isValidGithubUsername(doc.value)) {
      return doc.value.trim();
    }
  } catch (err) {
    console.error('Failed to read githubUsername from SiteConfig:', err.message);
  }

  const envUser = process.env.GITHUB_USERNAME;
  if (isValidGithubUsername(envUser)) {
    return envUser.trim();
  }

  return CANONICAL_GITHUB_USER;
}

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
async function fetchAllRepos(usernameOverride) {
  const activeUser = (usernameOverride && isValidGithubUsername(usernameOverride))
    ? usernameOverride.trim()
    : await getGithubUser();

  if (repoCache && repoCache.user === activeUser && Date.now() - repoCache.fetchedAt < CACHE_TTL_MS) {
    return repoCache.data;
  }

  let page = 1;
  let all = [];
  const encodedUser = encodeURIComponent(activeUser);
  try {
    while (true) {
      const res = await fetch(
        `https://api.github.com/users/${encodedUser}/repos?per_page=100&page=${page}&sort=updated`,
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

    repoCache = { user: activeUser, data: repos, fetchedAt: Date.now() };
    return repos;
  } catch (err) {
    // Stale fallback: only return cache if it matches the current active user
    if (repoCache && repoCache.user === activeUser && Array.isArray(repoCache.data)) {
      console.error(`GitHub fetch failed, returning stale cache for ${activeUser}:`, err.message);
      return repoCache.data;
    }
    throw err;
  }
}

// GET /api/github/repos: all repos for admin picker (admin only)
router.get('/repos', requireAuth, async (req, res, next) => {
  try {
    const repos = await fetchAllRepos();
    const config = await PortfolioConfig.findOne({ key: 'github_selection' });
    const selected = config?.selectedRepos ?? [];
    res.json({ repos, selected });
  } catch (err) {
    next(err);
  }
});

// POST /api/github/selection: save selected repo names + featured flags (admin only)
router.post('/selection', requireAuth, async (req, res, next) => {
  const { selectedRepos } = req.body || {};
  const validationErr = validateGithubSelection(selectedRepos);
  if (validationErr) {
    return res.status(400).json({ error: validationErr });
  }
  try {
    await PortfolioConfig.findOneAndUpdate(
      { key: 'github_selection' },
      { selectedRepos },
      { upsert: true, new: true, runValidators: true }
    );
    res.json({ success: true, selectedRepos });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.fetchAllRepos = fetchAllRepos;
module.exports.getGithubUser = getGithubUser;
module.exports.isValidGithubUsername = isValidGithubUsername;
module.exports.invalidateRepoCache = invalidateRepoCache;
module.exports.CANONICAL_GITHUB_USER = CANONICAL_GITHUB_USER;
