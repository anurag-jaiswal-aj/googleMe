const mongoose = require('mongoose');

const galleryImageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    category: {
      type: String,
      enum: ['Projects', 'Certificates', 'UI Work', 'Other'],
      default: 'Other',
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    link: { type: String, trim: true, default: '' },
    imageData: { type: String, required: true }, // base64 data URL
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
