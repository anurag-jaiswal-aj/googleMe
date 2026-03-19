const mongoose = require('mongoose');

const repoEntrySchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    featured:  { type: Boolean, default: false },
    extraTags: { type: [String], default: [] },
  },
  { _id: false }
);

// Stores the list of GitHub repos selected to show on the portfolio
const portfolioConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'github_selection', unique: true },
    // Each entry: { name: 'repo-name', featured: true/false }
    selectedRepos: { type: [repoEntrySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PortfolioConfig', portfolioConfigSchema);
