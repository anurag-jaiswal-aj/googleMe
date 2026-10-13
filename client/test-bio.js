import test from 'node:test';
import assert from 'node:assert';
import {
  BIO_SNIPPET,
  BIO_PARAGRAPHS,
  getBioParagraphs,
  getBioSnippet,
} from './src/data/aboutData.js';
import { ABOUT_QA } from './src/data/allPageData.js';

test('Bio helper: getBioSnippet derives snippet from first non-empty saved paragraph', () => {
  const saved = [
    'I am a software engineer focused on building robust full-stack applications.',
    'Second paragraph with additional details.',
  ];
  const snippet = getBioSnippet(saved);
  assert.strictEqual(
    snippet,
    'I am a software engineer focused on building robust full-stack applications.'
  );
});

test('Bio helper: getBioSnippet skips leading empty or whitespace paragraphs', () => {
  const saved = [
    '',
    '   ',
    'Leading whitespace paragraph is skipped in favor of this one.',
    'Another paragraph.',
  ];
  const snippet = getBioSnippet(saved);
  assert.strictEqual(
    snippet,
    'Leading whitespace paragraph is skipped in favor of this one.'
  );
});

test('Bio helper: getBioSnippet falls back to default when saved bio is missing or empty', () => {
  assert.strictEqual(getBioSnippet(null), BIO_SNIPPET);
  assert.strictEqual(getBioSnippet(undefined), BIO_SNIPPET);
  assert.strictEqual(getBioSnippet([]), BIO_SNIPPET);
  assert.strictEqual(getBioSnippet(['', '   ']), BIO_SNIPPET);

  const customFallback = ABOUT_QA[0].answer;
  assert.strictEqual(getBioSnippet(null, customFallback), customFallback);
  assert.strictEqual(getBioSnippet([], customFallback), customFallback);
});

test('Bio helper: getBioParagraphs returns saved paragraphs when available', () => {
  const saved = [
    'Paragraph one of the updated bio.',
    'Paragraph two with more experience details.',
  ];
  const paragraphs = getBioParagraphs(saved);
  assert.deepStrictEqual(paragraphs, [
    'Paragraph one of the updated bio.',
    'Paragraph two with more experience details.',
  ]);
});

test('Bio helper: getBioParagraphs falls back to default BIO_PARAGRAPHS when empty or missing', () => {
  assert.deepStrictEqual(getBioParagraphs(null), BIO_PARAGRAPHS);
  assert.deepStrictEqual(getBioParagraphs(undefined), BIO_PARAGRAPHS);
  assert.deepStrictEqual(getBioParagraphs([]), BIO_PARAGRAPHS);
  assert.deepStrictEqual(getBioParagraphs(['', '   ']), BIO_PARAGRAPHS);
});

test('All page simulation: saved bio updates bio snippet while non-bio cards remain unchanged', () => {
  const savedBio = [
    'Updated bio introduction for search results.',
    'Second paragraph of bio.',
  ];
  const cfg = { bioParagraphs: savedBio };

  const renderedCards = ABOUT_QA.map((item) => {
    const snippet = item.type === 'bio'
      ? getBioSnippet(cfg.bioParagraphs, item.answer)
      : item.answer;
    return { type: item.type, question: item.question, snippet };
  });

  // Bio card snippet must be updated
  assert.strictEqual(
    renderedCards[0].snippet,
    'Updated bio introduction for search results.'
  );

  // Non-bio cards must remain unchanged
  assert.strictEqual(renderedCards[1].type, 'skills');
  assert.strictEqual(renderedCards[1].snippet, ABOUT_QA[1].answer);

  assert.strictEqual(renderedCards[2].type, 'experience');
  assert.strictEqual(renderedCards[2].snippet, ABOUT_QA[2].answer);
});

test('All page simulation: missing saved bio falls back to static defaults for all cards', () => {
  const cfgEmpty = { bioParagraphs: [] };

  const renderedCards = ABOUT_QA.map((item) => {
    const snippet = item.type === 'bio'
      ? getBioSnippet(cfgEmpty.bioParagraphs, item.answer)
      : item.answer;
    return { type: item.type, snippet };
  });

  assert.strictEqual(renderedCards[0].snippet, ABOUT_QA[0].answer);
  assert.strictEqual(renderedCards[1].snippet, ABOUT_QA[1].answer);
  assert.strictEqual(renderedCards[2].snippet, ABOUT_QA[2].answer);
});

test('All page simulation: expanded bio renders saved paragraphs or fallback', () => {
  const savedBio = ['First custom paragraph', 'Second custom paragraph'];
  const expandedSaved = getBioParagraphs(savedBio);
  assert.deepStrictEqual(expandedSaved, savedBio);

  const expandedFallback = getBioParagraphs(null);
  assert.deepStrictEqual(expandedFallback, BIO_PARAGRAPHS);
});

test('About page simulation: saved bio updates snippet and expanded paragraphs', () => {
  const savedBio = ['Engineering student and builder.', 'Full stack focus.'];
  const cfg = { bioParagraphs: savedBio };
  const staticFallbackSnippet = ABOUT_QA[0].answer;

  const snippet = getBioSnippet(cfg.bioParagraphs, staticFallbackSnippet);
  const paragraphs = getBioParagraphs(cfg.bioParagraphs);

  assert.strictEqual(snippet, 'Engineering student and builder.');
  assert.deepStrictEqual(paragraphs, savedBio);
});

test('About page simulation: missing saved bio falls back to static snippet and paragraphs', () => {
  const cfg = {};
  const staticFallbackSnippet = ABOUT_QA[0].answer;

  const snippet = getBioSnippet(cfg.bioParagraphs, staticFallbackSnippet);
  const paragraphs = getBioParagraphs(cfg.bioParagraphs);

  assert.strictEqual(snippet, staticFallbackSnippet);
  assert.deepStrictEqual(paragraphs, BIO_PARAGRAPHS);
});
