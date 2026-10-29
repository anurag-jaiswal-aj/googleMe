import { arrayMove } from '@dnd-kit/sortable';

/**
 * Deterministically sorts gallery images.
 * Priority:
 * 1. Explicit numeric order ascending (items missing order default to 0)
 * 2. Creation timestamp descending (newest items first)
 * 3. Document ID ascending (stable tie-breaker)
 *
 * @param {Array} list
 * @returns {Array} Sorted copy of list
 */
export const sortGalleryImages = (list) => {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const orderA = typeof a?.order === 'number' && !isNaN(a.order) ? a.order : 0;
    const orderB = typeof b?.order === 'number' && !isNaN(b.order) ? b.order : 0;
    if (orderA !== orderB) return orderA - orderB;
    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return String(a?._id || '').localeCompare(String(b?._id || ''));
  });
};

/**
 * Checks whether the current arrangement differs from the saved baseline.
 *
 * @param {Array} currentList - Current array of gallery image objects
 * @param {Array<string>} savedOrderIds - Baseline array of string IDs
 * @returns {boolean} True if the order has changed
 */
export const isGalleryOrderChanged = (currentList, savedOrderIds) => {
  if (!Array.isArray(currentList) || !Array.isArray(savedOrderIds)) return false;
  if (currentList.length !== savedOrderIds.length) return false;
  return currentList.some((img, idx) => (img?._id || img?.id) !== savedOrderIds[idx]);
};

/**
 * Safely moves an item in an array from one index to another.
 * Respects boundary conditions and does nothing if indices are invalid or identical.
 *
 * @param {Array} items
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {Array}
 */
export const reorderGalleryItems = (items, fromIndex, toIndex) => {
  if (!Array.isArray(items)) return [];
  if (
    fromIndex < 0 ||
    fromIndex >= items.length ||
    toIndex < 0 ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  return arrayMove(items, fromIndex, toIndex);
};

/**
 * Computes accessible labels and state for a gallery item in the reorderable list.
 *
 * @param {Object} img - Gallery image record
 * @param {number} index - 0-based position
 * @param {number} total - Total image count
 * @param {boolean} [disabled=false] - Whether interactions are currently disabled
 */
export const getSortableGalleryItemLabels = (img, index, total, disabled = false) => {
  const title = img?.title || 'image';
  return {
    positionBadge: `#${index + 1}`,
    dragLabel: disabled ? `Reordering disabled while saving` : `Drag to reorder ${title}`,
    moveEarlierLabel: `Move ${title} earlier`,
    moveLaterLabel: `Move ${title} later`,
    editLabel: `Edit ${title}`,
    deleteLabel: `Delete ${title}`,
    canMoveEarlier: !disabled && index > 0,
    canMoveLater: !disabled && index < total - 1,
  };
};

/**
 * Incorporates a newly uploaded image into the gallery state while preserving
 * any unsaved drag-and-drop arrangement made by the administrator.
 *
 * @param {Array} currentList - Current gallery images (may be in unsaved order)
 * @param {Array<string>} savedOrderIds - Baseline saved order IDs
 * @param {Object} newImage - The newly created image document from the server
 * @returns {{ nextGalleryImages: Array, nextSavedOrderIds: Array }}
 */
export const incorporateUploadedImage = (currentList, savedOrderIds, newImage) => {
  if (!newImage || (!newImage._id && !newImage.id)) {
    return {
      nextGalleryImages: Array.isArray(currentList) ? currentList : [],
      nextSavedOrderIds: Array.isArray(savedOrderIds) ? savedOrderIds : [],
    };
  }

  const id = String(newImage._id || newImage.id);
  const normalizedNewImg = {
    ...newImage,
    _id: id,
    src: newImage.src || newImage.imageUrl || newImage.imageData || '',
  };

  const existingImages = Array.isArray(currentList)
    ? currentList.filter((img) => String(img?._id || img?.id) !== id)
    : [];
  const existingSavedIds = Array.isArray(savedOrderIds)
    ? savedOrderIds.filter((itemId) => String(itemId) !== id)
    : [];

  // Newly uploaded images default to order 0 on backend, so prepend to position #1
  // while retaining the administrator's custom ordering for all other images
  const nextGalleryImages = [normalizedNewImg, ...existingImages];
  const nextSavedOrderIds = [id, ...existingSavedIds];

  return { nextGalleryImages, nextSavedOrderIds };
};
