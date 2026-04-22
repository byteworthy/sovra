# Production Readiness Checklist

Use this before promoting Sovra changes to production.

## 1. Platform reliability

- [ ] `CI` workflow is green on target commit.
- [ ] Web quality gates pass: lint, typecheck, test, build.
- [ ] Worker quality gates pass: vet, test, build.
- [ ] Health checks verified in target environment:
  - [ ] `/api/health` (web) returns `status: "ok"` with configured checks
  - [ ] `/health` (worker)
- [ ] Rolling restart behavior verified (graceful shutdown confirmed).

## 2. Security baseline

- [ ] `INTERNAL_API_SECRET` set in web + worker.
- [ ] `SUPABASE_JWT_SECRET` set in worker.
- [ ] `SOCKETIO_ALLOWED_ORIGINS` explicitly configured (no `*` in production).
- [ ] Middleware/API auth behavior validated (`/api/*` unauthenticated requests return JSON `401`, not redirects).
- [ ] No unresolved critical/high security alerts.
- [ ] `security.yml` workflow green.
- [ ] `scorecard.yml` workflow green.

## 3. AI provider readiness

- [ ] At least one provider key configured (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `HUGGINGFACE_API_KEY`).
- [ ] If using Hugging Face:
  - [ ] `HUGGINGFACE_BASE_URL` validated (`https://router.huggingface.co/v1` unless intentionally overridden).
  - [ ] `HUGGINGFACE_ROUTING_POLICY` chosen (`fastest`, `cheapest`, `preferred`, or explicit provider suffixes).
- [ ] At least one fallback provider configured for incident response.

## 4. Data safety and tenant isolation

- [ ] Latest migrations applied.
- [ ] RLS policies active on tenant tables.
- [ ] Cross-tenant access checks pass for critical flows.
- [ ] Backup/restore process validated for the current release cycle.

## 5. Observability and operations

- [ ] Sentry configured and receiving events.
- [ ] PostHog configured (or explicitly disabled by policy).
- [ ] On-call escalation path documented.
- [ ] Operations runbook reviewed: `docs/operations-runbook.md`.

## 6. Documentation and release integrity

- [ ] `CHANGELOG.md` updated under `## [Unreleased]`.
- [ ] Env var changes reflected in:
  - [ ] `.env.example`
  - [ ] `packages/web/.env.example`
  - [ ] `docs/environment-variables.md`
- [ ] `release-readiness` workflow passes.

## Release gate

A commit is release-ready only when:

1. CI + Security + Release Readiness are all green.
2. Production checklist above is fully checked.
3. Rollback path for the release is documented and tested.
