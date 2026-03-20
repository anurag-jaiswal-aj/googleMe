const mongoose = require('mongoose');

// Generic key/value config store for all site-wide settings
const siteConfigSchema = new mongoose.Schema(
  {
    key:   { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SiteConfig', siteConfigSchema);
