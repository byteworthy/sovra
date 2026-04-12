---
phase: 02-core-infrastructure
plan: "01"
subsystem: auth
tags: [auth, supabase, adapter-pattern, pkce, ssr, tdd]
dependency_graph:
  requires: []
  provides:
    - AuthAdapter interface (packages/shared/types/auth.ts)
    - SupabaseAuthAdapter implementation (packages/web/lib/auth/supabase-adapter.ts)
    - Browser client singleton (packages/web/lib/auth/client.ts)
    - Server client factory (packages/web/lib/auth/server.ts)
    - PKCE callback route (packages/web/app/auth/callback/route.ts)
  affects:
    - Any component needing auth operations (consumes AuthAdapter)
    - Future auth middleware (consumes createSupabaseServerClient)
tech_stack:
  added:
    - "@supabase/ssr@0.10.2 (cookie-based SSR sessions)"
    - "@supabase/supabase-js@2.103.0 (auth client with getClaims)"
  patterns:
    - Adapter pattern for swappable auth providers
    - Dependency injection in SupabaseAuthAdapter constructor
    - PKCE flow with getClaims() for validated JWT (not getSession())
    - Browser singleton + per-request server client
key_files:
  created:
    - packages/shared/types/auth.ts
    - packages/web/lib/auth/adapter.ts
    - packages/web/lib/auth/supabase-adapter.ts
    - packages/web/lib/auth/client.ts
    - packages/web/lib/auth/server.ts
    - packages/web/app/auth/callback/route.ts
    - packages/web/src/__tests__/auth/adapter.test.ts
    - packages/web/src/__tests__/auth/server.test.ts
    - packages/web/src/__tests__/auth/callback.test.ts
    - packages/web/src/__tests__/helpers/supabase-mock.ts
  modified:
    - packages/shared/types/index.ts (added auth type exports)
    - packages/web/package.json (upgraded @supabase/ssr and @supabase/supabase-js)
decisions:
  - "getClaims() used in getSession() instead of getSession() per @supabase/ssr 0.10.2 security recommendation - validates JWT signature server-side"
  - "SupabaseAuthAdapter takes Supabase client via constructor DI for testability - no module-level singleton"
  - "Browser client is singleton to prevent multiple GoTrue instances"
  - "encodeURIComponent on error redirects to prevent header injection in callback route"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-12"
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 2
  tests_added: 13
  tests_passing: 13
---

# Phase 02 Plan 01: Auth Adapter Layer Summary

**One-liner:** Swappable auth provider pattern with Supabase implementation using getClaims() JWT validation, cookie-based SSR sessions, and PKCE callback route for all auth flows.

## What Was Built

Complete authentication adapter layer establishing D-01 (swappable auth provider) architecture:

1. **Shared auth types** (`packages/shared/types/auth.ts`) - `AuthAdapter` interface with 9 methods, `AuthUser`, `AuthSession`, `AuthResult`, `OAuthProvider` types exported from shared package.

2. **SupabaseAuthAdapter** (`packages/web/lib/auth/supabase-adapter.ts`) - Full implementation of `AuthAdapter` with dependency injection. `getSession()` uses `getClaims()` (not `getSession()`) to validate JWT signatures server-side per Supabase security guidance.

3. **Client factories** - Browser singleton (`createSupabaseBrowserClient`) and per-request server factory (`createSupabaseServerClient`) using `@supabase/ssr` with cookie `getAll`/`setAll` pattern.

4. **PKCE callback route** (`packages/web/app/auth/callback/route.ts`) - Handles all OAuth, magic link, email verify, and password reset flows. Error params are `encodeURIComponent`-encoded to prevent header injection.

5. **Test suite** - 13 tests across 3 test files covering all adapter methods, server factory, and all 5 callback route cases. TDD approach: RED (failing) then GREEN (passing) for Tasks 2 and 3.

## Decisions Made

- **getClaims() over getSession()**: Per `@supabase/ssr` 0.10.2 security guidance, `getClaims()` validates JWT signatures while `getSession()` returns unvalidated cached data. Critical for server-side auth.
- **DI pattern for adapter**: Constructor injection of Supabase client enables clean unit testing without module mocking.
- **Browser client singleton**: Prevents multiple GoTrue auth state machines from running simultaneously.

## Deviations from Plan

None - plan executed exactly as written. `getClaims()` is available in `@supabase/auth-js@2.103.0` as confirmed by inspecting the installed package's type declarations.

## Threat Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-02-01: Spoofing via callback | `exchangeCodeForSession` validates PKCE code server-side |
| T-02-02: OAuth spoofing | PKCE state/nonce handled by Supabase; only `code` processed server-side |
| T-02-03: Session tampering | `getClaims()` validates JWT signature (not unvalidated cache) |
| T-02-04: Error info disclosure | `encodeURIComponent` on error params; no stack traces in redirects |

## Self-Check: PASSED

All created files verified to exist. All commits verified in git log.
