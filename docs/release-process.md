# Release Process

This document defines how Sovra changes move from PR to production.

## Branch and merge model

- `main` is the release branch.
- Changes land through reviewed PRs.
- Required checks: `CI`, `Security`, and `Release Readiness`.
- Merge automation should only merge when all required checks are green.

## Pre-release validation

Run from repo root:

```bash
pnpm install
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @sovra/web build
pnpm go:test
pnpm go:build
./scripts/ci/release-readiness-checks.sh
```

## Versioning and changelog

1. Keep in-flight work under `## [Unreleased]` in `CHANGELOG.md`.
2. At release time, cut a version section with date:
   - `## [X.Y.Z] - YYYY-MM-DD`
3. Tag releases with annotated tags:

```bash
git tag -a vX.Y.Z -m "Sovra vX.Y.Z"
git push origin vX.Y.Z
```

## Staging verification

Before production deploy:

1. Deploy web + worker to staging.
2. Validate critical paths:
   - Auth + tenant access
   - Workspace realtime join/broadcast
   - MCP endpoint auth and tool execution
   - Admin system health page
3. Monitor logs/errors for at least 30 minutes.

## Production rollout

Recommended order:

1. Deploy worker.
2. Deploy web.
3. Apply additive migrations.
4. Verify health endpoints and realtime collaboration paths.

## Rollback policy

If a critical regression is detected:

1. Roll back web and/or worker to last known-good build.
2. Disable risky feature toggles if available.
3. Record incident timeline and owner.
4. Ship fix-forward patch with regression tests.

Avoid destructive DB rollback. Prefer forward migrations restoring compatibility.

