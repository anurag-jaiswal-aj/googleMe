import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { matchPath } from 'react-router-dom';
import { LINKS } from './src/config/links.js';
import { inlineResumeUrl, isSafeResumeUrl, getSafeResumeUrl } from './src/utils/resumeUrl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── SEC-23: Resume URL Configuration and Dynamic SPA Redirect Tests ───────────

test('SEC-23: inlineResumeUrl normalizes Google Drive share links to /preview', () => {
  const gDriveSharing = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing';
  const expectedPreview = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview';
  assert.strictEqual(inlineResumeUrl(gDriveSharing), expectedPreview);

  const gDriveDirect = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.strictEqual(inlineResumeUrl(gDriveDirect), expectedPreview);

  const gDriveOpen = 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
  assert.strictEqual(inlineResumeUrl(gDriveOpen), expectedPreview);

  const gDriveUc = 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms&export=download';
  assert.strictEqual(inlineResumeUrl(gDriveUc), expectedPreview);

  // Non-drive URLs remain untouched
  const cloudinaryUrl = 'https://res.cloudinary.com/dgsstziwz/raw/upload/v1791779439/gfolio/resume_1791779438123.pdf';
  assert.strictEqual(inlineResumeUrl(cloudinaryUrl), cloudinaryUrl);

  const localPdf = '/Resume_aj.pdf';
  assert.strictEqual(inlineResumeUrl(localPdf), localPdf);

  assert.strictEqual(inlineResumeUrl(''), '');
  assert.strictEqual(inlineResumeUrl(null), null);
  assert.strictEqual(inlineResumeUrl(undefined), '');
});

test('SEC-23: isSafeResumeUrl validates allowed schemes and rejects unsafe schemes', () => {
  const base = 'https://googleme.vercel.app/resume';

  // Valid schemes
  assert.strictEqual(isSafeResumeUrl('https://example.com/resume.pdf', base), true);
  assert.strictEqual(isSafeResumeUrl('http://example.com/resume.pdf', base), true);
  assert.strictEqual(isSafeResumeUrl('/Resume_aj.pdf', base), true);

  // Unsafe schemes
  assert.strictEqual(isSafeResumeUrl('javascript:alert(1)', base), false);
  assert.strictEqual(isSafeResumeUrl('JAVASCRIPT:alert(document.cookie)', base), false);
  assert.strictEqual(isSafeResumeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==', base), false);
  assert.strictEqual(isSafeResumeUrl('vbscript:msgbox(1)', base), false);

  // Malformed or empty
  assert.strictEqual(isSafeResumeUrl('', base), false);
  assert.strictEqual(isSafeResumeUrl('   ', base), false);
  assert.strictEqual(isSafeResumeUrl(null, base), false);
  assert.strictEqual(isSafeResumeUrl(undefined, base), false);
  assert.strictEqual(isSafeResumeUrl(123, base), false);
  assert.strictEqual(isSafeResumeUrl('https://' + 'a'.repeat(1005), base), false);
});

test('SEC-23: isSafeResumeUrl detects and blocks redirect loops', () => {
  const current = 'https://googleme.vercel.app/resume';

  // Same-origin relative and absolute paths pointing back to /resume
  assert.strictEqual(isSafeResumeUrl('/resume', current), false, 'Relative /resume must be detected as loop');
  assert.strictEqual(isSafeResumeUrl('/resume/', current), false, 'Relative /resume/ must be detected as loop');
  assert.strictEqual(isSafeResumeUrl('/Resume', current), false, 'Case-variant /Resume must be detected as loop');
  assert.strictEqual(isSafeResumeUrl('/Resume/', current), false, 'Case-variant /Resume/ must be detected as loop');
  assert.strictEqual(isSafeResumeUrl('https://googleme.vercel.app/resume', current), false, 'Full same-origin /resume must be detected as loop');
  assert.strictEqual(isSafeResumeUrl('https://googleme.vercel.app/Resume/', current), false, 'Full same-origin /Resume/ must be detected as loop');

  // Exact match with current location is detected as loop
  assert.strictEqual(isSafeResumeUrl(current, current), false, 'Exact current URL must be detected as loop');

  // External URLs ending in /resume are valid destinations on external sites
  assert.strictEqual(isSafeResumeUrl('https://external-host.com/resume', current), true);
  assert.strictEqual(isSafeResumeUrl('https://linkedin.com/in/anurag/resume', current), true);
});

test('SEC-23: getSafeResumeUrl resolves configured resumeUrl and falls back safely', () => {
  const current = 'https://googleme.vercel.app/resume';
  const customPdf = 'https://res.cloudinary.com/custom/resume_2026.pdf';

  // 1. Valid custom URL is honored
  assert.strictEqual(getSafeResumeUrl(customPdf, LINKS.resume, current), customPdf);

  // 2. Google Drive share link is converted to preview
  const driveUrl = 'https://drive.google.com/file/d/abcdef123456/view';
  assert.strictEqual(
    getSafeResumeUrl(driveUrl, LINKS.resume, current),
    'https://drive.google.com/file/d/abcdef123456/preview'
  );

  // 3. Local PDF path is preserved
  assert.strictEqual(getSafeResumeUrl('/Resume_aj.pdf', LINKS.resume, current), '/Resume_aj.pdf');

  // 4. Missing/whitespace configuration falls back to LINKS.resume
  assert.strictEqual(getSafeResumeUrl('', LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl('   ', LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl(null, LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl(undefined, LINKS.resume, current), LINKS.resume);

  // 5. Unsafe schemes fall back to LINKS.resume
  assert.strictEqual(getSafeResumeUrl('javascript:alert(1)', LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl('data:text/html,<script>alert(1)</script>', LINKS.resume, current), LINKS.resume);

  // 6. Redirect loops fall back to LINKS.resume
  assert.strictEqual(getSafeResumeUrl('/resume', LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl('/Resume/', LINKS.resume, current), LINKS.resume);
  assert.strictEqual(getSafeResumeUrl('https://googleme.vercel.app/resume', LINKS.resume, current), LINKS.resume);

  // 7. If both candidate and fallback are invalid, defaults to root
  assert.strictEqual(getSafeResumeUrl('/resume', '/resume', current), '/');
  assert.strictEqual(getSafeResumeUrl('javascript:1', 'javascript:2', current), '/');
});

test('SEC-23: React Router matches /resume and its case and slash variants', () => {
  const pattern = { path: '/resume' };

  assert.ok(matchPath(pattern, '/resume'), '/resume must match route');
  assert.ok(matchPath(pattern, '/Resume'), '/Resume must match route');
  assert.ok(matchPath(pattern, '/resume/'), '/resume/ must match route');
  assert.ok(matchPath(pattern, '/Resume/'), '/Resume/ must match route');

  // Unrelated and legacy PDF paths must not match /resume
  assert.strictEqual(matchPath(pattern, '/resume.pdf'), null);
  assert.strictEqual(matchPath(pattern, '/Resume.pdf'), null);
  assert.strictEqual(matchPath(pattern, '/resume_aj.pdf'), null);
  assert.strictEqual(matchPath(pattern, '/about'), null);
});

test('SEC-23: Workbox configuration permits /resume SPA fallback while protecting PDFs and API', () => {
  const viteConfigPath = path.resolve(__dirname, 'vite.config.js');
  const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');

  // /resume must not be denylisted
  assert.ok(!viteContent.includes('/^\\/resume\\/?$/i'), 'vite.config.js must not denylist /resume');

  // .pdf and /api must remain denylisted
  assert.ok(viteContent.includes('/\\.pdf$/i'), 'vite.config.js must denylist .pdf');
  assert.ok(viteContent.includes('/^\\/api/'), 'vite.config.js must denylist /api');
});

test('SEC-23: Vercel routing preserves legacy PDF rewrites and routes /resume to SPA', () => {
  const vercelPath = path.resolve(__dirname, 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));

  // No static redirect rules for /resume
  const redirects = Array.isArray(vercelConfig.redirects) ? vercelConfig.redirects : [];
  const resumeRedirects = redirects.filter(r => /^\/resume\/?$/i.test(r.source));
  assert.strictEqual(resumeRedirects.length, 0, 'vercel.json must not statically redirect /resume');

  // Legacy PDF rewrites intact
  assert.ok(Array.isArray(vercelConfig.rewrites), 'vercel.json must have rewrites array');
  const pdfRewrites = vercelConfig.rewrites.filter(r => r.destination === '/Resume_aj.pdf');
  const pdfSources = pdfRewrites.map(r => r.source);
  assert.ok(pdfSources.includes('/resume.pdf'), 'Must preserve /resume.pdf rewrite');
  assert.ok(pdfSources.includes('/Resume.pdf'), 'Must preserve /Resume.pdf rewrite');
  assert.ok(pdfSources.includes('/resume_aj.pdf'), 'Must preserve /resume_aj.pdf rewrite');

  // Catch-all rewrite for SPA traffic
  const catchAll = vercelConfig.rewrites.find(r => r.source === '/(.*)' && r.destination === '/index.html');
  assert.ok(catchAll, 'vercel.json must route SPA traffic to /index.html');
});

test('SEC-23: CSP integrity in vercel.json matches client/index.html inline script hash', () => {
  const vercelPath = path.resolve(__dirname, 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
  const catchAll = vercelConfig.headers.find(h => h.source === '/(.*)');
  assert.ok(catchAll, 'vercel.json must have catch-all headers entry');

  const headerMap = Object.fromEntries(catchAll.headers.map(h => [h.key, h.value]));
  const csp = headerMap['Content-Security-Policy'];
  assert.ok(csp, 'vercel.json must define Content-Security-Policy');

  const indexPath = path.resolve(__dirname, 'index.html');
  const htmlContent = fs.readFileSync(indexPath, 'utf-8');
  const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(scriptMatch, 'client/index.html must contain inline theme script');

  const expectedHash = crypto.createHash('sha256').update(scriptMatch[1]).digest('base64');
  assert.ok(
    csp.includes(`'sha256-${expectedHash}'`),
    `CSP script-src must contain exact SHA-256 hash 'sha256-${expectedHash}'`
  );
});
