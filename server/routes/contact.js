const express = require('express');
const router = express.Router();
const path = require('path');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const Contact = require('../models/Contact');
const { sendEmail } = require('../utils/emailService');
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
  matchesContactPayload,
} = require('../utils/idempotency');

// Accept up to 3 attachments, max 5 MB each, stored in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    const safeName = sanitizeAttachmentFilename(file.originalname || '');
    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('File type not allowed. Supported formats: images (PNG, JPG, GIF, WebP), PDF, TXT, LOG.'));
    }
    const allowedMimes = ALLOWED_MIME_TYPES[ext] || [];
    if (!allowedMimes.includes((file.mimetype || '').toLowerCase())) {
      return cb(new Error('File MIME type does not match allowed types.'));
    }
    cb(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.array('attachments', 3)(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err) return res.status(400).json({ error: err.message });
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const contentCheck = validateAttachmentBuffer(file);
        if (!contentCheck.valid) {
          return res.status(400).json({ error: contentCheck.error });
        }
      }
    }
    next();
  });
};

const escapeHtml = (str = '') =>
  String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }[m]));

const validation = [
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters').escape(),
  body('email').trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters').escape(),
  body('subject').optional().trim().isLength({ max: 100 }).escape(),
  body('_hp').optional().trim(),
];

const buildHtml = ({ name, email, message, subject, attachments }) => `
  <h2>New Contact Form Submission</h2>
  ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
  <p><strong>Message:</strong></p>
  <p>${message.replace(/\n/g, '<br/>')}</p>
  ${attachments.length > 0 ? `<p><strong>Attachments:</strong> ${attachments.map((a) => escapeHtml(a.filename)).join(', ')}</p>` : ''}
  <hr/>
  <small>Sent from portfolio contact form</small>
`;

// POST /api/contact
router.post('/', handleUpload, validation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Bot honeypot: silently discard automated spam
  if (req.body._hp) {
    return res.status(201).json({
      success: true,
      message: "Your message has been received! I'll get back to you soon.",
    });
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
    requestHash = computePayloadHash('contact', req.body, req.files);
    claim = await claimIdempotency('contact', idempotencyKey, requestHash);
    if (!claim.claimed) {
      if (claim.mismatch) {
        return res.status(422).json({ error: claim.error });
      }
      if (claim.completed) {
        return res.status(claim.statusCode || 200).json({ ...claim.body, deduplicated: true });
      }
      if (claim.inProgress) {
        return res.status(409).set('Retry-After', String(claim.retryAfterSeconds || 2)).json({
          error: 'A submission with this idempotency key is currently being processed. Please wait.',
        });
      }
    }

    // Database pre-check: recover if Contact already exists for this idempotency key
    // (e.g. lease expired after Contact was created but completeIdempotency failed)
    const existingContact = await Contact.findOne({ idempotencyKey });
    if (existingContact) {
      if (!matchesContactPayload(existingContact, req.body, req.files, requestHash)) {
        return res.status(422).json({
          error: 'Idempotency key was already used with different request parameters',
        });
      }
      const responseData = {
        success: true,
        message: "Your message has been received! I'll get back to you soon.",
        id: existingContact._id,
      };
      if (claim?.ownerToken) {
        await completeIdempotency('contact', idempotencyKey, claim.ownerToken, responseData, 201, existingContact._id).catch(
          (compErr) => console.error('[contact] completeIdempotency recovery error:', compErr.message)
        );
      }
      return res.status(201).json({ ...responseData, deduplicated: true });
    }
  }

  const { name, email, message, subject } = req.body;
  const attachments = (req.files || []).map((f) => ({
    filename: sanitizeAttachmentFilename(f.originalname || ''),
    content: f.buffer,
    contentType: f.mimetype,
  }));

  let contact = null;
  try {
    contact = await Contact.create({
      name,
      email,
      message,
      ...(idempotencyKey ? { idempotencyKey, requestHash } : {}),
    });

    const subjectLine = subject
      ? `[${subject}] New Portfolio Message from ${name}`
      : `New Portfolio Message from ${name}`;

    // Verify claim ownership as late as practical before dispatching email to prevent stale worker notifications
    let canSendEmail = true;
    if (idempotencyKey && claim?.ownerToken) {
      canSendEmail = await isClaimOwner('contact', idempotencyKey, claim.ownerToken);
      if (!canSendEmail) {
        console.warn('[contact] Worker lost idempotency lease before email dispatch; suppressing email notification.');
      }
    }

    if (canSendEmail) {
      sendEmail({
        subject: subjectLine,
        html: buildHtml({ name, email, message, subject, attachments }),
        replyTo: email,
        attachments,
      }).catch((err) => console.error('[contact] Email send failed:', err.message));
    }

    const responseData = {
      success: true,
      message: "Your message has been received! I'll get back to you soon.",
      id: contact._id,
    };

    if (idempotencyKey && claim?.ownerToken) {
      await completeIdempotency('contact', idempotencyKey, claim.ownerToken, responseData, 201, contact._id).catch(
        (compErr) => console.error('[contact] completeIdempotency error:', compErr.message)
      );
    }

    res.status(201).json(responseData);
  } catch (err) {
    const isDuplicateKey = err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000);
    if (isDuplicateKey && idempotencyKey) {
      const existingContact = await Contact.findOne({ idempotencyKey });
      if (existingContact) {
        if (!matchesContactPayload(existingContact, req.body, req.files, requestHash)) {
          return res.status(422).json({
            error: 'Idempotency key was already used with different request parameters',
          });
        }
        const responseData = {
          success: true,
          message: "Your message has been received! I'll get back to you soon.",
          id: existingContact._id,
        };
        if (claim?.ownerToken) {
          await completeIdempotency('contact', idempotencyKey, claim.ownerToken, responseData, 201, existingContact._id).catch(
            (compErr) => console.error('[contact] completeIdempotency race recovery error:', compErr.message)
          );
        }
        return res.status(201).json({ ...responseData, deduplicated: true });
      }
    }

    // Only fail the claim if contact was not persisted to prevent duplicate creation on retry
    if (idempotencyKey && claim?.ownerToken && !contact) {
      await failIdempotency('contact', idempotencyKey, claim.ownerToken, err.message).catch(() => {});
    }
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.sanitizeAttachmentFilename = sanitizeAttachmentFilename;
router.validateAttachmentBuffer = validateAttachmentBuffer;

module.exports = router;
