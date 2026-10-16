const express = require('express');
const router = express.Router();
const path = require('path');
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

const {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  sanitizeAttachmentFilename,
  validateAttachmentBuffer,
} = require('../utils/attachmentValidation');
const {
  validateIdempotencyKey,
  computePayloadHash,
  claimIdempotency,
  completeIdempotency,
  failIdempotency,
  isClaimOwner,
  matchesFeedbackPayload,
} = require('../utils/idempotency');


const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const safeName = sanitizeAttachmentFilename(file.originalname || '');
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('File extension not allowed. Supported formats: images (PNG, JPG, GIF, WebP), PDF, TXT, LOG.'));
    }
    const allowedMimes = ALLOWED_MIME_TYPES[ext] || [];
    if (!allowedMimes.includes((file.mimetype || '').toLowerCase())) {
      return cb(new Error('File MIME type does not match allowed types.'));
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err) return res.status(400).json({ error: err.message });
    if (req.file) {
      const contentCheck = validateAttachmentBuffer(req.file);
      if (!contentCheck.valid) {
        return res.status(400).json({ error: contentCheck.error });
      }
    }
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

// ── DELETE /api/feedback/:id (Admin Only) ───────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid feedback ID' });
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback record not found' });
    }

    // Explicitly delete only this record by its validated ObjectId
    await Feedback.findByIdAndDelete(id);

    const attachmentCleanup = {
      attempted: false,
      cleaned: false,
    };

    // Safe Cloudinary attachment cleanup: only delete assets strictly within gfolio/feedback/
    if (feedback.attachment?.publicId) {
      if (feedback.attachment.publicId.startsWith('gfolio/feedback/')) {
        if (process.env.CLOUDINARY_CLOUD_NAME) {
          attachmentCleanup.attempted = true;
          try {
            const destroyOpts = {};
            if (feedback.attachment.resourceType) {
              destroyOpts.resource_type = feedback.attachment.resourceType;
            }
            const result = await cloudinary.uploader.destroy(feedback.attachment.publicId, destroyOpts);
            if (result && (result.result === 'ok' || result.result === 'not found')) {
              attachmentCleanup.cleaned = true;
            } else {
              attachmentCleanup.cleaned = false;
              attachmentCleanup.warning = `Cloudinary returned ${result?.result || 'unknown status'}`;
            }
          } catch (cloudErr) {
            console.error('[feedback] Attachment Cloudinary deletion failed:', cloudErr.message);
            attachmentCleanup.cleaned = false;
            attachmentCleanup.warning = 'Failed to delete attachment from Cloudinary';
          }
        } else {
          attachmentCleanup.note = 'Cloudinary not configured on server';
        }
      } else {
        attachmentCleanup.note = 'Attachment cleanup skipped: public ID outside feedback folder';
      }
    } else if (feedback.attachment?.url) {
      attachmentCleanup.note = 'Attachment cleanup skipped: legacy record lacks trusted Cloudinary identifier';
    }

    res.json({
      success: true,
      message: 'Feedback deleted successfully',
      id,
      attachmentCleanup,
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

  // Idempotency validation & atomic claim
  const rawIdempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
  const keyValidation = validateIdempotencyKey(rawIdempotencyKey);
  if (!keyValidation.valid) {
    return res.status(400).json({ error: keyValidation.error });
  }
  const idempotencyKey = keyValidation.key;

  let claim = null;
  let requestHash = null;
  if (idempotencyKey) {
    requestHash = computePayloadHash('feedback', req.body, req.file);
    claim = await claimIdempotency('feedback', idempotencyKey, requestHash);
    if (!claim.claimed) {
      if (claim.mismatch) {
        return res.status(422).json({ error: claim.error });
      }
      if (claim.completed) {
        return res.status(claim.statusCode || 200).json({ ...claim.body, deduplicated: true });
      }
      if (claim.inProgress) {
        return res.status(409).set('Retry-After', String(claim.retryAfterSeconds || 2)).json({
          error: 'A feedback submission with this idempotency key is currently being processed. Please wait.',
        });
      }
    }

    // Database pre-check: recover if Feedback already exists for this idempotency key
    // Completely avoids redundant Cloudinary uploads and duplicate emails
    const existingFeedback = await Feedback.findOne({ idempotencyKey });
    if (existingFeedback) {
      if (!matchesFeedbackPayload(existingFeedback, req.body, req.file, requestHash)) {
        return res.status(422).json({
          error: 'Idempotency key was already used with different request parameters',
        });
      }
      const responsePayload = { success: true, message: 'Feedback received. Thank you!' };
      if (claim?.ownerToken) {
        await completeIdempotency('feedback', idempotencyKey, claim.ownerToken, responsePayload, 201, existingFeedback._id).catch(
          (compErr) => console.error('[feedback] completeIdempotency recovery error:', compErr.message)
        );
      }
      return res.status(201).json({ ...responsePayload, deduplicated: true });
    }
  }

  const { type, message, name = '', email = '', page = '' } = req.body;
  const file = req.file || null;

  let uploadedAttachment = null;
  let feedback = null;
  try {
    let attachmentData = undefined;
    if (file) {
      const safeFilename = sanitizeAttachmentFilename(file.originalname || '');
      attachmentData = {
        filename: safeFilename,
        contentType: file.mimetype,
        size: file.size,
        url: '',
      };

      if (process.env.CLOUDINARY_CLOUD_NAME) {
        try {
          const result = await uploadToCloudinary(file.buffer);
          if (result && result.secure_url) {
            attachmentData.url = result.secure_url;
            attachmentData.publicId = result.public_id || '';
            attachmentData.resourceType = result.resource_type || '';
            uploadedAttachment = attachmentData;
          }
        } catch (uploadErr) {
          console.error('[feedback] Attachment Cloudinary upload failed:', uploadErr.message);
        }
      }
    }

    feedback = await Feedback.create({
      type,
      message,
      name,
      email,
      page,
      status: 'new',
      ...(attachmentData ? { attachment: attachmentData } : {}),
      ...(idempotencyKey ? { idempotencyKey, requestHash } : {}),
    });

    const label = type.charAt(0).toUpperCase() + type.slice(1);
    const subject = name
      ? `[Portfolio Feedback] ${label} from ${name}`
      : `[Portfolio Feedback] ${label}`;

    // Verify claim ownership as late as practical before dispatching email to prevent stale worker notifications
    let canSendEmail = true;
    if (idempotencyKey && claim?.ownerToken) {
      canSendEmail = await isClaimOwner('feedback', idempotencyKey, claim.ownerToken);
      if (!canSendEmail) {
        console.warn('[feedback] Worker lost idempotency lease before email dispatch; suppressing email notification.');
      }
    }

    if (canSendEmail) {
      sendEmail({
        subject,
        html: buildHtml({ type, message, name, email, page, hasAttachment: !!file }),
        replyTo: email || undefined,
        attachments: file
          ? [{ filename: attachmentData?.filename || sanitizeAttachmentFilename(file.originalname || ''), content: file.buffer }]
          : [],
      }).catch((err) => console.error('[feedback] Email send failed:', err.message));
    }

    const responsePayload = { success: true, message: 'Feedback received. Thank you!' };

    if (idempotencyKey && claim?.ownerToken) {
      await completeIdempotency('feedback', idempotencyKey, claim.ownerToken, responsePayload, 201, feedback._id).catch(
        (compErr) => console.error('[feedback] completeIdempotency error:', compErr.message)
      );
    }

    res.status(201).json(responsePayload);
  } catch (err) {
    const isDuplicateKey = err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000);

    // If Cloudinary upload succeeded for THIS attempt but Feedback persistence was aborted, clean up the orphaned asset
    if (uploadedAttachment?.publicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const destroyOpts = {};
        if (uploadedAttachment.resourceType) destroyOpts.resource_type = uploadedAttachment.resourceType;
        await cloudinary.uploader.destroy(uploadedAttachment.publicId, destroyOpts);
      } catch (cleanupErr) {
        console.error('[feedback] Failed to clean up orphaned attachment:', cleanupErr.message, {
          publicId: uploadedAttachment.publicId,
        });
      }
    }

    if (isDuplicateKey && idempotencyKey) {
      const existingFeedback = await Feedback.findOne({ idempotencyKey });
      if (existingFeedback) {
        if (!matchesFeedbackPayload(existingFeedback, req.body, req.file, requestHash)) {
          return res.status(422).json({
            error: 'Idempotency key was already used with different request parameters',
          });
        }
        const responsePayload = { success: true, message: 'Feedback received. Thank you!' };
        if (claim?.ownerToken) {
          await completeIdempotency('feedback', idempotencyKey, claim.ownerToken, responsePayload, 201, existingFeedback._id).catch(
            (compErr) => console.error('[feedback] completeIdempotency race recovery error:', compErr.message)
          );
        }
        return res.status(201).json({ ...responsePayload, deduplicated: true });
      }
    }

    // Only fail the claim if feedback document was not persisted to prevent duplicate records on retry
    if (idempotencyKey && claim?.ownerToken && !feedback) {
      await failIdempotency('feedback', idempotencyKey, claim.ownerToken, err.message).catch(() => {});
    }
    next(err);
  }
});

router.sanitizeAttachmentFilename = sanitizeAttachmentFilename;

module.exports = router;
