const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['bug', 'feature', 'suggestion', 'typo', 'compliment', 'other'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    name:  { type: String, maxlength: 100, default: '' },
    email: { type: String, maxlength: 200, default: '' },
    page:  { type: String, maxlength: 200, default: '' },
    status: {
      type: String,
      enum: ['new', 'in-progress', 'resolved'],
      default: 'new',
      index: true,
    },
    attachment: {
      filename:     { type: String, default: '' },
      contentType:  { type: String, default: '' },
      size:         { type: Number, default: 0 },
      url:          { type: String, default: '' },
      publicId:     { type: String, default: '' },
      resourceType: { type: String, default: '' },
    },
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    requestHash: {
      type: String,
      maxlength: 64,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound / partial unique index ensures strict uniqueness when an idempotency key is present.
// Legacy records and requests that omit an idempotency key (undefined/null) are excluded from the index.
feedbackSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: 'string' },
    },
  }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
