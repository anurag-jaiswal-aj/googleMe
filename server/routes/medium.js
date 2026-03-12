const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');

const parser = new Parser({
  customFields: {
    item: [['content:encoded', 'contentEncoded']],
  },
});

const MEDIUM_RSS = 'https://medium.com/feed/@janurag582004';

// Estimate read time from content (avg 200 wpm)
function estimateReadTime(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min read`;
}

// Extract thumbnail from content:encoded
function extractThumbnail(html = '') {
  const match = html.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : '';
}

// Extract plain-text snippet (~160 chars)
function extractSnippet(html = '') {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? text.slice(0, 157) + '…' : text;
}

// Clean URL → "medium.com/@janurag582004 › slug"
function cleanUrl(href = '') {
  try {
    const url = new URL(href);
    const parts = url.pathname.split('/').filter(Boolean); // ['@janurag582004', 'slug-abc123']
    const slug = parts[1] ? parts[1].replace(/-[a-f0-9]{10,}$/, '').replace(/-/g, ' ') : '';
    return `medium.com/@janurag582004${slug ? ' › ' + slug : ''}`;
  } catch {
    return 'medium.com/@janurag582004';
  }
}

// Auto-generate tags from title when Medium categories are empty
const KEYWORD_TAG_MAP = [
  { keys: ['react', 'hooks', 'component', 'jsx', 'next.js', 'frontend'],     tag: 'React' },
  { keys: ['node', 'express', 'backend', 'server', 'api'],                   tag: 'Node.js' },
  { keys: ['mongodb', 'database', 'mongoose', 'sql', 'postgres'],            tag: 'Database' },
  { keys: ['docker', 'devops', 'ci/cd', 'deploy', 'kubernetes'],             tag: 'DevOps' },
  { keys: ['javascript', 'typescript', 'js', 'ts'],                          tag: 'JavaScript' },
  { keys: ['css', 'tailwind', 'style', 'design', 'ui', 'ux'],                tag: 'CSS' },
  { keys: ['ai', 'machine learning', 'openai', 'gpt', 'llm'],                tag: 'AI' },
  { keys: ['productivity', 'focus', 'notion', 'tool', 'workflow', 'setup'],  tag: 'Productivity' },
  { keys: ['learn', 'skill', 'career', 'coding', 'programming'],             tag: 'Learning' },
  { keys: ['documentation', 'writing', 'communication'],                     tag: 'Writing' },
  { keys: ['mindful', 'boredom', 'comfort', 'quiet', 'life'],                tag: 'Mindfulness' },
  { keys: ['software', 'engineer', 'think', 'forgotten', 'moment'],          tag: 'Engineering' },
];

function autoTags(title = '', categories = []) {
  if (categories.length) return categories.slice(0, 4);
  const lower = title.toLowerCase();
  const found = KEYWORD_TAG_MAP.filter(({ keys }) => keys.some(k => lower.includes(k))).map(({ tag }) => tag);
  return found.length ? found.slice(0, 3) : ['Article'];
}

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

// GET /api/medium
router.get('/', async (req, res) => {
  try {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    const feed = await parser.parseURL(MEDIUM_RSS);

    const posts = feed.items.map((item, i) => {
      const rawContent = item.contentEncoded || item.content || '';
      // Strip Medium's tracking pixel before storing/sending content
      const content = rawContent
        .replace(/<img[^>]*medium\.com\/_\/stat[^>]*>/gi, '')
        .replace(/<img[^>]*\s(?:width|height)="1"[^>]*>/gi, '');
      const pubDate = new Date(item.pubDate);
      const href = item.link || '';
      return {
        id: item.guid || String(i),
        title: item.title || 'Untitled',
        url: cleanUrl(href),
        href,
        snippet: extractSnippet(content),
        date: pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        readTime: estimateReadTime(content),
        thumbnail: extractThumbnail(content),
        tags: autoTags(item.title, item.categories),
        content,                        // full HTML for in-portfolio reader
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
