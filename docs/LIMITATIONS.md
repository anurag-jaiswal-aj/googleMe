# Known Limitations & Project Roadmap

This document outlines the confirmed architectural boundaries, operational caveats, and documented roadmap items for **googleMe**.

For system architecture details, see [Architecture](ARCHITECTURE.md). For security considerations, see [Security Hardening](SECURITY.md).

---

## 1. Confirmed Architectural Boundaries

To preserve technical credibility and transparency, the following design boundaries are intentionally established in the codebase:

### Client-Side AI Assistant
- **Implementation:** The AI chat assistant (`client/src/utils/aiChat.js`) utilizes a zero-latency, client-side regex and pattern-matching engine enriched with dynamic context from the admin configuration (bio, tools, experience).
- **Boundary:** It does not stream tokens from third-party large language models (such as OpenAI GPT or Google Gemini). This eliminates recurring API billing costs, token rate limits, and external availability dependencies.

### Google Lens Simulation
- **Implementation:** The Google Lens modal provides an interactive client-side image drag-and-drop interface and URL preview simulation.
- **Boundary:** It does not invoke a server-side computer vision model or visual embedding service. It explicitly displays an informational message indicating that visual search capabilities are planned for future iterations.

### Single-Administrator Authentication
- **Implementation:** Administrative access to `/admin` is protected by a single bcrypt-hashed master password (`ADMIN_PASSWORD_HASH`) and standard HS256 JWT tokens.
- **Boundary:** The platform does not implement multi-tenant role-based access control (RBAC), user registration, or multi-factor authentication (MFA).

---

## 2. Operational Caveats

### Free-Tier Compute Cold Starts
- **Behavior:** The backend Express API is hosted on Render's free compute tier, which automatically spins down web services after 15 minutes of inactivity.
- **Mitigation:** While an automated 5-minute health check ping (via external uptime monitoring) is configured to keep the instance active, occasional cold-start latencies (~30-50 seconds) may occur if the health check probe experiences an outage or during hosting maintenance windows.

### GitHub API Rate Limiting
- **Behavior:** The GitHub REST API v3 restricts unauthenticated callers to 60 requests per hour per IP address.
- **Mitigation:** The server implements an in-memory cache with a 30-minute TTL and automatically falls back to deterministic static fixtures (`shared/projects.json`) if rate limits are exceeded or if GitHub experiences an outage. Configuring `GITHUB_TOKEN` in the server environment increases this quota to 5,000 requests per hour.

### Distributed Side-Effect Isolation
- **Behavior:** Contact form submissions interact with two separate distributed systems: MongoDB Atlas (document persistence) and transactional email providers (Resend or Nodemailer SMTP).
- **Mitigation:** Because these disparate systems cannot participate in a single atomic two-phase commit transaction, the idempotency worker lease engine provides best-effort, at-most-once delivery suppression rather than a theoretical two-phase distributed guarantee.

---

## 3. Documented Project Roadmap

The following enhancements represent previously documented roadmap items for future development:

- [ ] **Rich Project Case Studies:** Expand pinned project cards into dedicated long-form case study routes (`/projects/:slug`) with rich media galleries and technical retrospectives.
- [ ] **Native CMS Blogging:** Author, preview, and publish Markdown blog posts directly within the `/admin` dashboard alongside the existing Medium RSS feed reader.
- [ ] **Admin Visitor Analytics:** Lightweight, privacy-first visitor traffic, referrer tracking, and search query telemetry rendered directly in the admin dashboard.
- [ ] **Interactive GitHub Activity Matrix:** Visual contribution heatmap widget embedded into the About SERP tab, powered by cached GitHub GraphQL data.
