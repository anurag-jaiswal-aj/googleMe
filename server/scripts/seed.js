/**
 * Seed script — run once to populate MongoDB with sample projects.
 * Usage: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('./models/Project');
const sharedProjects = require('../shared/projects.json');

const sampleProjects = sharedProjects.map(({ _id, ...project }) => project);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gfolio');
    console.log('Connected to MongoDB');

    await Project.deleteMany({});
    const inserted = await Project.insertMany(sampleProjects);
    console.log(`Seeded ${inserted.length} projects`);

    await mongoose.disconnect();
    console.log('Done');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
