# Production Deployment & Operations

This document describes the deployment architecture, hosting configurations, build commands, and operational verification procedures for **googleMe**.

For environment variable setup, see [Configuration](CONFIGURATION.md). For system architecture diagrams, see [Architecture](ARCHITECTURE.md).

---

## 1. Deployment Topology

```
Internet / End User
       │
       ├───► HTTPS: anuragjaiswal.me
       │     │
       │     ▼
       │  Vercel Global Edge Network
       │  ├── Single Page Application (React 18 + Vite)
       │  ├── Route Rewrites (/resume -> index.html)
       │  ├── Security Headers (CSP, X-Frame-Options, HSTS)
       │  └── Pre-compressed Assets (Gzip & Brotli)
       │
       └───► HTTPS: googleme.onrender.com/api
             │
             ▼
          Render Web Service (Node.js + Express)
          ├── Trust Proxy (1 Hop)
          ├── Helmet Security Headers & Strict CORS
          ├── Tiered Rate Limiting
          ├── MongoDB Atlas Cluster (Persistent State)
          └── Cloudinary Media CDN (Image Storage & Optimization)
```

---

## 2. Frontend Deployment (Vercel)

The frontend client is deployed as a Single Page Application (SPA) on Vercel's global edge network.

### Build & Project Configuration
- **Root Directory:** `client`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node.js Version:** Managed via Vercel project settings (Node 20 / 22 compatible)

### SPA Routing & Header Rules (`client/vercel.json`)
- **SPA Rewrites:** All path requests (`/:path*`) are rewritten to `/index.html`, enabling client-side routing via React Router v6. Static files (such as `/Resume_aj.pdf`, `/favicon.svg`, `/robots.txt`) bypass the rewrite rule.
- **Security Headers:**
  - `Content-Security-Policy`: Restricts scripts, styles, fonts, connections, and images to trusted sources (Cloudinary, Google Fonts, GitHub avatars, Vercel analytics).
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `X-Frame-Options: DENY`: Blocks clickjacking via iframe embedding.
  - `Strict-Transport-Security`: Enforces HTTPS with preload.
  - `Referrer-Policy: strict-origin-when-cross-origin`.

### Frontend Environment Variables
- `VITE_API_URL`: Set to the production API base URL (`https://googleme.onrender.com/api`).

---

## 3. Backend Deployment (Render)

The backend is deployed as a Node.js Web Service on [Render](https://render.com).

### Service Configuration
- **Root Directory:** `server`
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `node index.js`
- **Health Check Path:** `/api/health`

### Runtime Configuration Note
- `server/package.json` specifies `"node": ">=22.22.0 <23.0.0"`.
- **Operational Reality:** Render selects the active Node.js runtime based on service dashboard configuration or environment overrides. While the repository declares Node.js 22 and CI enforces Node.js 22, the active production Node.js version on Render is governed by host dashboard settings and cannot be verified from repository configuration alone.

### Reverse Proxy Configuration
- Because Render runs Express applications behind reverse proxies, `server/index.js` sets:
  ```javascript
  app.set('trust proxy', 1);
  ```
  This ensures that `express-rate-limit` accurately detects visitor IP addresses from `X-Forwarded-For` headers rather than the proxy's internal IP.

### Cold-Start Mitigation
- On Render's free tier, inactive services spin down after 15 minutes of inactivity.
- An external uptime monitor (such as [UptimeRobot](https://uptimerobot.com)) is configured to ping `https://googleme.onrender.com/api/health` every 5 minutes to prevent sleep cycles and eliminate cold-start latency for visitors.

---

## 4. Production Smoke-Test Checklist

Following any deployment, execute the following operational checks to confirm service health:

### 1. Backend Health Check
Verify that the Express server and database connection are active:
```bash
curl -I https://googleme.onrender.com/api/health
```
*Expected: HTTP 200 OK with `{ "status": "ok", "timestamp": "..." }`.*

### 2. Public Configuration Verification
Verify that site configuration and CORS headers are operating normally:
```bash
curl -s https://googleme.onrender.com/api/config | grep "name"
```
*Expected: JSON response containing author bio and portfolio metadata.*

### 3. Frontend Edge Verification
- Visit `https://www.anuragjaiswal.me`.
- Verify sticky search bar, SERP tabs (All, About, Projects, Blog, Tools, Images, Contact), and Knowledge Graph right rail.
- Check browser console: Ensure zero CSP violations or uncaught runtime exceptions.

### 4. Gallery & Media Verification
- Navigate to the Images tab (`https://www.anuragjaiswal.me/images`).
- Verify images load properly from Cloudinary CDN.
- Test external link buttons to confirm WHATWG validation and safe new-tab opening.

### 5. Idempotent Submission Test
- Submit a test inquiry via the Contact form.
- Verify instant UI feedback, button disabled states, and email receipt via Resend or SMTP fallback.
