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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
