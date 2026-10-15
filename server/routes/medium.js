const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const SiteConfig = require('../models/SiteConfig');
const { validateConfigEntry } = require('../utils/configValidation');

const DEFAULT_MEDIUM_USER = 'therightrag';

const parser = new Parser({
  customFields: { item: [['content:encoded', 'contentEncoded']] },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  },
});

function isValidMediumUsername(candidate) {
  if (typeof candidate !== 'string') return false;
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  return validateConfigEntry('mediumUsername', trimmed) === null;
}

function normalizeMediumUsername(candidate) {
  if (typeof candidate !== 'string') return '';
  return candidate.trim().replace(/^@/, '');
}

// Read username from DB so admin changes take effect without redeploying
async function getMediumUser() {
  try {
    const doc = await SiteConfig.findOne({ key: 'mediumUsername' }).lean();
    if (doc && isValidMediumUsername(doc.value)) {
      return normalizeMediumUsername(doc.value);
    }
  } catch (err) {
    console.error('Failed to read mediumUsername from SiteConfig:', err.message);
  }
  return DEFAULT_MEDIUM_USER;
}

function estimateReadTime(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ');
  return `${Math.max(1, Math.round(text.trim().split(/\s+/).length / 200))} min read`;
}

function extractThumbnail(html = '') {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : '';
}

function extractSnippet(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? text.slice(0, 157) + '…' : text;
}

function cleanUrl(href = '', user = '') {
  try {
    const url = new URL(href);
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[1] ? parts[1].replace(/-[a-f0-9]{10,}$/, '').replace(/-/g, ' ') : '';
    return `medium.com/@${user}${slug ? '/' + slug : ''}`;
  } catch {
    return `medium.com/@${user}`;
  }
}

let cache = null;
let cacheTime = 0;
let cachedUser = null;
const CACHE_TTL = 30 * 60 * 1000;

function invalidateMediumCache() {
  cache = null;
  cacheTime = 0;
  cachedUser = null;
}

router.get('/', async (_req, res) => {
  let user = DEFAULT_MEDIUM_USER;
  try {
    user = await getMediumUser();

    // Invalidate cache if username changed since last fetch
    if (cache && cachedUser === user && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    const encodedUser = encodeURIComponent(user);
    const feed = await parser.parseURL(`https://medium.com/feed/@${encodedUser}`);

    const posts = feed.items.map((item, i) => {
      const rawContent = item.contentEncoded || item.content || '';
      const content = rawContent
        .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, '')
        .replace(/<img[^>]*\s(?:width|height)="1"[^>]*>/gi, '');
      const href = item.link || '';
      return {
        id: item.guid || String(i),
        title: item.title || 'Untitled',
        url: cleanUrl(href, user),
        href,
        snippet: extractSnippet(content),
        date: new Date(item.pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: estimateReadTime(content),
        thumbnail: extractThumbnail(content),
        tags: (item.categories || []).slice(0, 4),
        content,
        faviconBg: '#00ab6c',
      };
    });

    cache = posts;
    cacheTime = Date.now();
    cachedUser = user;
    res.json(posts);
  } catch (err) {
    console.error('Medium RSS fetch failed:', err.message);
    if (cache && cachedUser === user && Array.isArray(cache) && cache.length > 0) {
      return res.json(cache);
    }
    res.status(502).json({ error: 'Failed to fetch Medium posts' });
  }
});

module.exports = router;
module.exports.getMediumUser = getMediumUser;
module.exports.isValidMediumUsername = isValidMediumUsername;
module.exports.normalizeMediumUsername = normalizeMediumUsername;
module.exports.invalidateMediumCache = invalidateMediumCache;
module.exports.DEFAULT_MEDIUM_USER = DEFAULT_MEDIUM_USER;
module.exports.parser = parser;
