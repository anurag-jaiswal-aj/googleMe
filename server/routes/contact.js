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

  const { name, email, message, subject } = req.body;
  const attachments = (req.files || []).map((f) => ({
    filename: sanitizeAttachmentFilename(f.originalname || ''),
    content: f.buffer,
    contentType: f.mimetype,
  }));

  try {
    const contact = await Contact.create({ name, email, message });

    const subjectLine = subject
      ? `[${subject}] New Portfolio Message from ${name}`
      : `New Portfolio Message from ${name}`;

    // Fire-and-forget: never block the response on email delivery
    sendEmail({
      subject: subjectLine,
      html: buildHtml({ name, email, message, subject, attachments }),
      replyTo: email,
      attachments,
    }).catch((err) => console.error('[contact] Email send failed:', err.message));

    res.status(201).json({
      success: true,
      message: "Your message has been received! I'll get back to you soon.",
      id: contact._id,
    });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.sanitizeAttachmentFilename = sanitizeAttachmentFilename;
router.validateAttachmentBuffer = validateAttachmentBuffer;

module.exports = router;
