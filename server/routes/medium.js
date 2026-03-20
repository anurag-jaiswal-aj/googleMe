const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');

const MEDIUM_USER = 'janurag582004';
const MEDIUM_RSS = `https://medium.com/feed/@${MEDIUM_USER}`;

// Use a browser-like user-agent — Medium rate-limits generic Node.js agents
const parser = new Parser({
  customFields: { item: [['content:encoded', 'contentEncoded']] },
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  },
});

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

function cleanUrl(href = '') {
  try {
    const url = new URL(href);
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts[1] ? parts[1].replace(/-[a-f0-9]{10,}$/, '').replace(/-/g, ' ') : '';
    return `medium.com/@${MEDIUM_USER}${slug ? '/' + slug : ''}`;
  } catch {
    return `medium.com/@${MEDIUM_USER}`;
  }
}

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

router.get('/', async (req, res) => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    const feed = await parser.parseURL(MEDIUM_RSS);

    const posts = feed.items.map((item, i) => {
      const rawContent = item.contentEncoded || item.content || '';
      const content = rawContent
        .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, '')
        .replace(/<img[^>]*\s(?:width|height)="1"[^>]*>/gi, '');
      const href = item.link || '';
      return {
        id: item.guid || String(i),
        title: item.title || 'Untitled',
        url: cleanUrl(href),
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
    res.json(posts);
  } catch (err) {
    console.error('Medium RSS fetch failed:', err.message);
    res.status(502).json({ error: 'Failed to fetch Medium posts' });
  }
});

module.exports = router;
