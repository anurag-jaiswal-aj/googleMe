const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const streamifier = require('streamifier');
const Feedback = require('../models/Feedback');
const { sendEmail } = require('../utils/emailService');
const requireAuth = require('../middleware/auth');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'gfolio/feedback', resource_type: 'auto', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/\.(exe|bat|cmd|sh|php|pl|cgi|vbs|js|jar|py|msi|dll|scr)$/i.test(file.originalname || '')) {
      return cb(new Error('File type not allowed for security reasons.'));
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

const VALID_TYPES = ['bug', 'feature', 'suggestion', 'typo', 'compliment', 'other'];
const VALID_STATUSES = ['new', 'in-progress', 'resolved'];

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }[m]));

const normalizePage = (page) => {
  if (!page || typeof page !== 'string') return '';
  return page
    .replace(/&#x2f;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"');
};

const validation = [
  body('type').trim().isIn(VALID_TYPES).withMessage('Invalid feedback type'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters').escape(),
  body('name').optional().trim().isLength({ max: 100 }).escape(),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('page')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Page context cannot exceed 200 characters')
    .custom((val) => {
      if (!val) return true;
      if (/[\x00-\x1F\x7F]/.test(val)) {
        throw new Error('Invalid control characters in page context');
      }
      if (/^\s*(javascript|data|vbscript|file):/i.test(val)) {
        throw new Error('Dangerous URL scheme in page context');
      }
      return true;
    }),
  body('_hp').optional().trim(),
];

const buildHtml = ({ type, message, name, email, page, hasAttachment }) => `
  <h2 style="color:#1a73e8">New Portfolio Feedback</h2>
  <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
    <tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Type</td><td>${type}</td></tr>
    ${name  ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Name</td><td>${name}</td></tr>` : ''}
    ${email ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>` : ''}
    ${page  ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Page</td><td><code>${escapeHtml(page)}</code></td></tr>` : ''}
    ${hasAttachment ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Attachment</td><td>See attached file</td></tr>` : ''}
  </table>
  <p style="margin-top:16px;font-family:sans-serif;font-size:14px;color:#5f6368;font-weight:600">Message</p>
  <p style="font-family:sans-serif;font-size:14px">${message.replace(/\n/g, '<br/>')}</p>
  <hr/>
  <small style="color:#9aa0a6">Sent from portfolio feedback form</small>
`;

// ── GET /api/feedback (Admin Only) ──────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const { status, type, search } = req.query;
    const query = {};

    // Validate and apply status filter
    if (status && status !== 'all') {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      if (status === 'new') {
        // Backward-compatible for legacy records without status field
        query.$or = [
          { status: 'new' },
          { status: { $exists: false } },
          { status: null },
        ];
      } else {
        query.status = status;
      }
    }

    // Validate and apply category / type filter
    if (type && type !== 'all') {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type filter' });
      }
      query.type = type;
    }

    // Sanitize and escape search query
    if (typeof search === 'string' && search.trim()) {
      const sanitized = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(sanitized, 'i');
      // Match page context against both clean and legacy encoded paths
      const pageSearchPattern = sanitized.replace(/\//g, '(?:/|&#x2[fF];|&#47;)');
      const pageRegex = new RegExp(pageSearchPattern, 'i');
      const searchConditions = [
        { message: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { page: pageRegex },
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions },
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const [total, items, newCount, inProgressCount, resolvedCount] = await Promise.all([
      Feedback.countDocuments(query),
      Feedback.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments({
        $or: [
          { status: 'new' },
          { status: { $exists: false } },
          { status: null },
        ],
      }),
      Feedback.countDocuments({ status: 'in-progress' }),
      Feedback.countDocuments({ status: 'resolved' }),
    ]);

    const normalized = items.map((item) => ({
      ...item,
      status: item.status || 'new',
      page: normalizePage(item.page),
    }));

    res.json({
      feedback: normalized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      counts: {
        all: newCount + inProgressCount + resolvedCount,
        new: newCount,
        'in-progress': inProgressCount,
        resolved: resolvedCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/feedback/:id/status (Admin Only) ─────────────
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid feedback ID' });
    }

    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: new, in-progress, resolved',
      });
    }

    // Explicitly update ONLY the status field to prevent arbitrary field mutations
    const updated = await Feedback.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }

    res.json({
      success: true,
      feedback: {
        ...updated,
        status: updated.status || 'new',
        page: normalizePage(updated.page),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/feedback (Public submission) ──────────────────
router.post('/', handleUpload, validation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Bot honeypot: silently discard automated spam
  if (req.body._hp) {
    return res.status(201).json({ success: true, message: 'Feedback received. Thank you!' });
  }

  const { type, message, name = '', email = '', page = '' } = req.body;
  const file = req.file || null;

  try {
    let attachmentData = undefined;
    if (file) {
      attachmentData = {
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        url: '',
      };

      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const result = await uploadToCloudinary(file.buffer);
          if (result && result.secure_url) {
            attachmentData.url = result.secure_url;
          }
        } catch (uploadErr) {
          console.error('[feedback] Attachment Cloudinary upload failed:', uploadErr.message);
        }
      }
    }

    await Feedback.create({
      type,
      message,
      name,
      email,
      page,
      status: 'new',
      ...(attachmentData ? { attachment: attachmentData } : {}),
    });

    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const subject = name
      ? `[Portfolio Feedback] ${label} from ${name}`
      : `[Portfolio Feedback] ${label}`;

    sendEmail({
      subject,
      html: buildHtml({ type, message, name, email, page, hasAttachment: !!file }),
      replyTo: email || undefined,
      attachments: file
        ? [{ filename: file.originalname, content: file.buffer }]
        : [],
    }).catch((err) => console.error('[feedback] Email send failed:', err.message));

    res.status(201).json({ success: true, message: 'Feedback received. Thank you!' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
