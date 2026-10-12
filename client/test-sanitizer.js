import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { sanitizeMediumHtml } from './src/utils/sanitizeHtml.js';

// Setup JSDOM environment for test assertions and global window emulation
const testDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
globalThis.window = testDom.window;
const purifyInstance = DOMPurify(testDom.window);

function parseToDom(htmlString) {
  const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="root">${htmlString}</div></body></html>`);
  return dom.window.document.getElementById('root');
}

test('Sanitizer: Neutralizes executable script tags', () => {
  const payloads = [
    '<script>alert("xss")</script>',
    '<script src="https://evil.com/malicious.js"></script>',
    '<p>Intro text</p><script>window.hacked = true;</script><p>Outro text</p>',
    '<SCRIPT>alert(1)</SCRIPT>',
    '<<SCRIPT>script>alert(1)<</SCRIPT>/script>',
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeMediumHtml(payload, purifyInstance);
    assert.strictEqual(/<script/i.test(sanitized), false, `Payload must not contain script tag: ${payload}`);

    const root = parseToDom(sanitized);
    const scripts = root.querySelectorAll('script');
    assert.strictEqual(scripts.length, 0, `DOM must have 0 script elements for payload: ${payload}`);
  }
});

test('Sanitizer: Strips inline event handlers from all elements', () => {
  const payloads = [
    '<img src="https://example.com/photo.jpg" onerror="alert(1)">',
    '<a href="https://example.com" onclick="stealCredentials()">Click</a>',
    '<p onmouseover="alert(\'hover\')">Hover text</p>',
    '<h2 onfocus="alert(1)">Header</h2>',
    '<img src="https://example.com/pic.png" onload="alert(1)">',
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeMediumHtml(payload, purifyInstance);
    const root = parseToDom(sanitized);

    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      for (const attr of el.attributes) {
        assert.strictEqual(
          attr.name.toLowerCase().startsWith('on'),
          false,
          `Element <${el.tagName}> must not contain event handler "${attr.name}" in sanitized output`
        );
      }
    }
  }
});

test('Sanitizer: Removes unsafe URI schemes (javascript:, data: html, vbscript:)', () => {
  const payloads = [
    '<a href="javascript:alert(1)">Click here</a>',
    '<a href="JAVASCRIPT:alert(1)">Click here</a>',
    '<a href="jav&#x09;ascript:alert(1)">Click here</a>',
    '<a href="data:text/html,<script>alert(1)</script>">Data URL</a>',
    '<a href="vbscript:msgbox(1)">VBScript link</a>',
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeMediumHtml(payload, purifyInstance);
    const root = parseToDom(sanitized);
    const links = root.querySelectorAll('a');

    for (const link of links) {
      const href = link.getAttribute('href');
      if (href) {
        assert.strictEqual(
          /^(javascript|vbscript|data:text\/html)/i.test(href),
          false,
          `Link must not use dangerous scheme in href: "${href}"`
        );
      }
    }
  }
});

test('Sanitizer: Neutralizes SVG-based XSS vectors and active payloads', () => {
  const payloads = [
    '<svg><script>alert(1)</script></svg>',
    '<svg onload="alert(1)"><circle cx="5" cy="5" r="5"/></svg>',
    '<svg><set attributeName="onmouseover" to="alert(1)"/><text>XSS</text></svg>',
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeMediumHtml(payload, purifyInstance);
    assert.strictEqual(/<script/i.test(sanitized), false);

    const root = parseToDom(sanitized);
    const scripts = root.querySelectorAll('script');
    assert.strictEqual(scripts.length, 0);

    for (const el of root.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        assert.strictEqual(attr.name.toLowerCase().startsWith('on'), false);
      }
    }
  }
});

test('Sanitizer: Removes unsafe embedded content (iframe, object, embed, style, form)', () => {
  const payloads = [
    '<iframe src="https://attacker.com/malicious.html"></iframe>',
    '<object data="https://attacker.com/exploit.swf"></object>',
    '<embed src="https://attacker.com/exploit.swf">',
    '<style>body { display: none; }</style>',
    '<form action="https://phish.com"><input type="password" name="p"/></form>',
  ];

  for (const payload of payloads) {
    const sanitized = sanitizeMediumHtml(payload, purifyInstance);
    const root = parseToDom(sanitized);

    assert.strictEqual(root.querySelectorAll('iframe').length, 0);
    assert.strictEqual(root.querySelectorAll('object').length, 0);
    assert.strictEqual(root.querySelectorAll('embed').length, 0);
    assert.strictEqual(root.querySelectorAll('style').length, 0);
    assert.strictEqual(root.querySelectorAll('form, input').length, 0);
  }
});

test('Sanitizer: Preserves legitimate article formatting, code blocks, and media', () => {
  const legitimateArticle = `
    <h1>Article Title</h1>
    <h2>Section Header</h2>
    <p>This is a paragraph with <strong>bold</strong>, <em>italic</em>, and <code>inline code</code>.</p>
    <blockquote>Engineering requires vigilance and rigorous verification.</blockquote>
    <ul>
      <li>First point</li>
      <li>Second point</li>
    </ul>
    <ol>
      <li>Step one</li>
      <li>Step two</li>
    </ol>
    <pre><code>function add(a, b) {\n  return a + b;\n}</code></pre>
    <figure>
      <img src="https://miro.medium.com/v2/resize:fit:1400/sample-diagram.png" alt="Architecture diagram">
      <figcaption>System Architecture</figcaption>
    </figure>
    <p>Read more on <a href="https://medium.com/@janurag582004/post" target="_blank" rel="noopener noreferrer">Medium</a>.</p>
    <hr>
  `;

  const sanitized = sanitizeMediumHtml(legitimateArticle, purifyInstance);
  const root = parseToDom(sanitized);

  // Assert essential elements exist and contain expected content
  assert.strictEqual(root.querySelector('h1').textContent, 'Article Title');
  assert.strictEqual(root.querySelector('h2').textContent, 'Section Header');
  assert.strictEqual(root.querySelector('strong').textContent, 'bold');
  assert.strictEqual(root.querySelector('em').textContent, 'italic');
  assert.strictEqual(root.querySelector('blockquote').textContent.includes('vigilance'), true);
  assert.strictEqual(root.querySelectorAll('li').length, 4);
  assert.strictEqual(root.querySelector('pre code').textContent.includes('function add'), true);

  const img = root.querySelector('img');
  assert.ok(img);
  assert.strictEqual(img.getAttribute('src'), 'https://miro.medium.com/v2/resize:fit:1400/sample-diagram.png');
  assert.strictEqual(img.getAttribute('alt'), 'Architecture diagram');

  const link = root.querySelector('a');
  assert.ok(link);
  assert.strictEqual(link.getAttribute('href'), 'https://medium.com/@janurag582004/post');
});

test('Sanitizer: Preserves Medium URL normalization and cleans tracking artifacts', () => {
  const mediumMarkup = `
    <p>Check my <a href="/@janurag582004/my-story">profile story</a>.</p>
    <img src="https://medium.com/_/stat?event=view" width="1" height="1">
    <img src="https://example.com/pixel.gif" width="1" height="1">
    <div class="section-content">
      <div class="section-inner">
        <p>Unwrapped content paragraph</p>
      </div>
    </div>
  `;

  const sanitized = sanitizeMediumHtml(mediumMarkup, purifyInstance);
  const root = parseToDom(sanitized);

  // Relative link rewritten to absolute Medium URL
  const link = root.querySelector('a');
  assert.ok(link);
  assert.strictEqual(link.getAttribute('href'), 'https://medium.com/@janurag582004/my-story');

  // Tracking images removed
  const images = root.querySelectorAll('img');
  assert.strictEqual(images.length, 0);

  // Content preserved without redundant layout wrappers
  const paragraphs = root.querySelectorAll('p');
  assert.strictEqual(paragraphs.length, 2);
  assert.strictEqual(paragraphs[1].textContent, 'Unwrapped content paragraph');
  assert.strictEqual(root.querySelectorAll('.section-content').length, 0);
});

test('Sanitizer: Safely handles non-string and falsy inputs without throwing', () => {
  assert.strictEqual(sanitizeMediumHtml('', purifyInstance), '');
  assert.strictEqual(sanitizeMediumHtml(null, purifyInstance), '');
  assert.strictEqual(sanitizeMediumHtml(undefined, purifyInstance), '');
  assert.strictEqual(sanitizeMediumHtml(12345, purifyInstance), '');
  assert.strictEqual(sanitizeMediumHtml({}, purifyInstance), '');
});

test('Sanitizer: Regression test - sets up JSDOM environment and calls sanitizeMediumHtml(payload) without optional second argument', () => {
  // Explicitly set up JSDOM environment so global window is available
  const domEnv = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  globalThis.window = domEnv.window;

  const payload = `
    <h2>Architecture Overview</h2>
    <p>Legitimate paragraph with <strong>bold</strong> and <em>emphasis</em>.</p>
    <script>window.pwned = true;</script>
    <img src="https://example.com/system-design.png" onerror="alert(1)" alt="System Design">
    <a href="javascript:alert(1)">Dangerous link</a>
    <a href="/@janurag582004/scalable-web">Legitimate relative link</a>
    <iframe src="https://attacker.com/malicious.html"></iframe>
    <style>body { display: none; }</style>
    <svg onload="alert(1)"><circle cx="5" cy="5" r="5"/></svg>
  `;

  // Exercise identical call signature used by Blog.jsx and All.jsx (no second argument)
  const sanitized = sanitizeMediumHtml(payload);

  // 1. Verify dangerous HTML is completely removed
  assert.strictEqual(/<script/i.test(sanitized), false, 'Script tag must be stripped');
  assert.strictEqual(/onerror/i.test(sanitized), false, 'onerror attribute must be stripped');
  assert.strictEqual(/javascript:/i.test(sanitized), false, 'javascript: URI must be stripped');
  assert.strictEqual(/<iframe/i.test(sanitized), false, 'iframe element must be stripped');
  assert.strictEqual(/<style/i.test(sanitized), false, 'style element must be stripped');
  assert.strictEqual(/onload/i.test(sanitized), false, 'onload attribute must be stripped');

  // Parse sanitized output with DOM to inspect element tree
  const root = parseToDom(sanitized);
  assert.strictEqual(root.querySelectorAll('script, iframe, style').length, 0, 'Dangerous tags must not exist in DOM');
  assert.strictEqual(root.querySelectorAll('[onerror], [onload], [onclick]').length, 0, 'No event handler attributes in DOM');

  // 2. Verify safe article content is preserved
  assert.strictEqual(root.querySelector('h2').textContent, 'Architecture Overview');
  assert.strictEqual(root.querySelector('strong').textContent, 'bold');
  assert.strictEqual(root.querySelector('em').textContent, 'emphasis');

  const img = root.querySelector('img');
  assert.ok(img, 'Legitimate image must be preserved');
  assert.strictEqual(img.getAttribute('src'), 'https://example.com/system-design.png');
  assert.strictEqual(img.getAttribute('alt'), 'System Design');
  assert.strictEqual(img.hasAttribute('onerror'), false);

  const links = root.querySelectorAll('a');
  assert.strictEqual(links.length, 2);
  assert.strictEqual(links[0].hasAttribute('href') && links[0].getAttribute('href').startsWith('javascript:'), false, 'Dangerous href must be removed');
  assert.strictEqual(links[1].getAttribute('href'), 'https://medium.com/@janurag582004/scalable-web', 'Medium relative link rewritten to absolute');
});
