const express    = require('express');
const multer     = require('multer');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const mongoose     = require('mongoose');
const GalleryImage = require('../models/GalleryImage');
const requireAuth  = require('../middleware/auth');
const { isSafeUrl } = require('../utils/configValidation');

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

const handleImageUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

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
  } catch (err) {
    console.error('[images] GET failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// ── POST upload — admin only ─────────────────────────────────────────────────
router.post('/', requireAuth, handleImageUpload, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const { title, category, description, link, order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    if (link !== undefined && link !== null && !isSafeUrl(link, { allowEmpty: true, allowLocal: false })) {
      return res.status(400).json({ error: 'Invalid link URL. Must be a valid HTTP or HTTPS URL.' });
    }

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
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[images] POST upload failed:', err.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ── PATCH edit metadata — admin only ─────────────────────────────────────────
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const { title, category, description, link, order } = req.body;

    if (link !== undefined && link !== null && !isSafeUrl(link, { allowEmpty: true, allowLocal: false })) {
      return res.status(400).json({ error: 'Invalid link URL. Must be a valid HTTP or HTTPS URL.' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (link !== undefined) updateData.link = link;
    if (order !== undefined) updateData.order = parseInt(order);

    const updated = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Image not found' });
    res.json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    console.error('[images] PATCH update failed:', err.message);
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// ── DELETE — admin only ───────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid image ID' });
    }
    const doc = await GalleryImage.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Image not found' });

    // Delete from Cloudinary if we have a public_id
    if (doc.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      await cloudinary.uploader.destroy(doc.publicId).catch(() => {});
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[images] DELETE failed:', err.message);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
