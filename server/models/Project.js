const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    techStack: {
      type: [String],
      default: [],
    },
    repoUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
    },
    demoUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);
