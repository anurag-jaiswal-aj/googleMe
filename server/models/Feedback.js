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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
