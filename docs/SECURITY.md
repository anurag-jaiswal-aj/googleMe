# Security Hardening & Controls

This document details the defense-in-depth security architecture, the SEC-01 through SEC-24 remediation program, the distributed idempotency engine, and threat considerations for **googleMe**.

For API schemas, see [API Reference](API.md). For deployment and infrastructure security, see [Deployment](DEPLOYMENT.md).

---

## 1. The SEC-01 through SEC-24 Hardening Program

The codebase has undergone structured security remediations spanning 24 targeted controls:

| Range | Domain | Target Controls |
|---|---|---|
| **SEC-01 - SEC-05** | **Rate Limiting & Abuse Prevention** | Multi-tiered `express-rate-limit`: general traffic (100 req/15m in prod), login brute-force prevention (10 attempts/15m), and public submissions (10 submissions/hour). Standard headers enabled. |
| **SEC-06 - SEC-10** | **Binary Media Validation** | Magic-byte signature inspection on Multer memory buffers (`server/utils/attachmentValidation.js` & `server/utils/imageValidation.js`). Rejects disguised executables, polyglot SVGs, and MIME-spoofed files. |
| **SEC-11 - SEC-15** | **Authentication & Cryptography** | Strict HS256 JWT validation rejecting algorithm switching (`none` or RS256 confusion). `ADMIN_PASSWORD_HASH` verified via `bcryptjs` with timing-safe comparisons. Fail-fast server startup on missing secrets. |
| **SEC-16 - SEC-20** | **Input Sanitization & Output Encoding** | DOMPurify sanitization on external Medium RSS feeds, stripping inline scripts, event handlers (`onerror`, `onload`), and tracking pixels. Tiered body parsers (1 MB for config, 50 KB general). |
| **SEC-21 - SEC-23** | **URL & Navigation Hardening** | WHATWG URL validation for gallery external links: rejects `javascript:`, `data:`, `vbscript:`, protocol-relative `//`, and embedded credentials (`user:pass@host`). Enforces `rel="noopener noreferrer"`. Resume Drive link preview sanitization. |
| **SEC-24** | **Distributed Idempotency Engine** | Distributed submission idempotency backed by MongoDB `IdempotencyRecord`, featuring owner token fencing, byte-level SHA-256 payload hashing, 120-second lease expiration, and duplicate side-effect suppression. |

---

## 2. Distributed Idempotency & Worker Lease Fencing (SEC-24)

### Problem Statement
When submitting contact inquiries or feedback over volatile mobile networks, users often experience network timeouts or repeatedly tap submit buttons. Naive implementations risk duplicate database records, repeated email notifications, or orphaned file uploads on third-party storage services.

### Architecture & Lifecycle
The engine (`server/utils/idempotency.js` and `server/models/IdempotencyRecord.js`) enforces state transitions across four key phases:

```
Client Request
      │  (Includes Idempotency-Key: <UUIDv4>)
      ▼
Compute SHA-256 Payload Hash (Body + Byte Buffers)
      │
      ├───────────────────────────────┬───────────────────────────────┐
      ▼                               ▼                               ▼
[New Key]                      [Matching Key: in-progress]     [Matching Key: completed]
Insert IdempotencyRecord        Check Worker Lease              Compare Request Hash
State: in-progress (TTL 120s)   ├── Active: Return 409 Conflict ├── Match: Return Cached 200/201
OwnerToken: <crypto-random>     └── Expired: Reclaim Lease      └── Mismatch: Return 422 Unprocessable
      │
Execute Controller Logic
      │
Verify isClaimOwner()
      ├── Owner Verified: Dispatch Email & Update Record to 'completed'
      └── Lease Lost: Suppress Email Notification & Abort
```

### Core Mechanisms
1. **Key Validation:** Rejects malformed keys. Only keys matching `^[A-Za-z0-9_.-]{1,128}$` (standard RFC 4122 v4 UUIDs) are accepted.
2. **Canonical Payload Hashing:** Computes a SHA-256 hash over sorted JSON body fields and raw binary attachment buffers. If a second request arrives with the same key but different content, the server rejects it with `422 Unprocessable Entity`.
3. **Atomic State Claims:** Uses atomic MongoDB operations (`findOneAndUpdate` with `upsert`) to claim the key in an `in-progress` state and generate a unique `ownerToken`.
4. **Worker Lease Fencing:** If an operation takes longer than the 120-second lease duration, another worker can reclaim the record. Before executing external side effects (like dispatching emails), the worker executes `isClaimOwner()`. If ownership was lost, email dispatch is suppressed.
5. **Collision Recovery:** If parallel workers attempt simultaneous creation, MongoDB unique index collisions (`E11000`) cause the losing worker to wait and safely return the winning worker's cached response, deleting any orphaned Cloudinary upload buffers.

### Reality Note on Side-Effect Guarantees
Database persistence and external email APIs (Resend, Nodemailer SMTP) are separate distributed systems that do not participate in a single atomic two-phase transaction. Consequently:
- Worker lease fencing provides **at-most-once delivery suppression** rather than a theoretical two-phase distributed guarantee.
- Under extreme network partition conditions where email dispatch succeeds but the database update fails, an automated retry may be suppressed by design.

---

## 3. Authentication & Authorization Model

- **Single Administrator:** Access to `/admin` is governed by a master password hashed with bcrypt (`ADMIN_PASSWORD_HASH`).
- **HS256 JSON Web Tokens:** Upon successful login, the server issues a JWT signed with `JWT_SECRET`. Middleware strictly validates the `alg` header to ensure it matches `HS256`.
- **Fail-Fast Initialization:** If `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, or `MONGO_URI` are undefined or malformed, the Express server refuses to bind to its port and exits immediately with an error log.

---

## 4. Media & File Upload Hardening

### Magic-Byte Header Verification
MIME types declared in HTTP multipart headers can be trivially spoofed. Before saving any upload or streaming it to Cloudinary, the server reads the initial bytes of the buffer:

| Format | Magic-Byte Signature | Validation Rule |
|---|---|---|
| **PDF** | `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`) | Required for `/api/config/resume-upload` and PDF attachments |
| **JPEG** | `0xFF 0xD8 0xFF` | Validated for avatar, gallery, and contact attachments |
| **PNG** | `0x89 0x50 0x4E 0x47` | Validated for avatar, gallery, and contact attachments |
| **WebP** | `RIFF....WEBP` | Validated for avatar, gallery, and contact attachments |

Any file containing executable headers (`MZ`, `ELF`, shell script `#!`), SVG vectors containing XML scripts, or unrecognized byte patterns is rejected with `400 Bad Request`.

---

## 5. Input Sanitization & URL Canonicalization

### External RSS Sanitization
Medium articles ingested via RSS contain third-party HTML. In `client/src/utils/sanitizeHtml.js`, DOMPurify sanitizes content before rendering:
- Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, and `<form>` tags.
- Removes all inline event handlers (`onclick`, `onerror`, `onload`).
- Strips 1x1 tracking pixels and insecure image schemes.

### WHATWG URL Canonicalization
In `client/src/utils/galleryUrl.js`, external links provided for gallery items are parsed using the native WHATWG `URL` constructor:
- Strips embedded credentials (`user:pass@host`).
- Disallows `javascript:`, `data:`, `vbscript:`, and protocol-relative `//` URLs.
- Requires standard `http:` or `https:` schemes.
- All rendered external links enforce `target="_blank"` and `rel="noopener noreferrer"`.

---

## 6. Known Security Limitations & Threat Considerations

1. **Single-Admin Credential Model:** The administrative system uses a single master password rather than individual user accounts or role-based access control (RBAC). A compromise of the admin password grants complete portfolio modification rights.
2. **In-Memory Cache Scope:** Cache stores for GitHub and Medium are per-process in-memory structures. In a multi-instance autoscaled backend, cache invalidation would require a shared cache (such as Redis).
3. **Side-Effect Atomicity:** As noted in Section 2, transactional email delivery is not atomically bound to database transactions.
