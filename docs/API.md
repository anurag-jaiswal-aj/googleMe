# API Reference

This document provides the complete REST API specification for the **googleMe** backend server.

For architectural overview, see [Architecture](ARCHITECTURE.md). For security details, see [Security Hardening](SECURITY.md). For environment configuration, see [Configuration](CONFIGURATION.md).

---

## 1. Overview & Conventions

- **Base URL (Local):** `http://localhost:5000/api`
- **Base URL (Production):** `https://googleme.onrender.com/api`
- **Content Types:**
  - Standard JSON requests: `Content-Type: application/json`
  - Multipart uploads (attachments, resume, avatar, images): `Content-Type: multipart/form-data`
- **Response Format:** All JSON endpoints return structured JSON objects. Errors follow `{ "error": string }` or express-validator array formats.

### Authentication Model
Protected administrative endpoints require a JSON Web Token (JWT) transmitted via the standard HTTP Authorization header:
```http
Authorization: Bearer <jwt-token>
```
Tokens are generated via `POST /api/admin/login` and signed using HS256 with a 24-hour expiration.

### Body Parsing & Payload Limits
To defend against payload flooding while supporting rich configuration updates:
- `/api/config`: `1 MB` maximum JSON payload.
- All other JSON routes: `50 KB` maximum JSON payload.
- File upload limits:
  - Resume PDF: `5 MB` (`.pdf` only)
  - Avatar image: `10 MB` (image MIME types)
  - Gallery image: `10 MB` (image MIME types)
  - Contact attachments: Up to 3 files, `5 MB` each (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.txt`, `.doc`, `.docx`)
  - Feedback attachment: 1 file, `5 MB` maximum

### Rate Limiting Tiers
- **General Endpoints:** 100 requests per 15-minute window in production.
- **Admin Login (`/api/admin/login`):** 10 attempts per 15-minute window to mitigate brute-force attacks.
- **Public Submissions (`/api/contact`, `/api/feedback`):** 10 submissions per hour per IP.

---

## 2. Authentication & Health Endpoints

### Health Check
`GET /api/health`
- **Access:** Public
- **Description:** Verifies service availability. Used by uptime monitors and container probes.
- **Request:** None
- **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-16T12:00:00.000Z"
  }
  ```

### Admin Login
`POST /api/admin/login`
- **Access:** Public (rate-limited)
- **Description:** Authenticates administrator credentials against `ADMIN_PASSWORD_HASH`.
- **Request Body:**
  ```json
  {
    "password": "string"
  }
  ```
- **Responses:**
  - `200 OK`:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
  - `400 Bad Request`: `{ "error": "Password is required" }`
  - `401 Unauthorized`: `{ "error": "Invalid password" }`
  - `429 Too Many Requests`: Rate limit exceeded.

### Admin Verify
`POST /api/admin/verify`
- **Access:** Public (with Bearer token)
- **Description:** Verifies whether an existing JWT token is valid and unexpired.
- **Headers:** `Authorization: Bearer <token>`
- **Responses:**
  - `200 OK`: `{ "valid": true }`
  - `401 Unauthorized`: `{ "valid": false, "error": "Invalid or expired token" }`

---

## 3. Site Configuration & CMS Endpoints

### Get Site Configuration
`GET /api/config`
- **Access:** Public (in-memory cached, 60s TTL)
- **Description:** Retrieves all portfolio metadata, bio, education, experience, tool categories, and page visibility toggles.
- **Response (`200 OK`):**
  ```json
  {
    "profile": {
      "name": "Anurag Jaiswal",
      "title": "Full-Stack Developer"
    },
    "pageVisibility": {
      "blog": true,
      "tools": true,
      "images": true
    },
    "socialLinks": {
      "github": "https://github.com/anurag-jaiswal-aj",
      "linkedin": "https://www.linkedin.com/in/therightrag/"
    }
  }
  ```

### Update Site Configuration
`POST /api/config`
- **Access:** Admin (Requires Bearer token)
- **Description:** Updates single configuration key-value pair or batch updates.
- **Request Body (Single):**
  ```json
  {
    "key": "bio",
    "value": "Updated bio text..."
  }
  ```
- **Request Body (Batch):**
  ```json
  {
    "updates": [
      { "key": "bio", "value": "Updated bio..." },
      { "key": "pageVisibility.tools", "value": false }
    ]
  }
  ```
- **Responses:**
  - `200 OK`: Returns updated configuration object.
  - `400 Bad Request`: Invalid key or validation error.
  - `401 Unauthorized`: Missing or invalid token.

### Upload Resume PDF
`POST /api/config/resume-upload`
- **Access:** Admin (Requires Bearer token)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `resume` (PDF file, max 5 MB)
- **Responses:**
  - `200 OK`: `{ "resumeUrl": "https://res.cloudinary.com/..." }`
  - `400 Bad Request`: Non-PDF file, invalid magic-byte header, or file exceeding limit.
  - `401 Unauthorized`: Missing or invalid token.

### Upload Avatar Image
`POST /api/config/avatar-upload`
- **Access:** Admin (Requires Bearer token)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `avatar` (Image file, max 10 MB)
- **Responses:**
  - `200 OK`: `{ "avatarUrl": "https://res.cloudinary.com/..." }`
  - `400 Bad Request`: Non-image file or invalid magic-byte header.
  - `401 Unauthorized`: Missing or invalid token.

---

## 4. Projects & External Sync Endpoints

### Get Curated Projects
`GET /api/projects`
- **Access:** Public
- **Description:** Returns the administrator-curated list of portfolio projects, populated from selected GitHub repositories or static fallback data (`shared/projects.json`).
- **Response (`200 OK`):**
  ```json
  [
    {
      "name": "googleMe",
      "description": "Google-inspired portfolio",
      "html_url": "https://github.com/anurag-jaiswal-aj/googleMe",
      "topics": ["react", "express", "mongodb"],
      "stargazers_count": 0,
      "featured": true
    }
  ]
  ```

### List GitHub Repositories
`GET /api/github/repos`
- **Access:** Admin (Requires Bearer token)
- **Description:** Proxies public repositories from the GitHub REST API for the configured username. Cached for 30 minutes in memory.
- **Responses:**
  - `200 OK`: Array of repository objects.
  - `401 Unauthorized`: Missing or invalid token.
  - `502 Bad Gateway`: GitHub API unavailable and fallback failed.

### Update Project Selection
`POST /api/github/selection`
- **Access:** Admin (Requires Bearer token)
- **Description:** Updates which repositories appear in the curated portfolio and their display order.
- **Request Body:**
  ```json
  {
    "selectedRepos": [
      { "name": "googleMe", "featured": true }
    ]
  }
  ```
- **Responses:**
  - `200 OK`: `{ "message": "Selection saved", "count": 1 }`
  - `400 Bad Request`: Validation failure.
  - `401 Unauthorized`: Missing or invalid token.

### Get Medium RSS Articles
`GET /api/medium`
- **Access:** Public (in-memory cached, 30m TTL)
- **Description:** Fetches and parses published Medium articles via RSS feed. Strips tracking pixels and unsafe HTML.
- **Responses:**
  - `200 OK`: Array of article summaries with title, link, pubDate, and content.
  - `502 Bad Gateway`: Medium feed unavailable.

---

## 5. Inquiries & User Feedback Endpoints

### Submit Contact Message
`POST /api/contact`
- **Access:** Public (rate-limited: 10/hour)
- **Content-Type:** `multipart/form-data`
- **Headers:** `Idempotency-Key: <UUIDv4>` (recommended for safe retries)
- **Form Fields:**
  - `name` (string, required, 1-100 chars)
  - `email` (string, required, valid email format)
  - `message` (string, required, 1-5000 chars)
  - `subject` (string, optional, 1-200 chars)
  - `_hp` (string, optional, honeypot field; must be empty)
  - `attachments` (file array, optional, max 3 files, 5 MB each)
- **Responses:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Message sent successfully",
      "id": "660c1f2e..."
    }
    ```
  - `400 Bad Request`: Validation error or non-matching magic-byte attachment.
  - `409 Conflict`: In-flight submission with matching idempotency key.
  - `422 Unprocessable Entity`: Idempotency key reused with mismatched payload.
  - `429 Too Many Requests`: Submission rate limit exceeded.

### Submit Feedback
`POST /api/feedback`
- **Access:** Public (rate-limited: 10/hour)
- **Content-Type:** `multipart/form-data`
- **Headers:** `Idempotency-Key: <UUIDv4>`
- **Form Fields:**
  - `type` (string, required: `"bug" | "feature" | "general"`)
  - `message` (string, required, 1-5000 chars)
  - `name` (string, optional)
  - `email` (string, optional)
  - `page` (string, optional)
  - `_hp` (string, optional honeypot; must be empty)
  - `attachment` (file, optional, max 5 MB)
- **Responses:**
  - `201 Created`: Returns created `Feedback` object.
  - `400 Bad Request`, `409 Conflict`, `422 Unprocessable`, `429 Too Many Requests`.

### List Feedback
`GET /api/feedback`
- **Access:** Admin (Requires Bearer token)
- **Query Parameters:** `status`, `type`, `page`, `limit`
- **Response (`200 OK`):** Paginated feedback list and total counts.

### Update Feedback Status
`PATCH /api/feedback/:id/status`
- **Access:** Admin (Requires Bearer token)
- **Request Body:** `{ "status": "new" | "in-review" | "resolved" | "archived" }`
- **Responses:**
  - `200 OK`: Updated feedback record.
  - `400 Bad Request`: Invalid status value.
  - `404 Not Found`: Record not found.

### Delete Feedback
`DELETE /api/feedback/:id`
- **Access:** Admin (Requires Bearer token)
- **Response (`200 OK`):** `{ "message": "Feedback deleted" }`

---

## 6. Gallery Management Endpoints

### List Gallery Images
`GET /api/images`
- **Access:** Public
- **Description:** Returns all published gallery media items.
- **Response (`200 OK`):**
  ```json
  [
    {
      "_id": "660c2a...",
      "title": "Project Screenshot",
      "description": "Dashboard view",
      "category": "Projects",
      "url": "https://res.cloudinary.com/...",
      "link": "https://github.com/...",
      "order": 0
    }
  ]
  ```

### Add Gallery Image
`POST /api/images`
- **Access:** Admin (Requires Bearer token)
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `image` (file, required), `title` (string, required), `description` (string, optional), `category` (string, optional), `link` (string, optional WHATWG-valid URL)
- **Responses:**
  - `201 Created`: Returns created `GalleryImage` record.
  - `400 Bad Request`: Missing file, invalid magic-byte header, or invalid external link.

### Update Gallery Image Metadata
`PATCH /api/images/:id`
- **Access:** Admin (Requires Bearer token)
- **Request Body:** `{ "title"?, "description"?, "category"?, "link"?, "order"? }`
- **Responses:**
  - `200 OK`: Updated `GalleryImage` record.
  - `400 Bad Request`, `401 Unauthorized`, `404 Not Found`.

### Delete Gallery Image
`DELETE /api/images/:id`
- **Access:** Admin (Requires Bearer token)
- **Description:** Deletes image record from MongoDB and attempts asset destruction in Cloudinary.
- **Responses:**
  - `200 OK`: `{ "message": "Image deleted" }`
  - `401 Unauthorized`, `404 Not Found`.
