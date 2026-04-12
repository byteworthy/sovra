---
phase: 02-core-infrastructure
plan: 02
subsystem: tenant-rbac
tags: [database, rbac, multi-tenant, resolver, context, typescript, sql]
dependency_graph:
  requires: [02-01]
  provides: [roles-table, permissions-table, invitations-table, TenantResolver, TenantContext]
  affects: [03-agent-core, tenant-creation-flow]
tech_stack:
  added: []
  patterns: [TDD-red-green, factory-function, react-context, RLS-policies, seed-function]
key_files:
  created:
    - supabase/migrations/20260412010000_phase2_rbac_invitations.sql
    - packages/shared/types/tenant.ts
    - packages/shared/types/rbac.ts
    - packages/web/lib/tenant/path-resolver.ts
    - packages/web/lib/tenant/subdomain-resolver.ts
    - packages/web/lib/tenant/header-resolver.ts
    - packages/web/lib/tenant/resolver.ts
    - packages/web/lib/tenant/context.tsx
    - packages/web/src/__tests__/tenant/resolver.test.ts
    - packages/web/src/__tests__/tenant/context.test.ts
  modified:
    - packages/shared/types/index.ts
decisions:
  - "Kept text role column on tenant_users for backward compatibility; role_id FK added alongside it"
  - "Permissions table is global (not tenant-scoped) — all tenants share the same permission catalog"
  - "RLS policy 'Anyone can read invitation by token' uses true predicate to support unauthenticated acceptance flow"
  - "TENANT_RESOLUTION_STRATEGY env var selects resolver; defaults to path strategy"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-12"
  tasks_completed: 3
  files_created: 10
  files_modified: 1
  tests_added: 19
---

# Phase 02 Plan 02: RBAC Migration + Tenant Resolver Layer Summary

**One-liner:** PostgreSQL RBAC schema with 4 tables + RLS + seed function, and 3 TenantResolver strategies (path/subdomain/header) with React TenantContext, all test-driven.

## What Was Built

### Task 1: Database Migration (fb276f7)

`supabase/migrations/20260412010000_phase2_rbac_invitations.sql`

- 4 new tables: `roles` (tenant-scoped), `permissions` (global), `role_permissions` (junction), `invitations`
- `role_id` FK added to `tenant_users` (backward-compatible, text `role` column preserved)
- RLS enabled on all 4 tables with tenant-scoped policies; invitation token read policy open for acceptance flow
- 15 default permissions seeded across agent/workspace/tenant/billing/member resources
- `seed_tenant_roles(p_tenant_id uuid)` function creates 4 default roles (owner/admin/member/viewer) with correct permission subsets on tenant creation

### Task 2: Shared Types + Resolver Implementations (93da732)

- `packages/shared/types/tenant.ts`: `Tenant`, `TenantUser`, `TenantResolver` interface, `TenantResolutionStrategy`
- `packages/shared/types/rbac.ts`: `Role`, `Permission`, `PermissionAction`, `RolePermission`, `Invitation`, `InviteType`, `InviteStatus`, `PermissionChecker`
- `packages/shared/types/index.ts`: extended with tenant + RBAC re-exports (auth exports from 02-01 preserved)
- Three resolver implementations:
  - `PathTenantResolver`: regex `/^\/t\/([a-z0-9-]+)/` on pathname
  - `SubdomainTenantResolver`: requires 3-part host; rejects localhost, IPs
  - `HeaderTenantResolver`: reads `X-Tenant-Slug` then `X-Tenant-ID`
- `createTenantResolver` factory: reads `TENANT_RESOLUTION_STRATEGY` env, defaults to `path`
- 14 resolver tests all passing

### Task 3: TenantContext Provider + Hook (28b9e75)

- `packages/web/lib/tenant/context.tsx`: `TenantProvider` wraps with `tenant`, `tenantId`, `tenantSlug`
- `useTenant()` throws `'useTenant must be used within a TenantProvider'` when used outside provider
- 5 context tests all passing
- TypeScript compiles clean (zero errors)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error in context.test.ts wrapper**
- **Found during:** Task 3 type-check
- **Issue:** `React.createElement(TenantProvider, { tenant }, children)` — passing `children` as third arg caused TS2769 (children not in props type when using createElement overload)
- **Fix:** Changed to `React.createElement(TenantProvider, { tenant, children })` — children passed in props object
- **Files modified:** `packages/web/src/__tests__/tenant/context.test.ts`
- **Commit:** 28b9e75 (included in Task 3 commit)

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| tenant/resolver | 14 | PASS |
| tenant/context | 5 | PASS |
| **Total** | **19** | **PASS** |

## Known Stubs

None — all resolver logic is fully implemented and tested.

## Threat Flags

No new trust boundaries introduced beyond what the plan's threat model covers. RLS policies applied per T-02-06. Token field in invitations table is ready for 256-bit random generation at the application layer (T-02-07). Slug regex `[a-z0-9-]+` in PathTenantResolver addresses T-02-05.

## Self-Check: PASSED

- supabase/migrations/20260412010000_phase2_rbac_invitations.sql: FOUND
- packages/shared/types/tenant.ts: FOUND
- packages/shared/types/rbac.ts: FOUND
- packages/web/lib/tenant/context.tsx: FOUND
- packages/web/lib/tenant/resolver.ts: FOUND
- Commit fb276f7: FOUND
- Commit 93da732: FOUND
- Commit 28b9e75: FOUND
