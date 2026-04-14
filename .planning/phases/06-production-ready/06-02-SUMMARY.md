---
phase: 06-production-ready
plan: 02
subsystem: api-keys
tags: [security, authentication, rate-limiting, crud, tenant-isolation]
dependency_graph:
  requires: []
  provides: [api-key-generation, api-key-authentication, rate-limiting, api-key-crud]
  affects: [packages/web/lib/api-keys, packages/web/app/api/keys]
tech_stack:
  added: ["@upstash/ratelimit", "@upstash/redis"]
  patterns:
    - SHA-256 hash for high-entropy key storage (never bcrypt)
    - bsk_ prefix + 32 bytes crypto.randomBytes + base64url encoding
    - Upstash sliding window rate limiting with no-op fallback
    - Injectable Supabase factory for testable middleware
    - Fire-and-forget last_used_at updates (non-blocking auth path)
key_files:
  created:
    - packages/web/lib/api-keys/generator.ts
    - packages/web/lib/api-keys/authenticator.ts
    - packages/web/lib/api-keys/rate-limiter.ts
    - packages/web/lib/api-keys/middleware.ts
    - packages/web/lib/api-keys/__tests__/api-keys.test.ts
    - packages/web/lib/api-keys/__tests__/api-key-routes.test.ts
    - packages/web/app/api/keys/route.ts
    - packages/web/app/api/keys/[id]/route.ts
  modified:
    - packages/web/lib/api-keys/authenticator.ts (added .select() to query chain)
    - packages/web/package.json (added @upstash/ratelimit, @upstash/redis)
decisions:
  - "SHA-256 not bcrypt: API keys are 32 bytes random (256-bit entropy) making timing attacks computationally infeasible; bcrypt adds unnecessary latency on every authenticated request"
  - "Injectable Supabase factory in withApiKeyAuth: enables unit testing without Next.js server context while preserving production path using createServerClient"
  - "Route tests in separate file (api-key-routes.test.ts): vi.mock hoisting at module level for @/lib/api-keys/generator would pollute generator unit tests if colocated"
  - "audit_logs uses resource column (not resource_type): matched actual DB schema from packages/shared/types/database.ts"
metrics:
  duration: "~25 minutes"
  completed: "2026-04-12"
  tasks: 2
  files: 8
---

# Phase 6 Plan 2: API Key Infrastructure Summary

JWT auth-style API keys with bsk_ prefix, SHA-256 hash storage, Upstash sliding-window rate limiting, and full CRUD lifecycle scoped per tenant.

## What Was Built

### Task 1: Core key infrastructure (commit 8aeefa0)

**generator.ts** — `generateApiKey()` returns `{ raw, hash, prefix }`:
- `raw = 'bsk_' + randomBytes(32).toString('base64url')` — 256-bit entropy
- `prefix = raw.slice(0, 12)` — used as lookup index (bsk_ + 8 chars)
- `hash = sha256(raw).hex` — only value stored in DB

**authenticator.ts** — `authenticateApiKey(supabase, rawKey)`:
- Rejects keys not starting with `bsk_` immediately
- Queries `api_keys` by prefix + hash (tenant RLS applies)
- Rejects expired (`expires_at < now`) and revoked (`revoked_at not null`)
- Fire-and-forget `last_used_at` update on every valid auth

**rate-limiter.ts** — `getRateLimiter()` / `checkRateLimit(identifier)`:
- Returns `null` and `{ success: true }` when `UPSTASH_REDIS_REST_URL` is absent
- Singleton Ratelimit instance with sliding window: 100 req/min default
- Graceful no-op for self-hosters without Redis configured

**middleware.ts** — `withApiKeyAuth(handler, supabaseFactory?)`:
- Extracts `Authorization: Bearer bsk_...` header
- Returns 401 on missing/invalid header
- Returns 401 on invalid/expired/revoked key
- Returns 429 with `Retry-After` header on rate limit exceeded
- Passes `{ tenantId, permissions, keyPrefix }` context to handler

### Task 2: CRUD routes + usage tracking (commit 481faf1)

**GET /api/keys** — Lists all keys for authenticated user's tenant:
- Returns `id, name, key_prefix, permissions, expires_at, revoked_at, last_used_at, created_at`
- Never returns `key_hash` or raw key

**POST /api/keys** — Creates a new API key:
- Validates: `name` (required), `permissions[]` (optional), `expires_at` (optional ISO datetime)
- Calls `generateApiKey()`, inserts `key_hash` + `key_prefix` into `api_keys`
- Returns `raw_key` exactly once in the 201 response — never stored, never retrievable again
- Audit log: `api_key.created`

**DELETE /api/keys/[id]** — Revokes a key:
- Verifies key belongs to authenticated user's tenant (tenant-scoped SELECT)
- Sets `revoked_at = now()` — permanent, never cleared
- Returns 404 for non-existent or cross-tenant key access
- Audit log: `api_key.revoked`

## Test Coverage

26 tests across 2 files, all green:

| File | Tests | Scope |
|------|-------|-------|
| api-keys.test.ts | 18 | generator, authenticator, rate-limiter, middleware |
| api-key-routes.test.ts | 8 | POST/GET/DELETE route handlers |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added .select() to authenticator query chain**
- **Found during:** TypeScript typecheck after Task 2
- **Issue:** `supabase.from('api_keys').eq(...)` is a type error — `.eq()` doesn't exist on `PostgrestQueryBuilder`, only on `PostgrestFilterBuilder` (returned by `.select()`)
- **Fix:** Added `.select('id, tenant_id, permissions, expires_at, revoked_at')` before `.eq()` calls
- **Files modified:** `packages/web/lib/api-keys/authenticator.ts`
- **Commit:** 481faf1

**2. [Rule 1 - Bug] Fixed audit_logs field name (resource_type -> resource)**
- **Found during:** TypeScript typecheck after Task 2
- **Issue:** DB schema uses `resource` column, not `resource_type`
- **Fix:** Changed field name in both route handlers
- **Files modified:** `packages/web/app/api/keys/route.ts`, `packages/web/app/api/keys/[id]/route.ts`
- **Commit:** 481faf1

**3. [Rule 2 - Architecture] Split route tests into separate file**
- **Found during:** Task 2 test implementation
- **Issue:** `vi.mock('@/lib/api-keys/generator', ...)` is hoisted to module scope — placing route tests in `api-keys.test.ts` caused the generator mock to pollute generator unit tests (returning fixed mock values instead of real crypto output)
- **Fix:** Extracted route tests to `api-key-routes.test.ts` with its own mock scope
- **Files modified:** new `packages/web/lib/api-keys/__tests__/api-key-routes.test.ts`
- **Commit:** 481faf1

**4. [Rule 3 - Blocking] Added @upstash/ratelimit + @upstash/redis dependencies**
- **Found during:** Task 1 setup
- **Issue:** Packages not in `package.json` — plan assumes they exist
- **Fix:** `pnpm add --filter @sovra/web @upstash/ratelimit @upstash/redis`
- **Commit:** 8aeefa0

## Known Stubs

None. All functionality is fully implemented and wired.

## Threat Surface Scan

All threat mitigations from the plan's STRIDE register are implemented:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-06-05 Spoofing | SHA-256 hash comparison; prefix-based lookup; 256-bit key entropy |
| T-06-06 Information Disclosure | `key_hash` never in GET/POST responses; raw key shown once only |
| T-06-07 DoS | Upstash sliding window rate limiting; 429 + Retry-After |
| T-06-08 Elevation of Privilege | Permissions stored per-key; passed to handler context |
| T-06-09 Tampering | Tenant-scoped all queries; revoked_at set once, never cleared |

## Self-Check: PASSED

All 8 implementation files confirmed on disk. Both task commits (8aeefa0, 481faf1) confirmed in git log. 26 tests passing. TypeScript clean.
