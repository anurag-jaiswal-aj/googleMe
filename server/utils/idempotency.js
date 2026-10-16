const crypto = require('crypto');
const IdempotencyRecord = require('../models/IdempotencyRecord');

const KEY_REGEX = /^[A-Za-z0-9_.-]{1,128}$/;

/**
 * Validates and normalizes an Idempotency-Key.
 * Accepts undefined/null/empty as valid (no-op / backward-compatible).
 * Enforces string type, 1-128 chars, alphanumeric + hyphen/underscore/dot.
 */
function validateIdempotencyKey(raw) {
  if (raw === undefined || raw === null || raw === '') {
    return { valid: true, key: null };
  }
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Idempotency-Key must be a string' };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, error: 'Idempotency-Key cannot be empty or whitespace' };
  }
  if (trimmed.length > 128) {
    return { valid: false, error: 'Idempotency-Key cannot exceed 128 characters' };
  }
  if (!KEY_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Idempotency-Key contains invalid characters. Allowed: alphanumeric, hyphen, underscore, dot.',
    };
  }
  return { valid: true, key: trimmed };
}

/**
 * Computes a deterministic SHA-256 hash of the canonical request payload.
 * Excludes multipart boundaries and timestamps. Hashes attachment bytes and metadata.
 */
function computePayloadHash(scope, body = {}, filesOrFile = null) {
  let canonical;
  if (scope === 'contact') {
    const rawFiles = Array.isArray(filesOrFile) ? filesOrFile : [];
    canonical = {
      name: (body.name || '').trim(),
      email: (body.email || '').trim().toLowerCase(),
      message: (body.message || '').trim(),
      subject: (body.subject || '').trim(),
      files: rawFiles
        .map((f) => ({
          filename: (f.originalname || '').trim(),
          size: f.size || (f.buffer ? f.buffer.length : 0),
          sha256: crypto
            .createHash('sha256')
            .update(f.buffer || Buffer.alloc(0))
            .digest('hex'),
        }))
        .sort((a, b) => a.filename.localeCompare(b.filename)),
    };
  } else if (scope === 'feedback') {
    const file = filesOrFile && typeof filesOrFile === 'object' && !Array.isArray(filesOrFile) ? filesOrFile : null;
    canonical = {
      type: (body.type || '').trim(),
      message: (body.message || '').trim(),
      name: (body.name || '').trim(),
      email: (body.email || '').trim().toLowerCase(),
      page: (body.page || '').trim(),
      attachment: file
        ? {
            filename: (file.originalname || '').trim(),
            size: file.size || (file.buffer ? file.buffer.length : 0),
            sha256: crypto
              .createHash('sha256')
              .update(file.buffer || Buffer.alloc(0))
              .digest('hex'),
          }
        : null,
    };
  } else {
    canonical = body;
  }

  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * Attempts an atomic claim for a scoped idempotency key with owner fencing.
 * - If new: creates an in_progress record with an ownerToken and requestHash.
 * - If payload mismatch: returns mismatch error (HTTP 422).
 * - If completed: returns saved response without executing side effects.
 * - If currently in_progress within lease: returns inProgress indicator with Retry-After.
 * - If expired or failed: atomically reclaims with a new ownerToken and updated requestHash.
 *
 * Default lease is 120s (2 minutes), well beyond client and proxy HTTP timeouts.
 */
async function claimIdempotency(scope, key, requestHash = null, leaseMs = 120000) {
  if (!key) return { claimed: true, isNoop: true, ownerToken: null };

  const ownerToken = crypto.randomUUID();

  try {
    const record = await IdempotencyRecord.create({
      scope,
      key,
      ownerToken,
      requestHash,
      status: 'in_progress',
    });
    return { claimed: true, record, ownerToken };
  } catch (err) {
    if (err.code === 11000) {
      const existing = await IdempotencyRecord.findOne({ scope, key }).lean();
      if (!existing) {
        return { claimed: false, inProgress: true, retryAfterSeconds: 5 };
      }

      // Check for payload tampering / parameter mismatch
      if (existing.requestHash && requestHash && existing.requestHash !== requestHash) {
        return {
          claimed: false,
          mismatch: true,
          error: 'Idempotency key was already used with different request parameters',
        };
      }

      if (existing.status === 'completed') {
        return {
          claimed: false,
          completed: true,
          statusCode: existing.responseStatus || 200,
          body: existing.responseBody,
          resourceId: existing.resourceId,
        };
      }

      const recordDate = existing.updatedAt || existing.createdAt || new Date();
      const ageMs = Date.now() - new Date(recordDate).getTime();
      if (existing.status === 'in_progress' && ageMs < leaseMs) {
        return {
          claimed: false,
          inProgress: true,
          retryAfterSeconds: Math.max(1, Math.ceil((leaseMs - ageMs) / 1000)),
        };
      }

      // Reclaim abandoned in_progress or previously failed record
      const newOwnerToken = crypto.randomUUID();
      const updateQuery = IdempotencyRecord.findOneAndUpdate(
        {
          scope,
          key,
          $or: [
            { status: 'failed' },
            { status: 'in_progress', updatedAt: { $lt: new Date(Date.now() - leaseMs) } },
          ],
        },
        {
          $set: {
            status: 'in_progress',
            ownerToken: newOwnerToken,
            requestHash,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );
      const reclaimed = typeof updateQuery?.lean === 'function' ? await updateQuery.lean() : await updateQuery;

      if (reclaimed) {
        return { claimed: true, record: reclaimed, ownerToken: newOwnerToken };
      }

      return {
        claimed: false,
        inProgress: true,
        retryAfterSeconds: 5,
      };
    }
    throw err;
  }
}

/**
 * Marks an idempotency record as completed with owner fencing.
 * Ensures late requests cannot complete a claim that was reclaimed by another owner.
 */
async function completeIdempotency(scope, key, ownerToken, responseBody, statusCode = 201, resourceId = null) {
  if (!key || !ownerToken) return false;
  const update = await IdempotencyRecord.findOneAndUpdate(
    { scope, key, ownerToken, status: 'in_progress' },
    {
      $set: {
        status: 'completed',
        responseStatus: statusCode,
        responseBody,
        resourceId,
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
  return !!update;
}

/**
 * Marks an idempotency record as failed with owner fencing, allowing subsequent retries.
 * Ensures late requests cannot fail a claim that was reclaimed by another owner.
 */
async function failIdempotency(scope, key, ownerToken, errorMsg = '') {
  if (!key || !ownerToken) return false;
  const update = await IdempotencyRecord.findOneAndUpdate(
    { scope, key, ownerToken, status: 'in_progress' },
    {
      $set: {
        status: 'failed',
        responseBody: { error: errorMsg },
        updatedAt: new Date(),
      },
    },
    { new: true }
  );
  return !!update;
}

/**
 * Checks whether a worker is still the active owner of an in-progress idempotency claim.
 * Used as a fence before executing irreversible external side effects (e.g. email dispatch).
 * If key or ownerToken is null/undefined, returns true (unkeyed requests proceed normally).
 */
async function isClaimOwner(scope, key, ownerToken) {
  if (!key || !ownerToken) return true;
  const query = IdempotencyRecord.findOne({
    scope,
    key,
    ownerToken,
    status: 'in_progress',
  });
  const record = typeof query?.lean === 'function' ? await query.lean() : await query;
  return !!record;
}

/**
 * Compares an existing Contact document with incoming request fields.
 * 1. If doc.requestHash and incomingHash are available: compares canonical hashes.
 *    This guarantees protection against altered subjects or attachments across retries
 *    even after the IdempotencyRecord has been purged by TTL.
 * 2. Fallback policy for legacy records without a persisted requestHash:
 *    Performs field-by-field matching on stored fields (name, email, message).
 *    Note: Unstored fields on legacy records (subject, attachments) cannot be reconstructed.
 */
function matchesContactPayload(doc, body = {}, files = null, incomingHash = null) {
  if (!doc) return false;
  if (doc.requestHash && incomingHash) {
    return doc.requestHash === incomingHash;
  }
  const nameMatch = (doc.name || '').trim() === (body.name || '').trim();
  const emailMatch = (doc.email || '').trim().toLowerCase() === (body.email || '').trim().toLowerCase();
  const messageMatch = (doc.message || '').trim() === (body.message || '').trim();
  return nameMatch && emailMatch && messageMatch;
}

/**
 * Compares an existing Feedback document with incoming request fields.
 * 1. If doc.requestHash and incomingHash are available: compares canonical hashes.
 *    This guarantees protection against altered attachments or pages across retries
 *    even after the IdempotencyRecord has been purged by TTL.
 * 2. Fallback policy for legacy records without a persisted requestHash:
 *    Performs field-by-field matching on stored fields (type, message, name, email, page).
 */
function matchesFeedbackPayload(doc, body = {}, file = null, incomingHash = null) {
  if (!doc) return false;
  if (doc.requestHash && incomingHash) {
    return doc.requestHash === incomingHash;
  }
  const typeMatch = (doc.type || '').trim() === (body.type || '').trim();
  const messageMatch = (doc.message || '').trim() === (body.message || '').trim();
  const nameMatch = (doc.name || '').trim() === (body.name || '').trim();
  const emailMatch = (doc.email || '').trim().toLowerCase() === (body.email || '').trim().toLowerCase();
  const pageMatch = (doc.page || '').trim() === (body.page || '').trim();
  return typeMatch && messageMatch && nameMatch && emailMatch && pageMatch;
}

module.exports = {
  validateIdempotencyKey,
  computePayloadHash,
  claimIdempotency,
  completeIdempotency,
  failIdempotency,
  isClaimOwner,
  matchesContactPayload,
  matchesFeedbackPayload,
  KEY_REGEX,
};
