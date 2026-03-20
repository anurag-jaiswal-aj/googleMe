const express    = require('express');
const multer     = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const GalleryImage = require('../models/GalleryImage');
const requireAuth  = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer — keep file in memory, we stream it to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

// Helper: stream buffer → Cloudinary, returns { secure_url, public_id }
function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'gfolio', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// ── GET all — public ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const images = await GalleryImage.find().sort({ order: 1, createdAt: -1 }).select('-__v');
    res.json(images);
  } catch {
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// ── POST upload — admin only ─────────────────────────────────────────────────
router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const { title, category, description, link, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    let imageUrl = '';
    let publicId = '';

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file.buffer, {
        // Auto-convert to WebP, limit to 1200px wide
        transformation: [{ width: 1200, crop: 'limit', fetch_format: 'auto', quality: 'auto' }],
      });
      imageUrl = result.secure_url;
      publicId = result.public_id;
    } else {
      // Fallback: store as base64 (dev / no Cloudinary configured)
      imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const image = await GalleryImage.create({
      title,
      category:    category    || 'Other',
      description: description || '',
      link:        link        || '',
      order:       order ? parseInt(order) : 0,
      imageUrl,
      publicId,
      // keep imageData empty for new uploads
    });

    res.status(201).json(image);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to upload image' });
  }
});

// ── PATCH edit metadata — admin only ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { title, category, description, link, order } = req.body;
    const updated = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      { title, category, description, link, ...(order !== undefined && { order: parseInt(order) }) },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Image not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update image' });
  }
});

// ── DELETE — admin only ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await GalleryImage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Image not found' });

    // Delete from Cloudinary if we have a public_id
    if (doc.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(doc.publicId).catch(() => {});
    }

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
