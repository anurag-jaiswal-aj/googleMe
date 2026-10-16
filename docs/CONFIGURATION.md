# Environment Configuration & Local Setup

This document provides a comprehensive reference for all configuration variables used across **googleMe**, along with complete instructions for setting up a local development environment.

For deployment environment settings, see [Deployment](DEPLOYMENT.md). For security considerations around credentials, see [Security Hardening](SECURITY.md).

---

## 1. Prerequisites

Before installing the project locally, ensure you have the following installed:
- **Node.js:** `>=22.22.0 <23.0.0` (aligned with CI and engine requirements).
- **npm:** `>=10.0.0`
- **MongoDB:** A local MongoDB instance (`mongodb://localhost:27017`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI.
- **Git:** Version control.

Optional external services:
- **Cloudinary:** Required for image upload testing in the CMS.
- **Resend or Gmail SMTP:** Required for transactional email testing.

---

## 2. Step-by-Step Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/anurag-jaiswal-aj/googleMe.git
cd googleMe
```

### Step 2: Install All Dependencies
Install dependencies concurrently across the root, `server/`, and `client/` workspaces:
```bash
npm run install:all
```

### Step 3: Configure Environment Files
Copy the example templates for both workspaces:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Step 4: Generate Required Cryptographic Secrets
The server enforces a **fail-fast startup check**: it will refuse to start if `MONGO_URI`, `JWT_SECRET`, or `ADMIN_PASSWORD_HASH` are missing.

1. **Generate a secure 48-byte hex string for `JWT_SECRET`:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. **Generate a bcrypt hash for `ADMIN_PASSWORD_HASH`:**
   ```bash
   node -e "require('bcryptjs').hash('your_secure_password', 10).then(console.log)"
   ```

Paste these generated values into `server/.env`.

### Step 5: Seed the Database (Optional)
To populate MongoDB with initial bio content, experience history, skills, and projects:
```bash
npm run seed
```

### Step 6: Start the Development Server
Run both the Express backend and the Vite frontend concurrently:
```bash
npm run dev
```

- **Frontend Client:** `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API:** `http://localhost:5000`
- **Health Check:** `http://localhost:5000/api/health`
- **Admin Panel:** `http://localhost:3000/admin`

---

## 3. Server Environment Variables (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | HTTP listening port for the Express API server. |
| `NODE_ENV` | Optional | `development` | Runtime environment (`development` or `production`). Governs rate limits and error stacks. |
| `MONGO_URI` | **Required** | — | MongoDB connection string (local or MongoDB Atlas URI). **Fail-fast requirement.** |
| `ALLOWED_ORIGINS` | Optional | `http://localhost:3000,http://localhost:5173` | Comma-separated list of allowed origins for CORS. |
| `VERCEL_PREVIEW_PATTERN` | Optional | — | Regular expression matching trusted Vercel preview deployment URLs. |
| `JWT_SECRET` | **Required** | — | High-entropy secret used to sign and verify HS256 admin tokens. **Fail-fast requirement.** |
| `ADMIN_PASSWORD_HASH` | **Required** | — | bcrypt hash of the administrator password for `/admin` access. **Fail-fast requirement.** |
| `GITHUB_USERNAME` | Optional | `anurag-jaiswal-aj` | GitHub username used to sync public repositories. |
| `GITHUB_TOKEN` | Optional | — | Personal Access Token (PAT) to increase GitHub API rate limits from 60 to 5,000 req/hr. |
| `RESEND_API_KEY` | Optional | — | API key for primary transactional email dispatch via [Resend](https://resend.com). |
| `RESEND_FROM` | Optional | — | Verified sender email address for Resend delivery. |
| `EMAIL_HOST` | Optional | `smtp.gmail.com` | SMTP host for fallback email delivery. |
| `EMAIL_PORT` | Optional | `465` | SMTP port for fallback email delivery (`465` for SSL/TLS, `587` for STARTTLS). |
| `EMAIL_USER` | Optional | — | SMTP username or Gmail address for fallback email delivery. |
| `EMAIL_PASS` | Optional | — | SMTP App Password (use an app-specific password, never your personal password). |
| `EMAIL_TO` | Optional | — | Destination email address to receive contact inquiries and feedback submissions. |
| `CLOUDINARY_CLOUD_NAME` | Optional | — | Cloudinary cloud name for media hosting and on-the-fly image optimization. |
| `CLOUDINARY_API_KEY` | Optional | — | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | — | Cloudinary API secret. |

### Sanitized Development Example (`server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/gfolio
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Generated via: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=replace_with_generated_48_byte_hex_secret

# Generated via: node -e "require('bcryptjs').hash('your_password', 10).then(console.log)"
ADMIN_PASSWORD_HASH=replace_with_generated_bcrypt_hash

# External integrations (Optional for local testing)
GITHUB_USERNAME=anurag-jaiswal-aj
GITHUB_TOKEN=
RESEND_API_KEY=
RESEND_FROM=
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=
EMAIL_PASS=
EMAIL_TO=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 4. Client Environment Variables (`client/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Optional | `http://localhost:5000/api` | API backend base URL. In production, auto-detects `https://googleme.onrender.com/api`. |

### Development Example (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
```
