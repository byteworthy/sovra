# Operations Runbook

Recurring checks for production Sovra operators.

## Daily checks

1. Verify core health endpoints:
   - Web: `GET /api/health` returns `status: "ok"` and no `missing_config` checks
   - Worker: `GET /health`
2. Review error monitoring (Sentry) for new high-severity issues.
3. Review security signals:
   - Secret scanning alerts
   - Code scanning alerts
   - Dependency alerts
4. Confirm background workflows are green (`CI`, `Security`, `Deploy`).

## Weekly checks

1. Run dependency hygiene checks:
   - `pnpm audit --prod`
   - Review Dependabot updates
2. Validate DB migration and policy state in staging + production.
3. Spot-check tenant isolation in critical read/write paths.
4. Review worker logs for auth failures and broadcast errors.

## Monthly checks

1. Rotate and validate shared secrets:
   - `INTERNAL_API_SECRET`
   - `SUPABASE_JWT_SECRET`
2. Review release process and rollback readiness.
3. Run a recovery drill:
   - Re-deploy from clean commit
   - Validate health + core flows
4. Check docs drift:
   - `README.md`
   - `docs/environment-variables.md`
   - `docs/deployment.md`

## Incident priorities

| Priority | Typical impact | Target response |
|---|---|---|
| `P1` | Full outage, security incident, or cross-tenant data risk | Immediate |
| `P2` | Major degradation with business impact | < 4 hours |
| `P3` | Partial degradation with workaround | < 1 business day |
| `P4` | Low-impact bug or docs issue | Next planned cycle |

## Escalation channels

- Security incidents: `security@byteworthy.io`
- Production support: `support@byteworthy.io`
- Community issues/discussion: GitHub issues + discussions
