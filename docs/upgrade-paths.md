# Upgrade Paths: Sovra -> Klienta / Clynova

This guide helps teams move from Sovra OSS to the paid vertical boilerplates without re-platforming.

## Decision matrix

| If you need... | Stay on Sovra | Move to Klienta | Move to Clynova |
|---|---|---|---|
| General AI SaaS foundation | Yes | Optional | Optional |
| Agency/client operating model | Partial custom build | Yes | No |
| Healthcare interoperability/compliance scaffolding | No | No | Yes |

## Upgrade principles

1. Keep Sovra core intact; add vertical modules incrementally.
2. Preserve tenant identity contracts and auth boundaries.
3. Use staged rollouts with feature flags.
4. Keep rollback and data export paths available throughout migration.

## Path 1: Sovra -> Klienta

Recommended sequence:

1. Baseline current Sovra environment (tests, health endpoints, security gates).
2. Add Klienta modules in staging.
3. Map existing tenant structure to agency/client account model.
4. Validate branded surfaces and permission boundaries.
5. Run pilot tenants before full rollout.

## Path 2: Sovra -> Clynova

Recommended sequence:

1. Baseline current Sovra environment.
2. Add Clynova domain modules in staging.
3. Validate healthcare data boundaries and audit logging requirements.
4. Validate integration interfaces and operational controls.
5. Run pilot with non-production data before regulated go-live.

## Shared pre-upgrade checklist

- `ci`, `security`, and `release-readiness` workflows green
- no unresolved critical or high security findings
- current schema and data snapshots captured
- clear owner for go-live and rollback decision

## Shared post-upgrade checklist

- tenant isolation regression tests pass
- worker + web health checks pass
- background jobs, billing, and audit events validated
- runbook updates published to support/on-call teams

## Planning template

Use `templates/upgrade/boilerplate-evaluation-template.md` to score readiness, risk, and migration complexity before committing to a path.
