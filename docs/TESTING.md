# Automated Testing & CI Pipeline

This document details the test architecture, test execution commands, test count reconciliation, and continuous integration pipeline for **googleMe**.

For architectural context, see [Architecture](ARCHITECTURE.md). For security remediation tests, see [Security Hardening](SECURITY.md).

---

## 1. Test Architecture Overview

googleMe relies on the **Node.js native test runner** (`node:test` and `node:assert`). This design decision eliminates heavy external testing dependencies (such as Jest or Mocha), reducing supply chain surface area, improving test startup performance, and ensuring consistent execution across local development and CI environments.

- **Zero Test Dependencies:** Tests run directly on vanilla Node.js.
- **Total Test Baseline:** **386 Automated Tests** across 17 test files.
- **Failures:** **0** (`pass 386`, `fail 0`).

---

## 2. Test Execution Commands

### Running All Client Tests
Executes all 10 frontend test suites (153 tests):
```bash
cd client
npm test
```

### Running All Server Tests
Executes all 7 backend test suites (233 tests):
```bash
cd server
npm test
```

### Running Individual Test Suites
You can run any individual test file directly using Node.js:
```bash
# Example: Run client idempotency tests
node client/test-idempotency.js

# Example: Run server idempotency tests against a local MongoDB instance
MONGO_URI=mongodb://localhost:27017/gfolio_test node server/test-idempotency.js
```

---

## 3. Comprehensive Test Breakdown

### Client-Side Test Suites (153 Tests across 10 Files)

| Test File | Test Cases Passed | Test Focus & Verification Scope |
|---|---|---|
| `test-sanitizer.js` | 9 | DOMPurify HTML sanitization, script tag removal, tracking pixel stripping |
| `test-bio.js` | 14 | Markdown parsing, bio snippet extraction, and text normalization |
| `test-tools.js` | 17 | Developer tools category normalization, fallback behavior, and sorting |
| `test-batch1.js` | 32 | Core UI helpers, date formatting, sitelinks, and link utilities |
| `test-visibility.js` | 20 | Dynamic route visibility toggles, search fallback to `/all`, auth routing |
| `test-batch3.js` | 29 | Education canonicalization, AI chat pattern replies, WHATWG URLs |
| `test-avatar.js` | 6 | 3D interactive flip avatar state and accessibility compliance |
| `test-theme.js` | 12 | Dark/light theme normalization, OS media queries, safe localStorage |
| `test-resume.js` | 8 | Resume link resolution, Google Drive `/preview` rewrite, CSP hash verification |
| `test-idempotency.js` | 6 | Client RFC 4122 v4 UUID generation, header injection, and button click locks |
| **Subtotal** | **153 Passed** | **10 Client Test Files (0 Failures)** |

### Server-Side Test Suites (233 Tests across 7 Files)

| Test File | Test Cases Passed | Test Focus & Verification Scope |
|---|---|---|
| `test-upload.js` | 16 | Multer memory storage, buffer handling, and binary magic-byte inspection |
| `test-phase1.js` | 80 | Admin authentication, HS256 JWT validation, bcrypt security, timing-safe checks |
| `test-visibility-config.js` | 9 | SiteConfig schema validation, default fallback values, and visibility persistence |
| `test-tools-config.js` | 16 | Developer tools category validation and boundary error conditions |
| `test-config-validation.js` | 47 | Bio, education, experience, social link schemas, and URL regex rules |
| `test-security-remediation.js` | 35 | Tiered JSON body parsing (1MB vs 50KB) and CORS preview regex matching |
| `test-idempotency.js` | 30 | Real MongoDB distributed idempotency, worker lease fencing, collision recovery |
| **Subtotal** | **233 Passed** | **7 Server Test Files (0 Failures)** |

---

## 4. Test Count Reconciliation

To maintain technical credibility, the exact counts reported in this repository reflect actual `node:test` execution blocks:

- **Client Tests (153 Tests):** The 10 files declared in `client/package.json` report exactly 153 tests passed when executed via `npm test`. Earlier historical mentions of 175 or 178 tests arose from counting discrete assertions rather than top-level `node:test` execution blocks.
- **Server Tests (233 Tests):** The 7 files declared in `server/package.json` report exactly 233 tests passed when executed via `npm test`. Earlier historical mentions of 112 tests reflected partial test runs executed before `test-config-validation` (47), `test-security-remediation` (35), and `test-idempotency` (30) were incorporated.
- **Total:** Exactly **386 tests** run and pass across the two workspaces.

---

## 5. GitHub Actions Continuous Integration (CI)

The CI pipeline is defined in `.github/workflows/ci.yml`. It runs automatically on pushes and pull requests to `main` and `master`.

### Runner Environment
- **Operating System:** `ubuntu-latest`
- **Node.js Version:** 22 (`node-version: 22`), aligned with `server/package.json` engine requirements (`>=22.22.0 <23.0.0`).
- **Database Service Container:** A dedicated `mongo:6.0` container starts on port `27017` with container health checks (`mongosh --eval 'db.adminCommand({ ping: 1 })'`).

### Pipeline Stages
1. **Checkout & Environment Setup:** Checks out the repository and installs Node.js 22 with npm cache enabled.
2. **Client Validation:**
   - `npm ci` in `client/`
   - `npm test` in `client/` (153 tests)
   - `npm run build` in `client/` (validates Vite bundle generation, chunk splitting, and PWA precaching)
3. **Server Validation:**
   - `npm ci` in `server/`
   - `node --check index.js` (static syntax inspection)
   - `npm test` in `server/` (233 tests executed against the isolated MongoDB service container)

---

## 6. Testing Strategy Limitations

- **No Browser E2E Automation:** The test suite does not include heavy browser automation frameworks (e.g., Cypress or Playwright). UI logic is verified via unit and DOM-mocked integration tests.
- **Mocked External APIs:** Third-party cloud services (Cloudinary upload streams and Resend transactional email endpoints) are mocked or verified via fallback logic during unit runs. Live end-to-end cloud dispatch is verified via manual staging smoke tests.
