/**
 * Shared email delivery utility.
 * Tries Resend first (preferred), falls back to SMTP (nodemailer/Gmail).
 * Neither provider being configured is a non-fatal condition — the error
 * is logged and the caller continues normally.
 */

const nodemailer = require('nodemailer');

const RESEND_API_URL = 'https://api.resend.com/emails';

// ── Resend ────────────────────────────────────────────────────────────────────

/**
 * @param {{ to?: string, subject: string, html: string, attachments?: Array<{filename:string,content:Buffer|string}> }} opts
 * @returns {Promise<boolean>} true if sent, false if not configured
 */
async function sendViaResend({ to, subject, html, attachments = [] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = to || process.env.EMAIL_TO || process.env.EMAIL_USER;
  if (!apiKey || !recipient) return false;

  const from = process.env.RESEND_FROM || 'onboarding@resend.dev';

  const payload = {
    from,
    to: [recipient],
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : a.content,
    })),
  };

  const resp = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Resend error (${resp.status}): ${text}`);
  }

  return true;
}

// ── SMTP (nodemailer) ─────────────────────────────────────────────────────────

/**
 * @param {{ replyTo?: string, subject: string, html: string, attachments?: Array }} opts
 * @returns {Promise<boolean>}
 */
async function sendViaSmtp({ replyTo, subject, html, attachments = [] }) {
  const { EMAIL_USER, EMAIL_PASS, EMAIL_HOST, EMAIL_PORT, EMAIL_TO } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) return false;

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(EMAIL_PORT, 10) || 465,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: `"Portfolio" <${EMAIL_USER}>`,
    to: EMAIL_TO || EMAIL_USER,
    replyTo,
    subject,
    html,
    attachments,
  });

  return true;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Attempt delivery via Resend, then SMTP. Logs but never throws.
 *
 * @param {{ subject: string, html: string, replyTo?: string, attachments?: Array }} opts
 */
async function sendEmail({ subject, html, replyTo, attachments = [] }) {
  try {
    const sent = await sendViaResend({ subject, html, attachments });
    if (sent) return;
  } catch (err) {
    console.error('[email] Resend failed:', err.message);
  }

  try {
    const sent = await sendViaSmtp({ replyTo, subject, html, attachments });
    if (sent) return;
  } catch (err) {
    console.error('[email] SMTP failed:', err.message);
  }

  console.error('[email] No provider delivered the message — check EMAIL_* / RESEND_API_KEY env vars.');
}

module.exports = { sendEmail };
