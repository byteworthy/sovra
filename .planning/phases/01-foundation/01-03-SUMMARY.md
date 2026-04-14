---
phase: 01-foundation
plan: 03
subsystem: database-schema
tags: [supabase, postgresql, pgvector, rls, hnsw, typescript-types]
dependency_graph:
  requires: [01-01-monorepo-scaffold]
  provides: [local-supabase, full-schema-14-tables, rls-policies, hnsw-index, generated-ts-types]
  affects: [all-api-plans, all-agent-plans, all-ui-plans]
tech_stack:
  added: [supabase-cli-2.84.2, pgvector-extension, hnsw-index]
  patterns: [rls-tenant-isolation, get_current_tenant_id-helper, append-only-audit-log, global-feature-flags]
key_files:
  created:
    - supabase/config.toml
    - supabase/migrations/20260412004330_initial_schema.sql
  modified:
    - packages/shared/types/database.ts
decisions:
  - "Helper function get_current_tenant_id() must be defined AFTER tenant_users table - Postgres resolves table references at parse time, not call time, for SQL functions"
  - "supabase gen types emits 'Connecting to db 5432' to stdout when redirected - strip this line post-generation"
  - "Supabase CLI v2.84.2 uses PostgreSQL 17 by default (not 15 as planned) - no impact on schema or RLS"
  - "Stopped vezta Supabase project to free ports 54322-54324 before starting sovra instance"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 2
  files_modified: 1
---

# Phase 1 Plan 3: Supabase Schema Setup Summary

Full Supabase local setup with 14-table PostgreSQL schema, pgvector + HNSW index, 51 RLS tenant-isolation policies, and auto-generated TypeScript types - all verified against running local instance.

## What Was Built

Initialized Supabase CLI project, wrote a 506-line SQL migration creating all 14 tables with correct constraints, foreign keys, and check constraints. Enabled pgvector, created HNSW vector index, applied 51 RLS policies for complete tenant isolation (with append-only audit logs and global feature flag reads), and generated 874 lines of TypeScript types from the live schema.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Initialize Supabase, create migration, apply schema | 63b6428 | supabase/config.toml, supabase/migrations/20260412004330_initial_schema.sql |
| 2 | Generate TypeScript types, verify RLS | 69ab33e + 8d57df5 | packages/shared/types/database.ts |
| 3 | Supabase Studio checkpoint (auto-approved) | - | - |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] get_current_tenant_id() defined before tenant_users table**
- **Found during:** Task 1 (supabase start - migration failed)
- **Issue:** The plan placed the helper function in "Part B" before the tables in "Part C". PostgreSQL SQL functions resolve table references at parse time - `tenant_users` didn't exist yet.
- **Fix:** Moved function definition to after Table 3 (tenant_users), renaming section "Part B" to a note inside "Part C"
- **Files modified:** `supabase/migrations/20260412004330_initial_schema.sql`
- **Commit:** 63b6428

**2. [Rule 1 - Bug] supabase gen types stdout included connection notice**
- **Found during:** Task 2 (reviewing generated file)
- **Issue:** `supabase gen types typescript --local` emitted `Connecting to db 5432` to stdout, which was captured by the shell redirect (`>`) as the first line of database.ts - making it invalid TypeScript.
- **Fix:** Stripped the noise line from the generated file
- **Files modified:** `packages/shared/types/database.ts`
- **Commit:** 8d57df5

### Environmental Notes

- Stopped the running `vezta` Supabase project (port conflict on 54322) before starting sovra
- Supabase CLI 2.84.2 defaults to PostgreSQL 17 - plan specified 15. No functional impact; schema and RLS work identically.
- Docker images (all Supabase services) required fresh pull on first `supabase start` (~5 min)

## Verification Results

```
supabase db query "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';"
→ table_count: 14  PASS

supabase db query "SELECT extname FROM pg_extension WHERE extname = 'vector';"
→ extname: vector  PASS

supabase db query "SELECT indexname FROM pg_indexes WHERE tablename = 'vector_documents' AND indexname LIKE '%embedding%';"
→ idx_vector_documents_embedding  PASS

supabase db query "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;"
→ 0 rows  PASS (all tables have RLS)

supabase db query "SELECT count(*) FROM pg_policies;"
→ count: 51  PASS (>= 40)

grep -c "Tables" packages/shared/types/database.ts
→ 20  PASS

cd packages/web && npx tsc --noEmit
→ exit 0  PASS
```

## Known Stubs

None - all 14 tables are fully defined with real columns, constraints, and RLS policies. The `packages/shared/types/database.ts` file is auto-generated from the live schema (not a stub).

## Threat Flags

No new threat surface beyond what was planned in the threat model. All T-01-08 through T-01-12 mitigations applied as designed:
- T-01-08: RLS on all 14 tables with `(select get_current_tenant_id())` caching
- T-01-09: Service role key documented in config output - never in NEXT_PUBLIC_ context
- T-01-10: `get_current_tenant_id()` is `security definer` - caller cannot forge tenant_id
- T-01-11: Global feature flags (null tenant_id) accepted by design
- T-01-12: `auth.uid()` from verified JWT, not user-controllable

## Self-Check: PASSED
