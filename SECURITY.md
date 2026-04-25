# Security Policy

## Supported versions

Sovra follows semantic versioning. The latest `1.x` minor receives security fixes.

| Version | Supported |
|---|---|
| 1.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

Do not open public issues for vulnerabilities.

Report via:

- GitHub security advisory (preferred), or
- email: `security@byteworthy.io`

Include:

- impact summary
- reproduction steps / PoC
- affected version or commit
- suggested mitigation (if known)

Response targets:

- acknowledgment within 48 hours
- triage update within 7 days
- mitigation/fix guidance for high severity within 30 days

## Scope

In scope:

- Authentication, authorization, and tenant isolation
- RLS policy correctness in `supabase/migrations`
- Worker internal auth boundaries (`/internal/broadcast`, `/mcp`)
- Common web vulnerabilities (SQLi, XSS, CSRF, SSRF, path traversal)
- Secret leakage in logs/build artifacts/client bundles

Out of scope:

- CVEs in third-party dependencies without Sovra-specific exploit path
- Social engineering attacks
- Issues requiring compromised admin credentials to exploit

## Operator hardening checklist

Before production deployment:

- [ ] Set strong `INTERNAL_API_SECRET` (web + worker).
- [ ] Set `SUPABASE_JWT_SECRET` in worker.
- [ ] Set explicit `SOCKETIO_ALLOWED_ORIGINS` (no wildcard in production).
- [ ] Keep Supabase service-role credentials server-only.
- [ ] Enable HTTPS/HSTS at ingress.
- [ ] Enable Sentry and alert routing for production incidents.
- [ ] Enable dependency/security scanning in CI.
- [ ] Run release checks (`./scripts/ci/release-readiness-checks.sh`).

## Dependency and code scanning

Sovra ships scheduled security checks for:

- CodeQL
- gitleaks
- OSV dependency scan
- `govulncheck`
- semgrep
- Go fuzzing targets (`.github/workflows/fuzz.yml`)
- OpenSSF Scorecard

See `.github/workflows/security.yml`.
See `.github/workflows/scorecard.yml`.
