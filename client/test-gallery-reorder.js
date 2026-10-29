import test from 'node:test';
import assert from 'node:assert';
import {
  sortGalleryImages,
  isGalleryOrderChanged,
  reorderGalleryItems,
  getSortableGalleryItemLabels,
  incorporateUploadedImage,
} from './src/utils/galleryOrder.js';
import { reorderImages } from './src/api/index.js';

// ═════════════════════════════════════════════════════════════
// 1. sortGalleryImages Tests
// ═════════════════════════════════════════════════════════════

test('sortGalleryImages: orders items by numeric order ascending', () => {
  const input = [
    { _id: '1', title: 'Third', order: 2, createdAt: '2026-01-01T00:00:00Z' },
    { _id: '2', title: 'First', order: 0, createdAt: '2026-01-01T00:00:00Z' },
    { _id: '3', title: 'Second', order: 1, createdAt: '2026-01-01T00:00:00Z' },
  ];

  const sorted = sortGalleryImages(input);
  assert.strictEqual(sorted[0]._id, '2');
  assert.strictEqual(sorted[1]._id, '3');
  assert.strictEqual(sorted[2]._id, '1');
});

test('sortGalleryImages: missing or null order is normalized to 0', () => {
  const input = [
    { _id: 'explicit-1', title: 'Explicit 1', order: 1, createdAt: '2026-01-01T00:00:00Z' },
    { _id: 'legacy-missing', title: 'Missing Order', createdAt: '2026-01-02T00:00:00Z' },
    { _id: 'legacy-null', title: 'Null Order', order: null, createdAt: '2026-01-03T00:00:00Z' },
    { _id: 'legacy-nan', title: 'NaN Order', order: NaN, createdAt: '2026-01-04T00:00:00Z' },
  ];

  const sorted = sortGalleryImages(input);
  // All three legacy items have order = 0, so they sort before explicit-1 (order = 1).
  // Among legacy items, newest createdAt first: legacy-nan (Jan 4), then legacy-null (Jan 3), then legacy-missing (Jan 2).
  assert.strictEqual(sorted[0]._id, 'legacy-nan');
  assert.strictEqual(sorted[1]._id, 'legacy-null');
  assert.strictEqual(sorted[2]._id, 'legacy-missing');
  assert.strictEqual(sorted[3]._id, 'explicit-1');
});

test('sortGalleryImages: falls back to createdAt descending when order is identical', () => {
  const input = [
    { _id: 'older', order: 0, createdAt: '2026-01-01T00:00:00Z' },
    { _id: 'newest', order: 0, createdAt: '2026-03-01T00:00:00Z' },
    { _id: 'middle', order: 0, createdAt: '2026-02-01T00:00:00Z' },
  ];

  const sorted = sortGalleryImages(input);
  assert.strictEqual(sorted[0]._id, 'newest');
  assert.strictEqual(sorted[1]._id, 'middle');
  assert.strictEqual(sorted[2]._id, 'older');
});

test('sortGalleryImages: falls back to _id ascending for identical order and timestamp', () => {
  const time = '2026-01-01T00:00:00Z';
  const input = [
    { _id: 'id-c', order: 0, createdAt: time },
    { _id: 'id-a', order: 0, createdAt: time },
    { _id: 'id-b', order: 0, createdAt: time },
  ];

  const sorted = sortGalleryImages(input);
  assert.strictEqual(sorted[0]._id, 'id-a');
  assert.strictEqual(sorted[1]._id, 'id-b');
  assert.strictEqual(sorted[2]._id, 'id-c');
});

test('sortGalleryImages: does not mutate the input array (pure function)', () => {
  const input = [
    { _id: '2', order: 1 },
    { _id: '1', order: 0 },
  ];
  const copy = [...input];

  const sorted = sortGalleryImages(input);
  assert.deepStrictEqual(input, copy);
  assert.notStrictEqual(sorted, input);
});

test('sortGalleryImages: safely handles empty and invalid inputs', () => {
  assert.deepStrictEqual(sortGalleryImages([]), []);
  assert.deepStrictEqual(sortGalleryImages(null), []);
  assert.deepStrictEqual(sortGalleryImages(undefined), []);
  assert.deepStrictEqual(sortGalleryImages('string'), []);
  assert.deepStrictEqual(sortGalleryImages(123), []);
  assert.deepStrictEqual(sortGalleryImages({}), []);
});

// ═════════════════════════════════════════════════════════════
// 2. reorderGalleryItems Tests (drag-and-drop & manual moves)
// ═════════════════════════════════════════════════════════════

test('reorderGalleryItems: moves an item forward (index 0 to 2)', () => {
  const items = [{ _id: 'A' }, { _id: 'B' }, { _id: 'C' }];
  const result = reorderGalleryItems(items, 0, 2);
  assert.deepStrictEqual(result.map((i) => i._id), ['B', 'C', 'A']);
});

test('reorderGalleryItems: moves an item backward (index 2 to 0)', () => {
  const items = [{ _id: 'A' }, { _id: 'B' }, { _id: 'C' }];
  const result = reorderGalleryItems(items, 2, 0);
  assert.deepStrictEqual(result.map((i) => i._id), ['C', 'A', 'B']);
});

test('reorderGalleryItems: swaps adjacent items (index 1 to 2)', () => {
  const items = [{ _id: 'A' }, { _id: 'B' }, { _id: 'C' }];
  const result = reorderGalleryItems(items, 1, 2);
  assert.deepStrictEqual(result.map((i) => i._id), ['A', 'C', 'B']);
});

test('reorderGalleryItems: returns original array on boundary out-of-bounds indices', () => {
  const items = [{ _id: 'A' }, { _id: 'B' }];
  assert.strictEqual(reorderGalleryItems(items, -1, 1), items);
  assert.strictEqual(reorderGalleryItems(items, 0, 5), items);
  assert.strictEqual(reorderGalleryItems(items, 3, 0), items);
  assert.strictEqual(reorderGalleryItems(items, 1, -1), items);
});

test('reorderGalleryItems: returns original array on identical indices (no-op)', () => {
  const items = [{ _id: 'A' }, { _id: 'B' }];
  assert.strictEqual(reorderGalleryItems(items, 1, 1), items);
});

test('reorderGalleryItems: returns empty array when given non-array', () => {
  assert.deepStrictEqual(reorderGalleryItems(null, 0, 1), []);
});

// ═════════════════════════════════════════════════════════════
// 3. isGalleryOrderChanged Tests (state tracking & Save button)
// ═════════════════════════════════════════════════════════════

test('isGalleryOrderChanged: detects identical order as unchanged (false)', () => {
  const current = [{ _id: 'id1' }, { _id: 'id2' }, { _id: 'id3' }];
  const saved = ['id1', 'id2', 'id3'];
  assert.strictEqual(isGalleryOrderChanged(current, saved), false);
});

test('isGalleryOrderChanged: detects reordered items as changed (true)', () => {
  const current = [{ _id: 'id2' }, { _id: 'id1' }, { _id: 'id3' }];
  const saved = ['id1', 'id2', 'id3'];
  assert.strictEqual(isGalleryOrderChanged(current, saved), true);
});

test('isGalleryOrderChanged: detects change when first and last are swapped', () => {
  const current = [{ _id: 'id3' }, { _id: 'id2' }, { _id: 'id1' }];
  const saved = ['id1', 'id2', 'id3'];
  assert.strictEqual(isGalleryOrderChanged(current, saved), true);
});

test('isGalleryOrderChanged: returns false when collection lengths mismatch', () => {
  const current = [{ _id: 'id1' }, { _id: 'id2' }];
  const saved = ['id1', 'id2', 'id3'];
  assert.strictEqual(isGalleryOrderChanged(current, saved), false);
});

test('isGalleryOrderChanged: handles invalid inputs gracefully', () => {
  assert.strictEqual(isGalleryOrderChanged(null, []), false);
  assert.strictEqual(isGalleryOrderChanged([], null), false);
  assert.strictEqual(isGalleryOrderChanged('string', []), false);
});

// ═════════════════════════════════════════════════════════════
// 4. getSortableGalleryItemLabels Tests (Accessibility & UI Contract)
// ═════════════════════════════════════════════════════════════

test('getSortableGalleryItemLabels: produces accurate position badge and labels', () => {
  const img = { _id: '123', title: 'Portfolio Redesign' };
  const labels = getSortableGalleryItemLabels(img, 0, 5);

  assert.strictEqual(labels.positionBadge, '#1');
  assert.strictEqual(labels.dragLabel, 'Drag to reorder Portfolio Redesign');
  assert.strictEqual(labels.moveEarlierLabel, 'Move Portfolio Redesign earlier');
  assert.strictEqual(labels.moveLaterLabel, 'Move Portfolio Redesign later');
  assert.strictEqual(labels.editLabel, 'Edit Portfolio Redesign');
  assert.strictEqual(labels.deleteLabel, 'Delete Portfolio Redesign');
});

test('getSortableGalleryItemLabels: disables all move actions and updates drag label when disabled is true', () => {
  const img = { _id: '123', title: 'Portfolio Redesign' };
  const labels = getSortableGalleryItemLabels(img, 1, 5, true);

  assert.strictEqual(labels.dragLabel, 'Reordering disabled while saving');
  assert.strictEqual(labels.canMoveEarlier, false);
  assert.strictEqual(labels.canMoveLater, false);
});

test('getSortableGalleryItemLabels: boundary disabled states for first and last items', () => {
  const img = { _id: '123', title: 'Cert' };

  // First item (index 0 of 3): cannot move earlier, can move later
  const first = getSortableGalleryItemLabels(img, 0, 3);
  assert.strictEqual(first.canMoveEarlier, false);
  assert.strictEqual(first.canMoveLater, true);

  // Middle item (index 1 of 3): can move both directions
  const middle = getSortableGalleryItemLabels(img, 1, 3);
  assert.strictEqual(middle.canMoveEarlier, true);
  assert.strictEqual(middle.canMoveLater, true);

  // Last item (index 2 of 3): can move earlier, cannot move later
  const last = getSortableGalleryItemLabels(img, 2, 3);
  assert.strictEqual(last.canMoveEarlier, true);
  assert.strictEqual(last.canMoveLater, false);
});

test('getSortableGalleryItemLabels: handles untitled or missing image titles gracefully', () => {
  const labels = getSortableGalleryItemLabels({}, 0, 1);
  assert.strictEqual(labels.dragLabel, 'Drag to reorder image');
  assert.strictEqual(labels.moveEarlierLabel, 'Move image earlier');
});

// ═════════════════════════════════════════════════════════════
// 5. Client API reorderImages Contract
// ═════════════════════════════════════════════════════════════

test('reorderImages: function is exported and callable', () => {
  assert.strictEqual(typeof reorderImages, 'function');
});

// ═════════════════════════════════════════════════════════════
// 6. incorporateUploadedImage Tests (Preserving Unsaved Order)
// ═════════════════════════════════════════════════════════════

test('incorporateUploadedImage: prepends new image while preserving administrator custom order', () => {
  // Initial saved baseline was: [A, B, C]
  const saved = ['idA', 'idB', 'idC'];
  // Admin rearranged to: [C, A, B]
  const current = [
    { _id: 'idC', title: 'C' },
    { _id: 'idA', title: 'A' },
    { _id: 'idB', title: 'B' },
  ];
  assert.strictEqual(isGalleryOrderChanged(current, saved), true);

  // Admin uploads new image D
  const newImg = { _id: 'idD', title: 'D', imageUrl: 'https://example.com/d.jpg' };
  const { nextGalleryImages, nextSavedOrderIds } = incorporateUploadedImage(current, saved, newImg);

  // New image D should be at position #1 (index 0)
  assert.strictEqual(nextGalleryImages[0]._id, 'idD');
  assert.strictEqual(nextGalleryImages[0].src, 'https://example.com/d.jpg');

  // Existing images must retain the admin's custom rearranged sequence: [C, A, B]
  assert.deepStrictEqual(
    nextGalleryImages.slice(1).map((i) => i._id),
    ['idC', 'idA', 'idB']
  );

  // Baseline must reflect the new document in database at index 0 (default order 0)
  assert.deepStrictEqual(nextSavedOrderIds, ['idD', 'idA', 'idB', 'idC']);

  // Change detection must still report unsaved changes because [C, A, B] !== [A, B, C]
  assert.strictEqual(isGalleryOrderChanged(nextGalleryImages, nextSavedOrderIds), true);
});

test('incorporateUploadedImage: handles invalid or empty inputs gracefully', () => {
  const current = [{ _id: 'idA' }];
  const saved = ['idA'];

  const res1 = incorporateUploadedImage(current, saved, null);
  assert.strictEqual(res1.nextGalleryImages, current);
  assert.strictEqual(res1.nextSavedOrderIds, saved);

  const res2 = incorporateUploadedImage(null, null, { _id: 'idX', title: 'X' });
  assert.strictEqual(res2.nextGalleryImages.length, 1);
  assert.strictEqual(res2.nextGalleryImages[0]._id, 'idX');
  assert.deepStrictEqual(res2.nextSavedOrderIds, ['idX']);
});
