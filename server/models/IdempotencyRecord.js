const mongoose = require('mongoose');

const idempotencyRecordSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      enum: ['contact', 'feedback'],
    },
    key: {
      type: String,
      required: true,
      maxlength: 128,
    },
    ownerToken: {
      type: String,
      required: true,
      maxlength: 64,
    },
    requestHash: {
      type: String,
      default: null,
      maxlength: 64,
    },
    status: {
      type: String,
      required: true,
      enum: ['in_progress', 'completed', 'failed'],
      default: 'in_progress',
    },
    responseStatus: {
      type: Number,
      default: 201,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    resourceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound unique index ensures atomic reservation per scope + key
idempotencyRecordSchema.index({ scope: 1, key: 1 }, { unique: true });

// TTL index to automatically purge records 24 hours after last activity.
// Indexing updatedAt ensures that active or reclaimed records are not purged
// based on their initial creation timestamp.
idempotencyRecordSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('IdempotencyRecord', idempotencyRecordSchema);
