---
phase: 01-foundation
plan: 04
subsystem: docker-compose-and-testing
tags: [docker-compose, dockerfile, vitest, quality-gate, testing]
dependency_graph:
  requires: [01-02-worker-dockerfiles, 01-03-supabase-ports]
  provides: [dev-compose, prod-compose, web-dockerfile, vitest-config, passing-quality-gate]
  affects: [all-deployment-plans, all-feature-plans]
tech_stack:
  added: [vitest-4.1.4, "@vitejs/plugin-react-6.0.1", jsdom, "@testing-library/react-16.3.2", vite-tsconfig-paths]
  patterns: [multi-stage-dockerfile, host.docker.internal-supabase-bridge, next-standalone-output, jsdom-test-environment]
key_files:
  created:
    - docker/compose.dev.yaml
    - docker/compose.prod.yaml
    - packages/web/Dockerfile
    - packages/web/Dockerfile.dev
    - packages/web/.dockerignore
    - packages/web/.eslintrc.json
    - packages/web/vitest.config.ts
    - packages/web/src/__tests__/smoke.test.tsx
  modified:
    - packages/web/next.config.ts
    - packages/web/package.json
    - pnpm-lock.yaml
decisions:
  - "Used host.docker.internal instead of network_mode:host for macOS Docker Desktop compatibility - Supabase runs on host, containers reach it via extra_hosts bridge"
  - "Added output:standalone to next.config.ts - required for production Dockerfile to copy .next/standalone at build time"
  - "Created .eslintrc.json with next/core-web-vitals - next lint requires an explicit config file to run non-interactively"
  - "Removed stale .cts files (layout.cts, page.cts, next.config.cts) - ESLint parse errors blocked lint gate"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 3
---

# Phase 01 Plan 04: Docker Compose and Testing Infrastructure Summary

Docker Compose dev/prod configs with host.docker.internal Supabase bridge, multi-stage Next.js Dockerfile, and Vitest test infrastructure - full quality gate green.

## What Was Built

### Task 1: Docker Compose Files and Web Dockerfiles

Created all Docker configuration for local development and production deployment:

- **docker/compose.dev.yaml** - Dev compose for Next.js + Go worker. Supabase runs separately via `supabase start` on the host. Containers reach Supabase via `host.docker.internal:54321/54322` using `extra_hosts: ["host.docker.internal:host-gateway"]` (works on both Linux and macOS Docker Desktop).
- **docker/compose.prod.yaml** - Production compose with health checks (curl for web, wget for worker), `restart: unless-stopped`, and all secrets as `${VAR}` env var references - no hardcoded values.
- **packages/web/Dockerfile** - 3-stage build (deps → builder → runner). Uses Next.js standalone output. Final stage runs as non-root user `nextjs` (uid 1001). `.next/static` and `public/` copied separately for Docker layer cache efficiency.
- **packages/web/Dockerfile.dev** - Single-stage dev image with `pnpm dev` for hot reload.
- **packages/web/.dockerignore** - Excludes `node_modules`, `.next`, `.env*`, git history from build context.
- **packages/web/next.config.ts** - Added `output: 'standalone'` required by production Dockerfile.

### Task 2: Vitest Setup and Full Quality Gate

- **packages/web/vitest.config.ts** - jsdom environment, `@vitejs/plugin-react`, `vite-tsconfig-paths` for `@/*` and `@sovra/shared/*` path resolution.
- **packages/web/src/__tests__/smoke.test.tsx** - 2 tests: arithmetic assertion (infrastructure check) and JSX compilation check.
- **packages/web/.eslintrc.json** - `next/core-web-vitals` config (required for non-interactive `next lint`).
- **packages/web/package.json** - Added `test: vitest run` and `test:watch: vitest` scripts.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Docker Compose files and web Dockerfiles | 4d34179 | compose.dev.yaml, compose.prod.yaml, Dockerfile, Dockerfile.dev, .dockerignore, next.config.ts |
| 2 | Vitest setup and full quality gate | 5414208 | vitest.config.ts, smoke.test.tsx, .eslintrc.json, package.json, removed 3 stale .cts files |

## Quality Gate Results

| Check | Command | Result |
|-------|---------|--------|
| Vitest | `pnpm --filter @sovra/web run test` | 2/2 passed |
| TypeScript | `pnpm --filter @sovra/web run type-check` | Clean (exit 0) |
| ESLint | `pnpm --filter @sovra/web run lint` | No warnings or errors |
| Go build | `cd packages/worker && go build ./...` | Clean |
| Go test | `cd packages/worker && go test ./...` | 1 package tested, pass |
| Compose dev | `docker compose -f docker/compose.dev.yaml config` | Valid |
| Compose prod | `docker compose -f docker/compose.prod.yaml config` | Valid |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan specified `network_mode: host` - incompatible with macOS Docker Desktop**
- **Found during:** Task 1 (reviewing plan notes re: macOS caveat)
- **Issue:** `network_mode: host` is ignored on macOS Docker Desktop - containers cannot reach host-side services (Supabase) via localhost. The plan itself noted this risk.
- **Fix:** Used bridge network (default) with `extra_hosts: ["host.docker.internal:host-gateway"]`. Updated Supabase URLs to `host.docker.internal:54321/54322`.
- **Files modified:** `docker/compose.dev.yaml`
- **Commit:** 4d34179

**2. [Rule 2 - Missing config] ESLint config absent - `next lint` launches interactive wizard**
- **Found during:** Task 2 (running lint quality gate)
- **Issue:** No `.eslintrc.json` existed in `packages/web/`. Running `next lint` without config launches an interactive prompt, which fails in non-interactive CI/executor context.
- **Fix:** Created `.eslintrc.json` with `next/core-web-vitals` preset.
- **Files modified:** `packages/web/.eslintrc.json` (created)
- **Commit:** 5414208

**3. [Rule 1 - Bug] Stale `.cts` files caused ESLint parse errors**
- **Found during:** Task 2 (first ESLint run)
- **Issue:** `packages/web/app/layout.cts`, `app/page.cts`, and `next.config.cts` were still present from the original scaffold. ESLint tried to parse them as TypeScript and failed on JSX syntax.
- **Fix:** Deleted all three stale files. The `.tsx` counterparts (created in Plan 01) are the correct versions.
- **Files modified:** Deleted `layout.cts`, `page.cts`, `next.config.cts`
- **Commit:** 5414208

## Known Stubs

None - all Docker configs are production-ready (non-root users, health checks, restart policies, multi-stage builds). Vitest infrastructure is complete.

## Threat Surface

All T-01-13 through T-01-16 mitigations from the threat model applied:

| Threat | Mitigation Applied |
|--------|-------------------|
| T-01-13 (Image layer info disclosure) | Multi-stage Dockerfile - source code and dev deps not in runner stage. `.env*` in `.dockerignore`. |
| T-01-14 (Container privilege escalation) | Production web image runs as `nextjs` uid 1001. No Docker socket mounted. No privileged mode. |
| T-01-15 (Secrets in compose) | All secrets use `${VAR}` syntax in compose.prod.yaml. `SUPABASE_SERVICE_ROLE_KEY` never uses `NEXT_PUBLIC_` prefix. |
| T-01-16 (Health check DoS) | Health endpoints unauthenticated by design (required for orchestrators). Return minimal data only. |

## Self-Check: PASSED

- `docker/compose.dev.yaml` - EXISTS, validates
- `docker/compose.prod.yaml` - EXISTS, validates
- `packages/web/Dockerfile` - EXISTS
- `packages/web/Dockerfile.dev` - EXISTS
- `packages/web/vitest.config.ts` - EXISTS, has `environment: 'jsdom'`
- `packages/web/src/__tests__/smoke.test.tsx` - EXISTS, 2/2 tests pass
- Commits 4d34179, 5414208 - verified in git log
