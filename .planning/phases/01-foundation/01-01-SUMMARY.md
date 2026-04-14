---
phase: 01-foundation
plan: 01
subsystem: monorepo-scaffold
tags: [pnpm, next.js, typescript, monorepo, shared-types]
dependency_graph:
  requires: []
  provides: [working-monorepo, shared-types-package, go-makefile, env-template]
  affects: [all-subsequent-plans]
tech_stack:
  added: [pnpm-workspaces, @sovra/shared]
  patterns: [workspace-dependency, explicit-workspace-listing, esm-next-config]
key_files:
  created:
    - pnpm-workspace.yaml
    - package.json
    - Makefile
    - .env.example
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/types/index.ts
    - packages/shared/types/database.ts
    - packages/web/app/layout.tsx
    - packages/web/app/page.tsx
    - packages/web/components/ui/card.tsx
    - packages/web/next.config.ts
  modified:
    - .gitignore
    - packages/web/package.json
decisions:
  - "@vercel/ai does not exist on npm - correct package is `ai` (Vercel AI SDK). Fixed during Task 2."
  - "pnpm-workspace.yaml uses explicit package listing (not glob) to exclude packages/worker Go module"
  - "next.config.ts uses ESM export default instead of CommonJS module.exports"
  - "database.ts is a stub - will be replaced by supabase gen types in Plan 03"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 16
  files_modified: 2
---

# Phase 1 Plan 1: Fix Scaffold Extensions and Set Up Shared Package Summary

pnpm monorepo with corrected .tsx extensions, @sovra/shared types package, Go Makefile, and env template - TypeScript compiles clean.

## What Was Built

Transformed a broken scaffold (`.cts`/`.ctsx` extensions incompatible with JSX) into a working pnpm monorepo with two workspace packages (`web`, `shared`). Set up all foundation tooling required by every subsequent plan.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Fix scaffold file extensions and set up web package | a0893bc | layout.tsx, page.tsx, card.tsx, next.config.ts + 8 more |
| 2 | Create shared package and configure pnpm workspace | 4709991 | pnpm-workspace.yaml, packages/shared/*, Makefile, .env.example |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `@vercel/ai` package does not exist on npm**
- **Found during:** Task 2 (pnpm install)
- **Issue:** `packages/web/package.json` had `"@vercel/ai": "^3.2.0"` which returns 404 from npm registry. The correct package name is `ai` (Vercel AI SDK).
- **Fix:** Changed dependency from `@vercel/ai` to `ai`
- **Files modified:** `packages/web/package.json`
- **Commit:** 4709991

**2. [Rule 1 - Bug] badge.tsx had CSS typo `border--transparent`**
- **Found during:** Task 1 (reviewing scaffold content)
- **Issue:** Original `badge.ctsx` had `border--transparent` (double dash) in the default variant - invalid CSS class.
- **Fix:** Corrected to `border-transparent`
- **Files modified:** `packages/web/components/ui/badge.tsx`
- **Commit:** a0893bc

**3. [Rule 1 - Bug] page.tsx had unescaped apostrophe in JSX**
- **Found during:** Task 1 (reviewing scaffold content)
- **Issue:** `What's Included` heading used a raw apostrophe in JSX text - causes React ESLint warning and potential build issues.
- **Fix:** Replaced with `What&apos;s Included`
- **Files modified:** `packages/web/app/page.tsx`
- **Commit:** a0893bc

**4. [Rule 1 - Bug] page.tsx had `' components'` directory with leading space**
- **Found during:** Task 1
- **Issue:** Main repo had spurious `' components'` directory alongside `components/`. In the worktree, this was never created - the correct `components/` structure was created directly.
- **Fix:** Directory never created in worktree; only correct paths used.
- **Commit:** a0893bc

## Known Stubs

| File | Stub | Reason |
|------|------|--------|
| `packages/shared/types/database.ts` | `Tables: Record<string, never>` | Intentional - replaced by `supabase gen types` in Plan 03 after migrations are applied |

## Threat Surface

All T-01-01 and T-01-02 mitigations applied:
- `.env.example` contains only placeholder values, no real keys
- `.gitignore` covers `.env`, `.env.local`, `.env*.local`
- `next.config.ts` does not expose any server-only secrets; `NEXT_PUBLIC_` convention documented in `.env.example`

## Verification Results

- `find packages/web -name "*.cts" -o -name "*.ctsx"` → 0 files
- `pnpm install` → succeeded (549 packages)
- `cd packages/web && npx tsc --noEmit` → exit 0 (clean)
- `cat pnpm-workspace.yaml` → shows `web` and `shared` only
- `ls packages/shared/types/` → `index.ts` and `database.ts`
- `cat .env.example` → documents all required env vars
- `cat Makefile` → has `go-build`, `go-test`, `go-dev`, `go-lint`, `go-tidy`

## Self-Check: PASSED
