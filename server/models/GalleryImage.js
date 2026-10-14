const mongoose = require('mongoose');
const { isSafeUrl } = require('../utils/configValidation');

const galleryImageSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: 150 },
    category: {
      type: String,
      enum: ['Projects', 'Certificates', 'UI Work', 'Other'],
      default: 'Other',
    },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    link: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (v) => isSafeUrl(v, { allowEmpty: true, allowLocal: false }),
        message: 'Link must be a valid HTTP or HTTPS URL or empty',
      },
    },
    order:       { type: Number, default: 0 },

    // Cloudinary fields (new)
    imageUrl:    { type: String, default: '' }, // CDN URL
    publicId:    { type: String, default: '' }, // for deletion

    // Legacy base64 — kept so existing images still render during migration
    imageData:   { type: String, default: '' },
  },
  { timestamps: true }
);

// Virtual: always return the best available URL
galleryImageSchema.virtual('src').get(function () {
  return this.imageUrl || this.imageData || '';
});

galleryImageSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('GalleryImage', galleryImageSchema);
