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
const { corsOptions } = require('./utils/corsConfig');
app.use(cors(corsOptions));

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

// Body parsing: 1 MB limit for admin configuration, 50 KB for ordinary JSON endpoints
app.use('/api/config', express.json({ limit: '1mb' }));
app.use(express.json({ limit: '50kb' }));

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
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({ error: 'Payload too large' });
  }
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gfolio';

let isListening = false;

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    const Contact = require('./models/Contact');
    const Feedback = require('./models/Feedback');
    const IdempotencyRecord = require('./models/IdempotencyRecord');
    try {
      await Promise.all([
        Contact.init(),
        Feedback.init(),
        IdempotencyRecord.init(),
      ]);
    } catch (idxErr) {
      console.error('Fatal: Failed to initialize database indexes:', idxErr.message);
      process.exit(1);
    }

    if (!isListening) {
      isListening = true;
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
