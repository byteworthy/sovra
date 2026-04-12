---
phase: 2
slug: core-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x + @testing-library/react 16.x |
| **Config file** | `packages/web/vitest.config.ts` |
| **Quick run command** | `cd packages/web && npm test` |
| **Full suite command** | `cd packages/web && npm test -- --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/web && npm test`
- **After every plan wave:** Run `cd packages/web && npm test -- --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | AUTH-01 | T-02-01 | Email/password signup validates input, hashes password via Supabase | unit | `npm test -- auth/adapter` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | AUTH-02 | — | Magic link signInWithOtp called with email | unit | `npm test -- auth/adapter` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | AUTH-03 | T-02-02 | OAuth signInWithOAuth called with provider config | unit | `npm test -- auth/adapter` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | AUTH-04 | T-02-03 | Session retrieved from cookies via getClaims (not getSession) | unit | `npm test -- auth/server` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 0 | AUTH-05 | — | Password reset email triggered | unit | `npm test -- auth/adapter` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 0 | AUTH-06 | T-02-04 | Callback route exchanges code for session | unit | `npm test -- auth/callback` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | TEN-01 | — | Tenant creation inserts row + creates owner role | unit | `npm test -- tenant/` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | TEN-02 | T-02-05 | RLS blocks cross-tenant data access | manual | Manual SQL test with 2 users | N/A | ⬜ pending |
| 02-02-03 | 02 | 1 | TEN-03 | T-02-06 | Tenant context present in Server Component | unit | `npm test -- tenant/context` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | TEN-04 | — | TenantResolver extracts slug from host/path/header | unit | `npm test -- tenant/resolver` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | RBAC-01 | — | Default roles seeded on tenant creation | unit | `npm test -- rbac/` | ❌ W0 | ⬜ pending |
| 02-03-02 | 03 | 1 | RBAC-02 | T-02-07 | hasPermission returns correct boolean for role+action | unit | `npm test -- rbac/checker` | ❌ W0 | ⬜ pending |
| 02-03-03 | 03 | 1 | RBAC-03 | T-02-08 | Route returns 403 without required permission | unit | `npm test -- middleware` | ❌ W0 | ⬜ pending |
| 02-03-04 | 03 | 1 | RBAC-04 | T-02-09 | Invite token accepted, user added to tenant | unit | `npm test -- rbac/invitation` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/web/src/__tests__/auth/adapter.test.ts` — stubs for AUTH-01..03, AUTH-05
- [ ] `packages/web/src/__tests__/auth/server.test.ts` — stubs for AUTH-04
- [ ] `packages/web/src/__tests__/auth/callback.test.ts` — stubs for AUTH-06
- [ ] `packages/web/src/__tests__/tenant/context.test.ts` — stubs for TEN-03
- [ ] `packages/web/src/__tests__/tenant/resolver.test.ts` — stubs for TEN-04
- [ ] `packages/web/src/__tests__/rbac/checker.test.ts` — stubs for RBAC-02
- [ ] `packages/web/src/__tests__/rbac/invitation.test.ts` — stubs for RBAC-04
- [ ] `packages/web/src/__tests__/middleware.test.ts` — stubs for RBAC-03
- [ ] `packages/web/src/__tests__/tenant/create.test.ts` — stubs for TEN-01, RBAC-01
- [ ] `packages/web/src/__tests__/helpers/supabase-mock.ts` — shared Supabase mock

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RLS cross-tenant isolation | TEN-02 | Requires 2 authenticated Supabase sessions with different tenant_ids hitting live DB | 1. Create 2 users in different tenants via Supabase dashboard. 2. Query agents table as user A — should see only tenant A data. 3. Query as user B — should see only tenant B data. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
