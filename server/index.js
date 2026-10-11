require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Fail fast if critical secrets are missing
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_PASSWORD_HASH'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[startup] Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const projectRoutes  = require('./routes/projects');
const contactRoutes  = require('./routes/contact');
const mediumRoutes   = require('./routes/medium');
const feedbackRoutes = require('./routes/feedback');
const githubRoutes   = require('./routes/github');
const imagesRoutes   = require('./routes/images');
const configRoutes   = require('./routes/config');
const adminAuthRoutes = require('./routes/adminAuth');

const app = express();

// Render runs behind a proxy/CDN. This allows correct client IP detection.
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://anuragjaiswal.me',
  'https://www.anuragjaiswal.me',
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));
const vercelPreviewRegex = /^https:\/\/(?:googleme-aj|googleme|google-me|gfolio)(?:-[a-z0-9-]+)?\.vercel\.app$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // Exact match
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Allow project-specific Vercel preview URLs
      if (vercelPreviewRegex.test(origin)) return callback(null, true);
      // Disallow origin cleanly without triggering 500 error handler
      callback(null, false);
    },
    credentials: true,
  })
);

// Rate limiting — general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Stricter rate limit for admin login to slow brute-force attempts
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' },
  skipSuccessfulRequests: true,
});
app.use('/api/admin/login', adminLimiter);

// Dedicated rate limit for contact and feedback submissions to prevent spam & quota abuse
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { error: 'Too many submissions, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
});
app.use('/api/contact', submissionLimiter);
app.use('/api/feedback', submissionLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/admin', adminAuthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/medium', mediumRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/images', imagesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gfolio';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
