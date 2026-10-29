# googleMe — Persistent Project Context & Development Handoff

> **Document Purpose:** This document provides a complete, factual, and verified mental model of the **googleMe** repository. It serves as the primary handoff reference for future AI-assisted development sessions, eliminating the need to repeatedly rediscover the codebase architecture, design decisions, operational nuances, and known issues.

---

## 1. Project Overview & Core Philosophy

### 1.1 Product Vision & Problem Statement
Conventional developer portfolios are typically static, vertical-scroll landing pages. They suffer from:
1. **High Discovery Friction:** Recruiters and hiring managers must scroll past extensive animations to locate specific work, tools, or education details.
2. **Maintenance Overhead:** Updating content often requires modifying source code, committing to version control, and redeploying.
3. **Superficial Engineering:** Passive frontends often lack genuine backend systems, persistent databases, rate limiting, and automated test coverage.

**googleMe** approaches portfolio presentation as an intent-driven search problem:
- **Zero-Friction Search Navigation:** Queries like `"resume"`, `"github"`, `"skills"`, `"contact"`, or `"projects"` immediately evaluate against a weighted keyword scoring algorithm, routing visitors to the corresponding result tab in browser memory without server round-trips.
- **SERP Fidelity:** Replicates an authentic Google Search Engine Results Page (SERP) experience, complete with sticky search header, category tabs (`All`, `About`, `Projects`, `Blog`, `Tools`, `Images`, `Contact`), breadcrumbs, sitelinks, Google Apps grid drawer, account avatar menu, and a collapsible Knowledge Graph panel.
- **Decoupled Headless CMS:** An integrated, authenticated administrative dashboard (`/admin`) allows dynamic editing of bio text, work history, skill taxonomies, pinned GitHub repositories, gallery media, and page visibility toggles without code changes or redeployments.
- **Fail-Closed Resilience:** Server startups abort if required database indexes or configuration secrets are missing, media uploads enforce binary header inspection, and transactional workflows implement distributed submission idempotency.

### 1.2 Repository & System Identity
- **Repository:** [https://github.com/anurag-jaiswal-aj/googleMe](https://github.com/anurag-jaiswal-aj/googleMe)
- **Production Portfolio:** [https://www.anuragjaiswal.me](https://www.anuragjaiswal.me)
- **Backend API (Production):** [https://googleme.onrender.com/api](https://googleme.onrender.com/api)
- **Local Workspace Root:** `/Users/anurag/Developer/googleMe`
- **Monorepo Structure:** Root npm orchestration package (`gfolio`), client SPA workspace (`gfolio-client`), and server API workspace (`gfolio-server`).

---

## 2. Product Features & User Journeys

### 2.1 Feature Inventory by Implementation Status

| Feature | Status | Architectural Location | Notes |
|---|---|---|---|
| **Google SERP Shell & UX** | **Implemented** | [`client/src/components/SearchLayout.jsx`](file:///Users/anurag/Developer/googleMe/client/src/components/SearchLayout.jsx) | Sticky header, category tabs, Google Apps drawer, account menu. |
| **Intent-Driven Search Router** | **Implemented** | [`client/src/utils/searchRoute.js`](file:///Users/anurag/Developer/googleMe/client/src/utils/searchRoute.js) | Scored keyword matching with dynamic visibility fallback to `/all`. |
| **Dynamic Visibility Toggles** | **Implemented** | [`client/src/components/VisibilityGuard.jsx`](file:///Users/anurag/Developer/googleMe/client/src/components/VisibilityGuard.jsx) | Allows admin to hide Blog, Tools, and Images tabs from public view while permitting admin preview. |
| **Knowledge Graph Panel** | **Implemented** | [`client/src/components/KnowledgePanel.jsx`](file:///Users/anurag/Developer/googleMe/client/src/components/KnowledgePanel.jsx) | Profile metadata, education, skill breakdown, social profile chips, and work status. |
| **3D Interactive Flip Avatar** | **Implemented** | [`client/src/components/Avatar.js`](file:///Users/anurag/Developer/googleMe/client/src/components/Avatar.js) | CSS 3D perspective flip container toggling between profile photo and Google 'A' glyph. |
| **Client-Side AI Assistant** | **Implemented** | [`client/src/utils/aiChat.js`](file:///Users/anurag/Developer/googleMe/client/src/utils/aiChat.js) | Zero-latency pattern-matching conversational engine operating in browser memory. |
| **Web Speech Voice Search** | **Implemented** | [`client/src/hooks/useVoiceSearch.js`](file:///Users/anurag/Developer/googleMe/client/src/hooks/useVoiceSearch.js) | Native browser speech recognition with permission checks and animations. |
| **Google Lens Simulation** | **Partially Implemented (Simulated)** | [`client/src/pages/Home.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Home.jsx), [`SearchLayout.jsx`](file:///Users/anurag/Developer/googleMe/client/src/components/SearchLayout.jsx) | Image drag-and-drop dropzone and URL input simulation; discloses visual search as future work. |
| **Headless Admin CMS (`/admin`)** | **Implemented** | [`client/src/pages/Admin.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Admin.jsx) | Authenticated dashboard with 10 management tabs. |
| **Curated GitHub Project Sync** | **Implemented** | [`server/routes/projects.js`](file:///Users/anurag/Developer/googleMe/server/routes/projects.js), [`github.js`](file:///Users/anurag/Developer/googleMe/server/routes/github.js) | Dynamic selection and ordering of public GitHub repos, backed by `shared/projects.json` fallback. |
| **Medium RSS Feed Ingestion** | **Implemented** | [`server/routes/medium.js`](file:///Users/anurag/Developer/googleMe/server/routes/medium.js) | Live Medium RSS fetching, tracking pixel removal, in-memory 30m cache. |
| **In-App Article Reader** | **Implemented** | [`client/src/pages/Blog.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Blog.jsx) | Full-screen modal reader with custom typography. |
| **Developer Toolkit Taxonomy** | **Implemented** | [`client/src/data/toolsData.js`](file:///Users/anurag/Developer/googleMe/client/src/data/toolsData.js), [`Tools.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Tools.jsx) | Categorized skill inventory (Expert, Proficient, Intermediate, Beginner). |
| **Media Gallery & Lightbox** | **Implemented** | [`client/src/pages/Images.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Images.jsx), [`server/routes/images.js`](file:///Users/anurag/Developer/googleMe/server/routes/images.js) | Image uploads via Multer to Cloudinary, `@dnd-kit` drag-and-drop reordering, WHATWG link canonicalization. |
| **Resilient Form Submissions** | **Implemented** | [`server/routes/contact.js`](file:///Users/anurag/Developer/googleMe/server/routes/contact.js), [`feedback.js`](file:///Users/anurag/Developer/googleMe/server/routes/feedback.js) | SEC-24 distributed idempotency, binary magic-byte checks, dual email failover. |
| **Theme System (Dark/Light/System)** | **Implemented** | [`client/src/context/ThemeContext.jsx`](file:///Users/anurag/Developer/googleMe/client/src/context/ThemeContext.jsx) | Normalizes explicit user choices, OS preference, and CMS-configured defaults. |
| **Multilingual UI Switcher** | **Implemented** | [`client/src/pages/Home.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Home.jsx) | UI translations across 10 Indian regional languages with grapheme segmentation. |
| **Weather & Clock Widget** | **Implemented** | [`client/src/pages/Home.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/Home.jsx) | Connects to Open-Meteo and OpenStreetMap for home header clock and temperature. |
| **Rich Project Case Studies** | **Planned (Roadmap)** | [`docs/LIMITATIONS.md`](file:///Users/anurag/Developer/googleMe/docs/LIMITATIONS.md#L47) | Long-form case study routes (`/projects/:slug`). |
| **Native Admin Markdown Blogging** | **Planned (Roadmap)** | [`docs/LIMITATIONS.md`](file:///Users/anurag/Developer/googleMe/docs/LIMITATIONS.md#L48) | Authoring Markdown blog posts directly inside `/admin`. |
| **Admin Visitor Analytics** | **Planned (Roadmap)** | [`docs/LIMITATIONS.md`](file:///Users/anurag/Developer/googleMe/docs/LIMITATIONS.md#L49) | Lightweight, privacy-first analytics in the admin dashboard. |
| **Interactive Contribution Heatmap** | **Planned (Roadmap)** | [`docs/LIMITATIONS.md`](file:///Users/anurag/Developer/googleMe/docs/LIMITATIONS.md#L50) | GitHub contribution matrix embedded into the About SERP tab. |

### 2.2 Critical User Journeys

#### Journey 1: Intent-Driven Search Navigation
1. User focuses search input on Home (`/`) or presses `/` on any SERP view.
2. Typing triggers client-side suggestions via `filterSuggestions(query, visibility)`.
3. Pressing `Enter` evaluates [`resolveSearchRoute(query, visibility)`](file:///Users/anurag/Developer/googleMe/client/src/utils/searchRoute.js#L65):
   $$\text{Score} = (\text{exact match} \times 2 + \text{keyword length}) + (\text{partial match} + \text{keyword length} \times 0.5)$$
4. If an intent keyword matches (e.g. `"resume"` $\to$ `/about`, `"github"` $\to$ `/projects`, `"hire"` $\to$ `/contact`), the router verifies route visibility.
5. If the target section is enabled, it transitions to that tab. If disabled by admin, it falls back to `/all?q=...` instead of triggering a 404.

#### Journey 2: Resilient Form Submission (SEC-24 Flow)
1. User fills out contact form (`/contact`) or feedback modal, optionally adding attachments ($\le 5\text{ MB}$ each).
2. Client generates an RFC 4122 v4 UUID (`Idempotency-Key`) managed by `createIdempotencyKeyManager`.
3. Client dispatches `POST /api/contact` or `POST /api/feedback`.
4. If a network timeout occurs (such as Render free-tier cold start), Axios intercepts the error, fires a warm-up ping to `/api/health`, and retries with the **exact same** idempotency key.
5. Server inspects binary magic bytes on incoming buffers.
6. Server claims key in `IdempotencyRecord` (`in_progress` state with random `ownerToken` and 120s worker lease).
7. Server persists document (`Contact` or `Feedback`) to MongoDB Atlas.
8. Server executes `isClaimOwner()`. If lease ownership is intact, it dispatches email via Resend (falling back to Nodemailer SMTP on error).
9. Server marks `IdempotencyRecord` as `completed`, caching response data (`201 Created`). Subsequent retries return the cached response with `{ deduplicated: true }`.

#### Journey 3: Administrative Content Management
1. Administrator presses `Ctrl + Shift + A` or visits `/admin`.
2. Submits password to `POST /api/admin/login`, receiving an HS256 JWT valid for 24 hours.
3. Admin edits bio, manages skills, reorders gallery media, or toggles page visibility.
4. Updates are sent via authenticated `POST /api/config` or `POST /api/github/selection`.
5. Server validates payloads, persists changes to MongoDB, and clears in-memory caches.
6. Frontend executes `clearConfigCache()`, broadcasting fresh state to all mounted components without page reload.

---

## 3. Verified Technology Stack & Dependency Manifest

### 3.1 Technology Versions

| Component | Technology | Version | Location |
|---|---|---|---|
| **Client Core** | React / React DOM | `^18.3.1` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L21-L22) |
| **Routing** | React Router DOM | `^6.30.6` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L25) |
| **Bundling** | Vite / `@vitejs/plugin-react` | `^5.4.21` / `^4.7.0` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L29-L34) |
| **Styling** | Tailwind CSS / Typography | `^3.4.19` / `^0.5.19` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L28-L33) |
| **Animation** | Framer Motion | `^11.0.8` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L20) |
| **Drag & Drop** | `@dnd-kit` (core, sortable, utils) | `^6.3.1` / `^10.0.0` / `^3.2.2` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L13-L15) |
| **Sanitization** | DOMPurify | `^3.4.16` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L19) |
| **PWA & Compression** | `vite-plugin-pwa` / `vite-plugin-compression` | `^1.2.0` / `^0.5.1` | [`client/package.json`](file:///Users/anurag/Developer/googleMe/client/package.json#L35-L36) |
| **Backend Runtime** | Node.js Engine Target | `>=22.22.0 <23.0.0` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L7) |
| **Web Server** | Express | `^4.18.3` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L19) |
| **Database ODM** | Mongoose | `^8.2.3` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L24) |
| **Security** | Helmet / CORS / `express-rate-limit` | `^7.1.0` / `^2.8.5` / `^7.2.0` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L17-L22) |
| **Validation** | `express-validator` | `^7.0.1` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L21) |
| **Auth** | `jsonwebtoken` / `bcryptjs` | `^9.0.3` / `^3.0.3` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L15-L23) |
| **Uploads** | Multer / Streamifier | `^2.1.1` / `^0.1.1` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L25-L28) |
| **Media CDN** | Cloudinary | `^2.9.0` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L16) |
| **Email** | Nodemailer (SMTP) / Resend (API) | `^10.1.0` (Nodemailer) | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L26) |
| **RSS Parser** | `rss-parser` | `^3.13.0` | [`server/package.json`](file:///Users/anurag/Developer/googleMe/server/package.json#L27) |

### 3.2 Testing Framework Rationale
The project deliberately avoids third-party testing frameworks (such as Jest, Mocha, Vitest, or Cypress). All 17 test suites execute natively using Node.js built-in modules (`node:test` and `node:assert`). This design minimizes dependency bloat, protects against supply-chain vulnerabilities, accelerates CI startup, and guarantees identical test behavior between local environments and production runners.

---

## 4. Repository Layout & File Map

```
googleMe/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI workflow (Node 22, MongoDB 6.0 container)
├── client/                            # Frontend Single Page Application (React 18 + Vite)
│   ├── public/                        # Static assets (Resume PDF, favicon, og-image, sitemap, robots)
│   ├── src/
│   │   ├── api/index.js               # Axios client, base URL auto-detection, and API service methods
│   │   ├── components/                # Reusable UI components
│   │   │   ├── Avatar.js              # 3D interactive flip avatar
│   │   │   ├── BugReportModal.jsx     # Reusable feedback/bug report dialog
│   │   │   ├── ErrorBoundary.jsx      # React error boundary catching render crashes
│   │   │   ├── FilterSort.jsx         # Google-style filter and sort dropdowns
│   │   │   ├── KnowledgePanel.jsx     # Collapsible right-rail Knowledge Graph panel
│   │   │   ├── SearchLayout.jsx       # Persistent SERP header, category tabs, and footer shell
│   │   │   ├── SearchResult.jsx       # Standard Google SERP result item card
│   │   │   ├── SEO.jsx                # React Helmet document title, meta tags, and OpenGraph
│   │   │   ├── ThemeToggle.jsx        # Dark/light mode button
│   │   │   ├── VisibilityGuard.jsx    # Route guard evaluating page visibility & admin preview
│   │   │   └── WelcomeSplash.jsx      # Per-session animated Google welcome overlay
│   │   ├── config/links.js            # Default navigation, social, and resume URLs
│   │   ├── context/ThemeContext.jsx   # Theme state provider (light/dark/system)
│   │   ├── data/                      # Hardcoded fallback fixtures (about, blog, tools, visibility)
│   │   ├── hooks/                     # Custom hooks (useConfig, useVoiceSearch, useImagesPageEnabled)
│   │   ├── pages/                     # Route pages (Home, All, About, Projects, Blog, Tools, Images, Contact, Admin, NotFound)
│   │   ├── styles/index.css           # Tailwind directives and 3D avatar flip keyframes
│   │   └── utils/                     # Client utilities (aiChat, searchRoute, galleryUrl, resumeUrl, idempotency)
│   ├── test-*.js                      # 10 standalone frontend test suites (153 tests)
│   ├── vercel.json                    # Vercel SPA rewrites, security headers, and CSP rules
│   └── vite.config.js                 # Vite bundler config, PWA workbox rules, gzip/brotli plugins
├── docs/                              # Modular technical documentation
│   ├── API.md                         # REST API specifications and contracts
│   ├── ARCHITECTURE.md                # System design, Mermaid diagrams, and architectural principles
│   ├── CONFIGURATION.md               # Environment variable reference and secret generation guide
│   ├── DEPLOYMENT.md                  # Vercel and Render deployment topology and smoke-test steps
│   ├── LIMITATIONS.md                 # System boundaries, operational caveats, and roadmap
│   ├── PROJECT_CONTEXT.md             # This document (master context and handoff guide)
│   ├── SECURITY.md                    # SEC-01 through SEC-24 controls and idempotency specifications
│   └── TESTING.md                     # Test suite breakdown, execution guide, and CI pipeline
├── server/                            # Backend REST API (Node.js + Express + MongoDB)
│   ├── middleware/auth.js             # JWT authentication middleware (HS256 validation)
│   ├── models/                        # Mongoose data models
│   │   ├── Contact.js                 # Contact inquiries with partial unique idempotency index
│   │   ├── Feedback.js                # User feedback with status and attachment schema
│   │   ├── GalleryImage.js            # Media items with Cloudinary publicId and virtual URL
│   │   ├── IdempotencyRecord.js       # Atomic claim locks with 120s lease and 24h TTL index
│   │   ├── PortfolioConfig.js         # Curated GitHub repository selection store
│   │   ├── Project.js                 # Legacy standalone project model (unqueried)
│   │   └── SiteConfig.js              # Generic key-value store for site configuration
│   ├── routes/                        # Express route controllers
│   │   ├── adminAuth.js               # Admin login and JWT token verification
│   │   ├── config.js                  # Site configuration GET/POST and media upload endpoints
│   │   ├── contact.js                 # Contact form submission with SEC-24 idempotency
│   │   ├── feedback.js                # Feedback submission and admin inbox management
│   │   ├── github.js                  # GitHub REST API proxy and in-memory cache
│   │   ├── images.js                  # Gallery image CRUD and Cloudinary deletion
│   │   ├── medium.js                  # Medium RSS feed parser and in-memory cache
│   │   └── projects.js                # Curated project endpoint merging GitHub and fallback data
│   ├── scripts/seed.js                # Database seed utility (contains broken relative imports)
│   ├── utils/                         # Shared backend utilities
│   │   ├── attachmentValidation.js    # Binary magic-byte validation for attachments
│   │   ├── configValidation.js        # Strict validators for admin configuration payloads
│   │   ├── corsConfig.js              # Origin allowlist and preview regex resolution
│   │   ├── emailService.js            # Resend API primary with Nodemailer SMTP fallback
│   │   ├── idempotency.js             # Distributed idempotency engine and payload hashing
│   │   └── imageValidation.js         # Image magic-byte checking for avatar and gallery
│   ├── test-*.js                      # 7 standalone backend test suites (233 tests)
│   └── index.js                       # Express server entry point, middleware stack, port binding
├── shared/
│   └── projects.json                  # Deterministic fallback projects for offline/rate-limited runs
├── lighthouse.png                     # Verified Lighthouse audit score screenshot (98/94/96/100)
├── LICENSE                            # MIT License
└── package.json                       # Monorepo scripts (dev, build, seed, install:all)
```

---

## 5. Frontend Architecture & State Flow

### 5.1 Routing & Code Splitting
- Entry: [`client/src/main.jsx`](file:///Users/anurag/Developer/googleMe/client/src/main.jsx) mounts `App` inside `HelmetProvider`, `BrowserRouter` (with React Router v7 future flags enabled), and `ThemeProvider`.
- Shell & Split Chunks: [`client/src/App.jsx`](file:///Users/anurag/Developer/googleMe/client/src/App.jsx) code-splits every page component using `React.lazy` and `Suspense` with a custom `PageLoader`.
- Route Structure:
  - `/`: Standalone Google-style homepage.
  - Nested SERP Layout (`SearchLayout`): `/all`, `/about`, `/projects`, `/contact`, `/blog`, `/tools`, `/images`.
  - Standalone Admin: `/admin`.
  - Dynamic Redirect: `/resume` dynamically resolves to the configured resume URL (or `LINKS.resume` fallback) via [`ResumeRedirect`](file:///Users/anurag/Developer/googleMe/client/src/App.jsx#L40).
  - 404: `*` renders typographic 404 page [`NotFound.jsx`](file:///Users/anurag/Developer/googleMe/client/src/pages/NotFound.jsx).

### 5.2 State Management & Hooks
- **Configuration Broadcast (`useConfig`):** [`client/src/hooks/useConfig.js`](file:///Users/anurag/Developer/googleMe/client/src/hooks/useConfig.js) implements an in-memory module-level subscription model. Serves cached config immediately on mount (preventing UI flicker), fires background revalidation, and updates all mounted components simultaneously when `clearConfigCache()` is called upon admin save.
- **Theme Resolution (`ThemeContext`):** [`client/src/context/ThemeContext.jsx`](file:///Users/anurag/Developer/googleMe/client/src/context/ThemeContext.jsx) resolves effective theme based on:
  1. Explicit stored preference in `localStorage`.
  2. CMS-configured default (`system`, `dark`, `light`).
  3. Operating system media query (`prefers-color-scheme: dark`).
- **Route Visibility Guard (`VisibilityGuard`):** [`client/src/components/VisibilityGuard.jsx`](file:///Users/anurag/Developer/googleMe/client/src/components/VisibilityGuard.jsx) wraps `/blog`, `/tools`, and `/images`. If a section is toggled off in the CMS:
  - Anonymous visitors are redirected to `/all` with `replace` navigation.
  - Authenticated administrators (verified via JWT) are granted preview access.
- **Client Idempotency Manager:** [`client/src/utils/idempotency.js`](file:///Users/anurag/Developer/googleMe/client/src/utils/idempotency.js) provides `createIdempotencyKeyManager()`, ensuring identical keys are maintained across retries until explicitly cleared upon successful response.

---

## 6. Backend Architecture & Request Flow

### 6.1 Middleware Stack Execution Order
Incoming requests pass through a strictly defined middleware pipeline in [`server/index.js`](file:///Users/anurag/Developer/googleMe/server/index.js):
1. `app.set('trust proxy', 1)`: Enables accurate client IP detection behind Render reverse proxies.
2. `helmet()`: Applies standard secure HTTP response headers.
3. `cors(corsOptions)`: Restricts origins to localhost, production domains, and optional trusted Vercel preview regex patterns ([`corsConfig.js`](file:///Users/anurag/Developer/googleMe/server/utils/corsConfig.js)).
4. `rateLimit`:
   - `/api/`: General tier (100 req/15m in production).
   - `/api/admin/login`: Brute-force protection (10 attempts/15m with `skipSuccessfulRequests: true`).
   - `/api/contact` & `/api/feedback`: Submission tier (10 req/hour per IP).
5. Tiered Body Parsers:
   - `/api/config`: Up to `1 MB` JSON payload to support rich profile schemas.
   - All other routes: Up to `50 KB` JSON payload to mitigate memory flooding.
6. Route Handlers: Admin auth, config, projects, contact, feedback, github, images, medium.
7. Global Error Handlers: Intercepts payload size limits (`413 Payload too large`), JSON syntax errors (`400 Invalid JSON`), and hides internal error stacks in production.

### 6.2 Caching Strategy & Automatic Eviction
- **Site Configuration:** In-memory cached with a 60-second TTL in `server/routes/config.js`. Cleared immediately on administrative mutation via `invalidateCache()`.
- **GitHub Repositories:** In-memory cached with a 30-minute TTL in `server/routes/github.js`. Automatically cleared if the administrator alters `githubUsername`.
- **Medium RSS Feed:** In-memory cached with a 30-minute TTL in `server/routes/medium.js`. Automatically cleared if the administrator alters `mediumUsername`.

---

## 7. Database Models, Schemas & Indexes

All persistence operates via Mongoose on MongoDB Atlas. Models are defined in `server/models/`:

### 7.1 `SiteConfig` ([`SiteConfig.js`](file:///Users/anurag/Developer/googleMe/server/models/SiteConfig.js))
- Schema: `{ key: { type: String, required: true, unique: true }, value: mongoose.Schema.Types.Mixed }`.
- Purpose: Stores all CMS configuration (profile, bio, skills, education, experience, social links, page visibility, default theme).

### 7.2 `PortfolioConfig` ([`PortfolioConfig.js`](file:///Users/anurag/Developer/googleMe/server/models/PortfolioConfig.js))
- Schema: `{ key: { type: String, unique: true }, selectedRepos: [{ name: String, featured: Boolean, extraTags: [String] }] }`.
- Purpose: Tracks administrator-curated GitHub repositories and display order.

### 7.3 `GalleryImage` ([`GalleryImage.js`](file:///Users/anurag/Developer/googleMe/server/models/GalleryImage.js))
- Schema: `{ title: String, category: String, description: String, link: String, order: Number, imageUrl: String, publicId: String, imageData: String }`.
- Validation: Enforces WHATWG URL validation on `link`. Provides a virtual property `src` resolving `imageUrl` over legacy `imageData`.

### 7.4 `Contact` ([`Contact.js`](file:///Users/anurag/Developer/googleMe/server/models/Contact.js))
- Schema: `{ name: String, email: String, message: String, read: Boolean, idempotencyKey: String, requestHash: String }`.
- Indexes:
  ```javascript
  contactSchema.index(
    { idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
  );
  ```
  Guarantees duplicate submission protection while allowing legacy unkeyed submissions.

### 7.5 `Feedback` ([`Feedback.js`](file:///Users/anurag/Developer/googleMe/server/models/Feedback.js))
- Schema: `{ type: String, message: String, name: String, email: String, page: String, status: String, attachment: Object, idempotencyKey: String, requestHash: String }`.
- Indexes: Status indexed for admin filtering; partial unique index on `idempotencyKey`.

### 7.6 `IdempotencyRecord` ([`IdempotencyRecord.js`](file:///Users/anurag/Developer/googleMe/server/models/IdempotencyRecord.js))
- Schema: `{ scope: String, key: String, ownerToken: String, requestHash: String, status: String, responseStatus: Number, responseBody: Mixed, resourceId: Mixed }`.
- Indexes:
  - Unique compound index: `{ scope: 1, key: 1 }`.
  - Document expiration TTL index: `{ updatedAt: 1 }` with `expireAfterSeconds: 86400` (24 hours).

### 7.7 `Project` (Legacy) ([`Project.js`](file:///Users/anurag/Developer/googleMe/server/models/Project.js))
- Schema: `{ title, description, techStack, repoUrl, demoUrl, imageUrl, featured, order }`.
- Note: This model is no longer queried by the live API; projects are generated via `PortfolioConfig` + GitHub API.

---

## 8. API Specifications & External Integrations

For complete schema details, see [`docs/API.md`](file:///Users/anurag/Developer/googleMe/docs/API.md).

### 8.1 API Route Registry

| Method | Endpoint | Access | Responsibility |
|---|---|---|---|
| `GET` | `/api/health` | Public | Service health probe returning `{ status: 'ok', timestamp }`. |
| `POST` | `/api/admin/login` | Public (Rate-limited: 10/15m) | Authenticates password, returns HS256 JWT. |
| `POST` | `/api/admin/verify` | Public (Bearer token) | Validates active JWT signature and expiration. |
| `GET` | `/api/config` | Public (Cached: 60s) | Retrieves site metadata, profile, bio, toolkit, and visibility. |
| `POST` | `/api/config` | Admin | Updates single key or batch updates; invalidates cache. |
| `POST` | `/api/config/resume-upload` | Admin | Uploads PDF resume ($\le 5\text{ MB}$) to Cloudinary with magic-byte check. |
| `POST` | `/api/config/avatar-upload` | Admin | Uploads profile avatar ($\le 10\text{ MB}$) to Cloudinary with magic-byte check. |
| `GET` | `/api/projects` | Public | Returns curated portfolio projects from GitHub or `shared/projects.json`. |
| `GET` | `/api/github/repos` | Admin | Proxies public GitHub repositories (cached for 30m). |
| `POST` | `/api/github/selection` | Admin | Updates pinned repository curation and display order. |
| `GET` | `/api/medium` | Public (Cached: 30m) | Fetches and sanitizes Medium articles via RSS. |
| `POST` | `/api/contact` | Public (Rate-limited: 10/hr) | Submits contact message with attachments, idempotency, and dual email dispatch. |
| `POST` | `/api/feedback` | Public (Rate-limited: 10/hr) | Submits feedback with optional attachment and idempotency. |
| `GET` | `/api/feedback` | Admin | Paginated list of user feedback with filtering. |
| `PATCH` | `/api/feedback/:id/status` | Admin | Updates feedback status (`new`, `in-progress`, `resolved`). |
| `DELETE` | `/api/feedback/:id` | Admin | Deletes feedback record and triggers Cloudinary asset cleanup. |
| `GET` | `/api/images` | Public | Lists all gallery images. |
| `POST` | `/api/images` | Admin | Uploads gallery image to Cloudinary and persists record. |
| `PATCH` | `/api/images/:id` | Admin | Updates gallery metadata (title, category, link, order). |
| `DELETE` | `/api/images/:id` | Admin | Deletes gallery record and destroys Cloudinary asset. |

### 8.2 External Cloud Integrations
- **Cloudinary:** Media asset store for resumes, avatars, gallery pictures, and feedback screenshots. Media is transcoded to WebP with responsive breakpoints.
- **GitHub REST API (v3):** Fetches public repositories, stars, forks, and language breakdowns. Falls back to static fixtures in `shared/projects.json` if rate limits are exceeded.
- **Medium RSS Feed:** Ingests articles from `https://medium.com/feed/@{username}`.
- **Resend API & Nodemailer SMTP:** Dual-channel transactional email pipeline ([`emailService.js`](file:///Users/anurag/Developer/googleMe/server/utils/emailService.js)). Primary delivery attempts HTTP POST to Resend; if unconfigured or encountering delivery error, automatically falls back to Nodemailer SMTP (Gmail TLS on port 465).

---

## 9. Authentication, Authorization & Security (SEC-01 - SEC-24)

For detailed security controls, see [`docs/SECURITY.md`](file:///Users/anurag/Developer/googleMe/docs/SECURITY.md).

### 9.1 Summary of the 24 Security Controls
- **SEC-01 - SEC-05 (Rate Limiting & Abuse Prevention):** Multi-tier rate limiting via `express-rate-limit`; tiered body parsers (1 MB for config, 50 KB general); honeypot field (`_hp`) on submissions.
- **SEC-06 - SEC-10 (Binary Media Validation):** Inspects magic bytes in Multer memory buffers (`%PDF-`, `0xFF 0xD8 0xFF`, `0x89 0x50 0x4E 0x47`, `RIFF....WEBP`). Disguised executables (`MZ`, `ELF`, shell script `#!`) and scriptable SVGs are rejected.
- **SEC-11 - SEC-15 (Authentication & Cryptography):** Strict HS256 JWT validation rejecting algorithm switching; bcrypt password hashing with timing-safe checks; fail-fast server boot on missing secrets.
- **SEC-16 - SEC-20 (Sanitization & Encoding):** DOMPurify sanitization of Medium RSS content; stripping tracking pixels; strict sanitization of attachment filenames.
- **SEC-21 - SEC-23 (URL & Navigation Hardening):** WHATWG URL validation for gallery external links; Google Drive `/preview` URL normalization; Content Security Policy hash alignment.
- **SEC-24 (Distributed Idempotency Engine):** Distributed submission locks backed by `IdempotencyRecord` with worker lease fencing (120s lease), canonical byte-level SHA-256 payload hashing, duplicate side-effect suppression, and atomic E11000 collision recovery.

---

## 10. Infrastructure, Deployment & Edge Topology

For operational guides, see [`docs/DEPLOYMENT.md`](file:///Users/anurag/Developer/googleMe/docs/DEPLOYMENT.md).

### 10.1 Edge & Cloud Architecture
```
Internet / End User
       │
       ├───► HTTPS: www.anuragjaiswal.me
       │     │
       │     ▼
       │  Vercel Global Edge Network
       │  ├── Single Page Application (React 18 + Vite)
       │  ├── Rewrites: /resume.pdf -> /Resume_aj.pdf; /(.*) -> /index.html
       │  ├── Security Headers (CSP, X-Frame-Options: DENY, HSTS)
       │  └── Precompressed Assets (Brotli & Gzip)
       │
       └───► HTTPS: googleme.onrender.com/api
             │
             ▼
          Render Web Service (Node.js + Express)
          ├── Reverse Proxy with Trust Proxy (1 hop)
          ├── Helmet Headers & CORS Allowlist
          ├── Tiered Rate Limiting & Body Parsers
          ├── MongoDB Atlas Cluster (Persistent State)
          └── Cloudinary Media CDN (Image Storage & Optimization)
```

### 10.2 Cold-Start Mitigation
Render free-tier compute instances spin down after 15 minutes of inactivity. Mitigation:
1. External uptime monitor (such as UptimeRobot) pings `https://googleme.onrender.com/api/health` every 5 minutes.
2. Frontend Axios client in [`client/src/api/index.js`](file:///Users/anurag/Developer/googleMe/client/src/api/index.js#L75-L89) intercepts submission timeouts, pings `/api/health`, and retries with the identical idempotency key.

---

## 11. Environment Configuration Requirements

For setup instructions, see [`docs/CONFIGURATION.md`](file:///Users/anurag/Developer/googleMe/docs/CONFIGURATION.md).

### 11.1 Server Environment (`server/.env`)
| Variable | Required | Default / Format | Description |
|---|---|---|---|
| `PORT` | Optional | `5000` | HTTP port for the Express API server. |
| `NODE_ENV` | Optional | `development` | Governs rate limits and error stack exposure. |
| `MONGO_URI` | **Required** | `mongodb://...` | MongoDB connection URI. **Fail-fast requirement.** |
| `ALLOWED_ORIGINS` | Optional | `http://localhost:3000,http://localhost:5173` | Comma-separated CORS allowed origins. |
| `VERCEL_PREVIEW_PATTERN` | Optional | Regex string | Trusted pattern for dynamic Vercel preview URLs. |
| `JWT_SECRET` | **Required** | 48-byte hex string | Secret used to sign HS256 tokens. **Fail-fast requirement.** |
| `ADMIN_PASSWORD_HASH` | **Required** | bcrypt hash string | Hash of admin password for `/admin`. **Fail-fast requirement.** |
| `GITHUB_USERNAME` | Optional | `anurag-jaiswal-aj` | GitHub username for repository syncing. |
| `GITHUB_TOKEN` | Optional | Personal Access Token | Increases GitHub API rate limits from 60 to 5,000 req/hr. |
| `RESEND_API_KEY` | Optional | `re_...` | API key for primary transactional email delivery. |
| `RESEND_FROM` | Optional | `Portfolio <noreply@...>` | Verified sender email for Resend. |
| `EMAIL_HOST` | Optional | `smtp.gmail.com` | SMTP host for fallback email delivery. |
| `EMAIL_PORT` | Optional | `465` | SMTP port (`465` for SSL/TLS, `587` for STARTTLS). |
| `EMAIL_USER` | Optional | Email address | SMTP username for fallback delivery. |
| `EMAIL_PASS` | Optional | App Password | SMTP application password. |
| `EMAIL_TO` | Optional | Email address | Destination inbox to receive inquiries and feedback. |
| `CLOUDINARY_CLOUD_NAME` | Optional | String | Cloudinary cloud name for media hosting. |
| `CLOUDINARY_API_KEY` | Optional | String | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Optional | String | Cloudinary API secret. |

### 11.2 Client Environment (`client/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Optional | `http://localhost:5000/api` | API backend base URL. Auto-falls back to `https://googleme.onrender.com/api` on production domains. |

### 11.3 Secret Generation Commands
```bash
# Generate high-entropy 48-byte JWT Secret:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate bcrypt hash for ADMIN_PASSWORD_HASH:
node -e "require('bcryptjs').hash('your_secure_password', 10).then(console.log)"
```

---

## 12. Automated Testing, CI Pipeline & Quality Checks

For complete suite breakdowns, see [`docs/TESTING.md`](file:///Users/anurag/Developer/googleMe/docs/TESTING.md).

### 12.1 Test Execution Commands
```bash
# Run both client and server test suites from workspace root (390 tests total):
npm test

# Run all 157 client tests:
npm run test:client
# or: cd client && npm test

# Run all 233 server tests (requires local MongoDB on port 27017 for integration tests):
npm run test:server
# or: cd server && npm test

# Run Vite client build verification:
cd client && npm run build

# Run server syntax inspection:
cd server && node --check index.js && node --check scripts/seed.js
```

### 12.2 Test Suite Breakdown (390 Tests across 17 Files)
- **Client Tests (157 passed):**
  - `test-sanitizer.js` (9): DOMPurify HTML sanitization and tracking pixel removal.
  - `test-bio.js` (14): Markdown parsing, bio snippet extraction, text normalization.
  - `test-tools.js` (17): Developer toolkit category normalization and sorting.
  - `test-batch1.js` (32): Core UI helpers, date formatting, sitelinks.
  - `test-visibility.js` (20): Dynamic route visibility toggles and `/all` fallbacks.
  - `test-batch3.js` (33): Education canonicalization, AI chat pattern replies, WHATWG URLs, and form control accessibility audit assertions.
  - `test-avatar.js` (6): 3D interactive flip avatar rendering and accessibility.
  - `test-theme.js` (12): Theme normalization, media queries, safe localStorage.
  - `test-resume.js` (8): Resume link resolution, Google Drive `/preview`, CSP hash check.
  - `test-idempotency.js` (6): RFC 4122 v4 UUID generation, rapid click suppression.
- **Server Tests (233 passed):**
  - `test-upload.js` (16): Multer memory buffer validation and binary magic-byte inspection.
  - `test-phase1.js` (80): Admin authentication, HS256 JWT validation, timing-safe checks.
  - `test-visibility-config.js` (9): SiteConfig schema validation and visibility persistence.
  - `test-tools-config.js` (16): Developer tools validation and boundary errors.
  - `test-config-validation.js` (47): Bio, education, experience schemas, URL regex rules.
  - `test-security-remediation.js` (35): Tiered body parsers (1 MB vs 50 KB), CORS preview regex matching.
  - `test-idempotency.js` (30): Real MongoDB integration testing SEC-24 worker lease fencing and E11000 collision recovery.

### 12.3 GitHub Actions CI Workflow ([`.github/workflows/ci.yml`](file:///Users/anurag/Developer/googleMe/.github/workflows/ci.yml))
- Runner: `ubuntu-latest` on Node.js 22.
- Service Container: Dedicated `mongo:6.0` container on port 27017 with container health checks.
- Steps: Checkout $\to$ Node 22 setup with npm cache $\to$ `npm ci` in `client` $\to$ `npm test` in `client` $\to$ `npm run build` in `client` $\to$ `npm ci` in `server` $\to$ `node --check index.js` in `server` $\to$ `npm test` in `server`.

---

## 13. Architectural Decisions & Technical Debt

### 13.1 Key Architectural Decisions
1. **Zero External Test Dependencies:** Eliminating Jest/Mocha in favor of `node:test` keeps repository footprint minimal and eliminates supply chain risks.
2. **Dynamic GitHub Selection over Local Schema:** Projects are dynamically synced from GitHub via `PortfolioConfig` rather than stored in a separate local database table, ensuring star counts and repos remain up to date.
3. **Dual-Channel Resilient Email Delivery:** Coupling Resend HTTP API with Nodemailer SMTP fallback ensures contact form delivery succeeds even during transactional email provider outages.
4. **Client-Side AI Pattern Matching:** Avoids costly third-party LLM API keys and token rate limits while answering common questions about bio, skills, and projects with zero latency.

### 13.2 Maintenance Pass & Resolved Defects

#### Resolved in Recent Maintenance Pass
1. **Root `test` Scripts Added (`package.json`):**
   - Added `"test": "npm run test:client && npm run test:server"`, `"test:client": "cd client && npm test"`, and `"test:server": "cd server && npm test"` to root `package.json`. Running `npm test` from root executes both suites.
2. **Fixed Seed Script Imports (`server/scripts/seed.js`):**
   - Corrected relative paths to `../models/Project` and `../../shared/projects.json`.
3. **Aligned Vite Development Proxy Port (`client/vite.config.js`):**
   - Updated proxy target to `http://localhost:5000` to match default backend port and documentation.
4. **Corrected Architecture Documentation (`docs/ARCHITECTURE.md`):**
   - Updated Lighthouse audit scores citation to `(98/94/96/100)`.
   - Clarified `IdempotencyRecord` lifecycle: 24-hour collection retention TTL index vs. 120-second in-progress worker lease duration.
5. **Remediated Accessibility Label Gaps:**
   - Added explicit `aria-label` or `id`/`htmlFor` associations across `Home.jsx`, `SearchLayout.jsx`, `Contact.jsx`, and `BugReportModal.jsx`.
   - Added regression test assertions in `client/test-batch3.js`.

#### Potential Architectural Improvements
1. **Retire or Modernize `Project.js` Mongoose Model:**
   - [`server/models/Project.js`](file:///Users/anurag/Developer/googleMe/server/models/Project.js) is unused by the application. It should either be safely removed or modernized alongside `seed.js`.
2. **Horizontal Scaling Cache Layer:**
   - In-memory caches for configuration, GitHub, and Medium are per-process. Scaling to multiple instances would require Redis.
3. **Multi-Factor Admin Authentication:**
   - Admin panel currently relies on a single master password. MFA or WebAuthn would strengthen access security.

---

## 14. Current Implementation Status & Roadmap

### 14.1 Verified Implementation State
- Core SERP portfolio UI: 100% complete and verified.
- Headless CMS (`/admin`): 100% complete and verified across 10 functional tabs.
- Automated tests: 100% passing (390/390 across 17 test files).
- Edge deployment: Active and healthy on Vercel and Render.

### 14.2 Documented Project Roadmap ([`docs/LIMITATIONS.md`](file:///Users/anurag/Developer/googleMe/docs/LIMITATIONS.md#L44-L50))
- [ ] **Rich Project Case Studies:** Dedicated routes (`/projects/:slug`) featuring technical retrospectives and media galleries.
- [ ] **Native CMS Blogging:** Direct authoring and preview of Markdown articles inside `/admin`.
- [ ] **Admin Visitor Analytics:** Lightweight, privacy-first query and visitor telemetry dashboard.
- [ ] **Interactive GitHub Activity Matrix:** Visual contribution heatmap on the About tab.

---

## 15. Known Issues & Deferred Work

### 15.1 Resolved Items
- **Form Controls Accessibility:** Explicit label associations and `aria-label` attributes have been added across `Home.jsx`, `SearchLayout.jsx`, `Contact.jsx`, and `BugReportModal.jsx`.
- **Root Test Script:** Root `package.json` has `npm test`, `npm run test:client`, and `npm run test:server`.
- **Seed Script Imports:** Fixed relative paths in `server/scripts/seed.js`.
- **Vite Proxy Port:** Set to port 5000 in `client/vite.config.js`.
- **Architecture Documentation:** Updated Lighthouse scores and TTL descriptions in `docs/ARCHITECTURE.md`.

### 15.2 Remaining Operational Considerations
- `server/models/Project.js` remains an unreferenced legacy Mongoose schema (intended for future offline project caching or safe deprecation).
- Local macOS environments with AirPlay Receiver listening on port 5000 may set `PORT=5001` in local `.env` and configure `client/vite.config.js` or `VITE_API_URL` accordingly.

---

## 16. Git History & Recent Critical Changes

### 16.1 Repository State
- **Branch:** `main`
- **Synchronized with:** `origin/main`
- **Latest Commit Hash:** `26d6fc66da1a468e54ce07494500817b4336bc85`
- **Latest Commit Message:** `docs: refresh Lighthouse audit snapshot`
- **Working Tree:** Clean

### 16.2 Key Recent Commits
- `26d6fc6`: Refreshed root `lighthouse.png` and updated scores in `README.md`.
- `a84e5ae`: Improved Mermaid architecture diagram readability and fallback edges.
- `a6325b5`: Streamlined Mermaid architecture diagram for compact layout.
- `736afb3`: Added initial Mermaid system architecture diagram.
- `a953f13`: Reorganized project documentation into modular `docs/` structure.
- `5e1464b`: Aligned CI workflow with Node.js 22 runtime.
- `d82dcb9`: Added isolated `mongo:6.0` service container to CI.
- `d8a9ba9`: Added real-MongoDB integration tests for SEC-24 E11000 concurrency recovery.
- `846b42b`: Implemented distributed idempotency engine (SEC-24) for contact and feedback.

---

## 17. Safe Development & Release Protocol

### 17.1 Development Rules
1. **Preserve Existing Work:** Never overwrite or discard existing features without understanding their design. Do not refactor unrelated modules.
2. **Git Safety:** Never execute `git reset --hard` or `git clean`. Inspect diffs before committing. Do not stage unrelated changes.
3. **Production Safety:** Never modify production databases, cloud service settings, or secrets without explicit authorization. Never print credentials in terminal logs or reports.
4. **Validation Prior to Commit:** Always run both client and server test suites and verify production Vite build before committing:
   ```bash
   npm test
   cd client && npm run build
   cd server && node --check index.js && node --check scripts/seed.js
   ```

---

## 18. Remaining Operational Unknowns

1. **Active Node.js Container on Render:**
   - Render selects the active Node.js version via service dashboard settings or environment overrides. While the engine target is Node 22 and CI enforces Node 22, the active runtime container in production cannot be verified from Git configuration alone.
2. **Production MongoDB Atlas State:**
   - Active database records (bio content, gallery uploads, feedback submissions) exist in cloud persistence and cannot be inspected from the repository.
3. **Uptime Monitoring Dashboard:**
   - The health ping schedule (UptimeRobot) is managed via an external web service dashboard outside version control.

