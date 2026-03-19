const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const multer = require('multer');
const Feedback = require('../models/Feedback');

const RESEND_API_URL = 'https://api.resend.com/emails';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const handleUpload = (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    if (err) return next(err);
    next();
  });
};

const VALID_TYPES = ['bug', 'feature', 'suggestion', 'typo', 'compliment', 'other'];

const feedbackValidation = [
  body('type').trim().isIn(VALID_TYPES).withMessage('Invalid feedback type'),
  body('message').trim().notEmpty().withMessage('Message is required')
    .isLength({ max: 2000 }).withMessage('Message cannot exceed 2000 characters').escape(),
  body('name').optional().trim().isLength({ max: 100 }).escape(),
  body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('page').optional().trim().isLength({ max: 200 }).escape(),
];

const buildHtml = ({ type, message, name, email, page, hasAttachment }) => `
  <h2 style="color:#1a73e8">New Portfolio Feedback</h2>
  <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
    <tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Type</td><td>${type}</td></tr>
    ${name  ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Name</td><td>${name}</td></tr>` : ''}
    ${email ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>` : ''}
    ${page  ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Page</td><td><code>${page}</code></td></tr>` : ''}
    ${hasAttachment ? `<tr><td style="padding:4px 12px 4px 0;color:#5f6368;font-weight:600">Attachment</td><td>See attached file</td></tr>` : ''}
  </table>
  <p style="margin-top:16px;font-family:sans-serif;font-size:14px;color:#5f6368;font-weight:600">Message</p>
  <p style="font-family:sans-serif;font-size:14px">${message.replace(/\n/g, '<br/>')}</p>
  <hr/>
  <small style="color:#9aa0a6">Sent from portfolio feedback form</small>
`;

const sendViaResend = async ({ subject, html, attachment }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
  if (!apiKey || !to) return false;

  const from = process.env.RESEND_FROM || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const body = { from, to: [to], subject, html };
  if (attachment) {
    body.attachments = [{ filename: attachment.originalname, content: attachment.buffer.toString('base64') }];
  }

  const resp = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend failed (${resp.status}): ${text}`);
  }
  return true;
};

const sendViaSmtp = async ({ subject, html, attachment }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT, 10) || 465,
    secure: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const mailOptions = {
    from: `"Portfolio Feedback" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    subject,
    html,
  };
  if (attachment) {
    mailOptions.attachments = [{ filename: attachment.originalname, content: attachment.buffer }];
  }

  await transporter.sendMail(mailOptions);
  return true;
};

const sendFeedbackEmail = async ({ type, message, name, email, page, attachment }) => {
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  const subject = name
    ? `[Portfolio Feedback] ${label} from ${name}`
    : `[Portfolio Feedback] ${label}`;
  const html = buildHtml({ type, message, name, email, page, hasAttachment: !!attachment });

  try {
    const sent = await sendViaResend({ subject, html, attachment });
    if (sent) return;
  } catch (err) {
    console.error('Resend feedback failed:', err.message);
  }

  try {
    const sent = await sendViaSmtp({ subject, html, attachment });
    if (sent) return;
  } catch (err) {
    console.error('SMTP feedback failed:', err.message);
  }

  console.error('Feedback email not sent: no valid email provider configured.');
};

// POST /api/feedback
router.post('/', handleUpload, feedbackValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { type, message, name = '', email = '', page = '' } = req.body;
  const attachment = req.file || null;

  try {
    await Feedback.create({ type, message, name, email, page });
    sendFeedbackEmail({ type, message, name, email, page, attachment }).catch((err) => {
      console.error('Feedback email send failed:', err.message);
    });
    res.status(201).json({ success: true, message: 'Feedback received. Thank you!' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
