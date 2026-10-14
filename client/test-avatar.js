import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Avatar from './src/components/Avatar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Avatar Component Unit Tests

test('Avatar: No configured photo renders original letter A without flip container', () => {
  const html = renderToString(React.createElement(Avatar, {
    name: 'Anurag',
    size: 'sm',
  }));

  // Must render circular A avatar
  assert.match(html, />A</);
  assert.match(html, /w-9 h-9/);
  assert.match(html, /rounded-full/);
  // Must NOT render 3D flip card when no photo is configured
  assert.doesNotMatch(html, /avatar-flip-container/);
  assert.doesNotMatch(html, /avatar-flip-inner/);
  assert.doesNotMatch(html, /<img/);
});

test('Avatar: Empty or whitespace photo URL renders original letter A', () => {
  const htmlEmpty = renderToString(React.createElement(Avatar, {
    url: '',
    name: 'Anurag',
  }));
  assert.doesNotMatch(htmlEmpty, /avatar-flip-container/);
  assert.match(htmlEmpty, />A</);

  const htmlWhitespace = renderToString(React.createElement(Avatar, {
    url: '   ',
    name: 'Anurag',
  }));
  assert.doesNotMatch(htmlWhitespace, /avatar-flip-container/);
  assert.match(htmlWhitespace, />A</);
});

test('Avatar: Configured photo renders 3D flip container with image and unmirrored back face', () => {
  const photoUrl = 'https://res.cloudinary.com/test/photo.jpg';
  const html = renderToString(React.createElement(Avatar, {
    url: photoUrl,
    name: 'Anurag Jaiswal',
    size: 'lg',
  }));

  // Flip container & inner 3D elements
  assert.match(html, /avatar-flip-container/);
  assert.match(html, /avatar-flip-inner/);
  assert.match(html, /avatar-flip-front/);
  assert.match(html, /avatar-flip-back/);

  // Front face has img with correct src and alt
  assert.match(html, new RegExp(`src="${photoUrl}"`));
  assert.match(html, /alt="Anurag Jaiswal(&#x27;|')s profile photo"/);
  assert.match(html, /object-cover/);

  // Back face has letter A and aria-hidden="true"
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, />A</);
  assert.match(html, /w-16 h-16/);
});

test('Avatar: as="button" renders button with proper accessibility attributes', () => {
  const htmlNoPhoto = renderToString(React.createElement(Avatar, {
    as: 'button',
    name: 'Anurag',
    ariaLabel: 'Google Account',
    size: 'sm',
  }));
  assert.match(htmlNoPhoto, /<button/);
  assert.match(htmlNoPhoto, /type="button"/);
  assert.match(htmlNoPhoto, /aria-label="Google Account"/);

  const htmlWithPhoto = renderToString(React.createElement(Avatar, {
    as: 'button',
    url: 'https://res.cloudinary.com/test/photo.jpg',
    name: 'Anurag',
    ariaLabel: 'Google Account',
    size: 'sm',
  }));
  assert.match(htmlWithPhoto, /<button/);
  assert.match(htmlWithPhoto, /type="button"/);
  assert.match(htmlWithPhoto, /aria-label="Google Account"/);
  assert.match(htmlWithPhoto, /avatar-flip-container/);
});

test('Avatar: Custom ringClassName and className are preserved', () => {
  const customRing = 'ring-2 ring-[#EA4335] ring-offset-1 ring-offset-white';
  const customClass = 'ml-1 custom-avatar-test';

  const html = renderToString(React.createElement(Avatar, {
    url: 'https://res.cloudinary.com/test/photo.jpg',
    ringClassName: customRing,
    className: customClass,
  }));

  assert.match(html, /ring-2 ring-\[#EA4335\]/);
  assert.match(html, /custom-avatar-test/);
});

// 2. CSS 3D Transforms and Reduced Motion Verification

test('CSS: index.css contains required 3D flip rules and prefers-reduced-motion overrides', () => {
  const cssPath = path.join(__dirname, 'src', 'styles', 'index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // 3D perspective and preserve-3d
  assert.match(cssContent, /perspective:\s*1000px/);
  assert.match(cssContent, /transform-style:\s*preserve-3d/);

  // Backface visibility hidden
  assert.match(cssContent, /backface-visibility:\s*hidden/);

  // Smooth rotation
  assert.match(cssContent, /transform:\s*rotateY\(180deg\)/);

  // Restrained transition duration (600ms within 500-700ms requirement)
  assert.match(cssContent, /600ms/);

  // prefers-reduced-motion override
  assert.match(cssContent, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(cssContent, /transition:\s*none/);
});
