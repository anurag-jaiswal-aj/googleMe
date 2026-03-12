const express = require('express');
const router = express.Router();
const Project = require('../models/Project');

// GET /api/projects — list all projects
router.get('/', async (req, res, next) => {
  try {
    const projects = await Project.find().sort({ order: 1, createdAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/featured — featured projects only
router.get('/featured', async (req, res, next) => {
  try {
    const projects = await Project.find({ featured: true }).sort({ order: 1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects — create (admin/seeding)
router.post('/', async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

module.exports = router;
