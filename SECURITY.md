# Security Policy

## Supported Versions

Sovra follows semantic versioning. The latest minor release receives security patches.

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please use GitHub Security Advisories (preferred) or email **security@byteworthy.io** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, proof-of-concept, or exploit code if available.
- Affected version(s) and commit SHA if known.
- Your preferred credit attribution (or request anonymity).

We commit to:

- Acknowledging your report within **48 hours**.
- Providing a triage assessment within **7 days**.
- Issuing a fix or mitigation guidance within **30 days** for high-severity issues.
- Publishing a coordinated advisory via GitHub Security Advisories once a fix is available.

## Scope

In scope:

- Authentication, authorization, and tenant isolation (RLS) in `packages/web` and `packages/worker`.
- SQL injection, XSS, CSRF, SSRF, path traversal, prototype pollution.
- Supabase RLS policies shipped in `supabase/migrations/`.
- Secret exposure in logs, client bundles, or build artifacts.

Out of scope:

- Third-party dependencies with published CVEs (report upstream; we track via Dependabot).
- Denial-of-service through resource exhaustion on self-hosted instances (operator configuration).
- Social engineering against ByteWorthy or its contributors.
- Issues that require a compromised admin account to exploit.

## Hardening Checklist for Operators

Before deploying Sovra to production:

- [ ] Set a strong, rotated `ENCRYPTION_KEY` (≥ 32 bytes, stored in a secret manager).
- [ ] Enable Supabase Row-Level Security on all tables (verified by the shipped migrations).
- [ ] Restrict service-role keys to server-only runtime; never expose to the browser.
- [ ] Enable Upstash Redis rate limiting (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- [ ] Enable Sentry (`SENTRY_DSN`) and PostHog for observability.
- [ ] Enforce HTTPS and HSTS at the edge.
- [ ] Review `middleware.ts` CSP before enabling custom integrations.
- [ ] Run `pnpm audit` on each upgrade.

## Cryptography

Sovra encrypts sensitive fields at rest. Do not replace with custom crypto. If a new primitive is needed, prefer [Google Tink](https://github.com/google/tink) or [Themis](https://github.com/cossacklabs/themis) rather than hand-rolling.
