const express = require('express');
const multer = require('multer');
const GalleryImage = require('../models/GalleryImage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// GET all
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ order: 1, createdAt: -1 }).select('-__v');
    res.json(images);
  } catch { res.status(500).json({ error: 'Failed to fetch images' }); }
});

// POST upload
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const { title, category, description, link, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const image = await GalleryImage.create({
      title, category: category || 'Other', description: description || '',
      link: link || '', imageData: base64, order: order ? parseInt(order) : 0,
    });
    res.status(201).json(image);
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to upload image' }); }
});

// PATCH edit metadata (no image replacement)
router.patch('/:id', async (req, res) => {
  try {
    const { title, category, description, link } = req.body;
    const updated = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      { title, category, description, link },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Image not found' });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message || 'Failed to update image' }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await GalleryImage.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Image not found' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to delete image' }); }
});

module.exports = router;
