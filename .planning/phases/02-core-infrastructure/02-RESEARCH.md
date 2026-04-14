# Phase 2: Core Infrastructure - Research

**Researched:** 2026-04-11
**Domain:** Supabase Auth, Next.js middleware, multi-tenant RLS, RBAC schema design
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Auth Provider:** Supabase Auth native behind `AuthAdapter` interface (swappable). No custom JWT hooks - keeps free-tier compatible.
2. **Routing Strategy:** All three via config (`TENANT_RESOLUTION_STRATEGY` env var). Default: `path`. Subdomain and header are opt-in.
   - Path: `/t/{slug}/dashboard`
   - Subdomain: `{slug}.sovra.dev`
   - Header: `X-Tenant-ID` or `X-Tenant-Slug`
3. **Permission Model:** `roles` + `permissions` + `role_permissions` tables (tenant-scoped, DB-checked). Permission strings follow `resource:action` format.
4. **Invitations:** Both email invites and shareable invite links. `invitations` table tracks both.
5. **Session:** Supabase Auth JWT via `@supabase/ssr` cookie-based session. Server components read from cookies. No custom session server.

### Claude's Discretion

None specified - all major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

None specified for this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Email/password signup and login | Supabase `signUp`/`signInWithPassword` via `AuthAdapter` |
| AUTH-02 | Magic link authentication | Supabase `signInWithOtp` with `type: 'magiclink'` - PKCE callback route required |
| AUTH-03 | OAuth providers (Google, GitHub) | Supabase `signInWithOAuth` - dashboard config + callback route |
| AUTH-04 | Session management with JWT | `@supabase/ssr` cookies, `getClaims()` in middleware, refresh handled automatically |
| AUTH-05 | Password reset flow | Supabase `resetPasswordForEmail` + `updateUser` in callback |
| AUTH-06 | Email verification | Supabase auto-sends on signup; callback route at `/auth/callback` handles code exchange |
| TEN-01 | Tenant creation and management | `tenants` table exists from Phase 1; need tenant creation flow + `TenantResolver` interface |
| TEN-02 | Tenant-level RLS policies | Phase 1 RLS uses `get_current_tenant_id()` helper - needs migration to RBAC-aware version |
| TEN-03 | Tenant context in all queries | `TenantContext` React context + server-side tenant resolution in middleware |
| TEN-04 | Subdomain-based tenant identification | `SubdomainResolver` implementation using `request.headers.get('host')` in middleware |
| RBAC-01 | Role definitions (owner, admin, member, viewer) | New `roles` table migration with seeded defaults |
| RBAC-02 | Permission system (agent:create, etc.) | `permissions` + `role_permissions` tables; `hasPermission()` DB function |
| RBAC-03 | Role-based route protection | Middleware permission check via `PermissionChecker` interface |
| RBAC-04 | Tenant user invitation system | `invitations` table with `invite_type: 'email' | 'link'`, token-based acceptance |
</phase_requirements>

---

## Summary

This phase builds auth, multi-tenancy, and RBAC on top of the Phase 1 schema foundation. The Phase 1 migration already created `tenants`, `users`, `tenant_users` (with a text `role` column), and `get_current_tenant_id()` - these need to be extended, not replaced.

The core challenge is that `@supabase/ssr` is at `0.10.2` (published 2026-04-09) while the project pins `^0.5.2`. The API changed: `getClaims()` now replaces `getUser()` for server-side auth checks, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the new env var name alongside the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both are supported but new projects should use the publishable key form.

Multi-tenant routing in middleware must run before auth checks, so the middleware has two responsibilities: (1) resolve tenant from request, (2) refresh auth session. The `TenantResolver` interface abstracts all three strategies (path/subdomain/header). The RBAC system must be fully DB-driven per-tenant - no hardcoded permission enums.

**Primary recommendation:** Upgrade `@supabase/ssr` to `^0.10.2` in the migration and use `getClaims()` everywhere server-side. The custom access token hook (for embedding tenant_id in JWT) is available on free tier but is explicitly excluded by the locked decision (no custom JWT hooks). Use the existing `get_current_tenant_id()` DB function approach instead.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `0.10.2` | Server-side Supabase client for Next.js | Official Supabase SSR package, replaces deprecated auth-helpers |
| `@supabase/supabase-js` | `2.103.0` | Supabase JS client | Core client - already in project |
| `next` | `15.x` (project pinned) | App Router, middleware, Server Actions | Already in project - do NOT upgrade mid-phase |
| `zod` | `3.x` (project pinned) | Input validation for auth forms | Already installed. Zod 4.x is latest but breaking - stay on v3 |

**Version verification:** [VERIFIED: npm registry, 2026-04-09]

**Note on versions:** The project currently pins `@supabase/ssr: ^0.5.2` and `@supabase/supabase-js: ^2.47.0`. Both are significantly behind latest (`0.10.2` and `2.103.0`). The migration task must upgrade both. The `getClaims()` API (replacing `getUser()` for server-side) landed in `@supabase/ssr` v0.6+. [VERIFIED: WebSearch/Supabase docs]

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^3.24.1` | Form validation schemas | Auth forms (signup, login, invite) |
| `crypto` (Node built-in) | - | Invite token generation | `randomBytes(32).toString('hex')` for secure invite tokens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth (behind AuthAdapter) | NextAuth.js, Clerk | AuthAdapter interface makes these swappable - default is Supabase because zero config with existing setup |
| DB-based permission check | JWT custom claims | Custom access token hook adds tenant_id to JWT (free tier), but locked decision forbids it to stay free-tier safe without assumptions |
| Path-based routing (default) | Subdomain routing | Subdomain requires DNS + wildcard certs for self-hosters; path works on any host |

**Installation (upgrade):**
```bash
cd packages/web
npm install @supabase/ssr@^0.10.2 @supabase/supabase-js@^2.103.0
```

---

## Architecture Patterns

### Recommended Project Structure
```
packages/web/
├── lib/
│   ├── auth/
│   │   ├── adapter.ts              # AuthAdapter interface (5 methods)
│   │   ├── supabase-adapter.ts     # Default Supabase implementation
│   │   ├── client.ts               # createBrowserClient singleton
│   │   └── server.ts               # createServerClient factory
│   ├── tenant/
│   │   ├── resolver.ts             # TenantResolver interface
│   │   ├── path-resolver.ts        # /t/{slug}/... (DEFAULT)
│   │   ├── subdomain-resolver.ts   # {slug}.domain.com
│   │   ├── header-resolver.ts      # X-Tenant-ID header
│   │   └── context.tsx             # TenantContext React context
│   └── rbac/
│       ├── checker.ts              # PermissionChecker interface + DB impl
│       ├── constants.ts            # DEFAULT_ROLES, DEFAULT_PERMISSIONS seed data
│       └── hooks.ts                # usePermission(action), useRole() hooks
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx  # /auth/confirm?type=recovery
│   │   └── verify-email/page.tsx
│   ├── auth/
│   │   └── callback/route.ts       # PKCE code exchange (magic link, OAuth, email confirm)
│   ├── (tenant)/
│   │   └── t/
│   │       └── [slug]/
│   │           ├── layout.tsx       # Loads TenantContext from resolved slug
│   │           └── dashboard/page.tsx
│   └── invite/
│       └── [token]/page.tsx         # Invitation acceptance
├── middleware.ts                    # Root: tenant resolution + session refresh
└── src/__tests__/
    ├── smoke.test.tsx               # Existing
    ├── auth/
    │   ├── adapter.test.ts
    │   └── supabase-adapter.test.ts
    ├── tenant/
    │   ├── path-resolver.test.ts
    │   └── subdomain-resolver.test.ts
    └── rbac/
        └── checker.test.ts

packages/shared/types/
├── auth.ts       # AuthSession, AuthUser, AuthAdapter interface
├── tenant.ts     # Tenant, TenantUser, TenantResolver interface
└── rbac.ts       # Role, Permission, RolePermission, PermissionChecker interface
```

### Pattern 1: AuthAdapter Interface

**What:** A 5-method interface wrapping any auth provider so the implementation is swappable.

**When to use:** All auth operations go through this interface - never call Supabase directly from components.

```typescript
// Source: CONTEXT.md architecture decision + standard adapter pattern
export interface AuthAdapter {
  signUp(email: string, password: string): Promise<AuthResult>
  signIn(email: string, password: string): Promise<AuthResult>
  signInWithMagicLink(email: string, redirectTo: string): Promise<void>
  signInWithOAuth(provider: 'google' | 'github', redirectTo: string): Promise<void>
  signOut(): Promise<void>
  getSession(): Promise<AuthSession | null>
  getUser(): Promise<AuthUser | null>
  resetPassword(email: string, redirectTo: string): Promise<void>
  updatePassword(newPassword: string): Promise<void>
}
```

### Pattern 2: TenantResolver Interface + Middleware Execution Order

**What:** Three implementations of `TenantResolver`. Middleware runs them in this order: (1) resolve tenant slug, (2) validate tenant exists, (3) refresh auth session, (4) check route protection.

**When to use:** Every request. The resolved `tenantSlug` is passed as `x-tenant-slug` request header to Server Components.

```typescript
// Source: CONTEXT.md + Next.js middleware docs
// middleware.ts execution order:
// 1. resolver.resolve(request) → tenantSlug | null
// 2. If null and route requires tenant → redirect to /t/setup or /login
// 3. createServerClient(cookies) → supabase
// 4. await supabase.auth.getClaims() → validate session (refreshes token if needed)
// 5. Set response headers: x-tenant-slug, Cache-Control: private, no-store
// 6. Return NextResponse.next() or redirect

export interface TenantResolver {
  resolve(request: NextRequest): string | null
}
```

**Matcher config:**
```typescript
// Source: [ASSUMED] - standard Next.js middleware matcher pattern
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Supabase SSR Client Factories

**What:** Two factories - one for browser (singleton), one for server (per-request).

```typescript
// Source: [CITED: supabase.com/docs/guides/auth/server-side/creating-a-client]

// lib/auth/client.ts - browser singleton
import { createBrowserClient } from '@supabase/ssr'
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/auth/server.ts - per-request factory
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

### Pattern 4: Auth Callback Route (PKCE Code Exchange)

**What:** Single route handler at `/auth/callback` handles all PKCE flows: magic link, OAuth, email verification, password reset.

```typescript
// Source: [CITED: makerkit.dev/courses/nextjs-app-router/authentication + supabase docs]
// app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const type = searchParams.get('type')  // 'recovery' for password reset
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(`${origin}/login?error=${error}`)

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  if (type === 'recovery') return NextResponse.redirect(`${origin}/auth/reset-password`)
  return NextResponse.redirect(`${origin}${next}`)
}
```

### Pattern 5: RBAC Permission Check

**What:** DB-backed permission check function. No JWT claims needed. Checks `role_permissions` junction via the user's role in the tenant.

```typescript
// Source: CONTEXT.md permission model + [ASSUMED] standard DB lookup pattern
export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  action: string
): Promise<boolean> {
  const { data } = await supabase
    .from('tenant_users')
    .select('role_id, roles!inner(role_permissions!inner(permissions!inner(action)))')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('roles.role_permissions.permissions.action', action)
    .single()
  return !!data
}
```

### Pattern 6: Invite Token Generation

**What:** Secure random token stored in `invitations` table. Both email and link invites use the same row.

```typescript
// Source: [ASSUMED] Node.js crypto standard pattern
import { randomBytes } from 'crypto'
const token = randomBytes(32).toString('hex')  // 64-char hex string
// Store: { token, tenant_id, role_id, email (nullable for link invites),
//          invite_type: 'email'|'link', status: 'pending',
//          max_uses: 1 (email) | null (link with configurable limit),
//          expires_at: now() + 7 days }
```

### Anti-Patterns to Avoid

- **Calling `getSession()` server-side:** Returns unvalidated cached session. Use `getClaims()` in middleware and server code. [CITED: supabase.com/docs/guides/auth/server-side/creating-a-client]
- **Storing auth state in URL:** OAuth state should use PKCE, not URL params. `@supabase/ssr` handles PKCE automatically.
- **Hardcoded permission enums in TypeScript:** Permission strings must come from DB, not TS constants. TS types can describe the shape but not enumerate values.
- **Bypassing RLS with service role key in client code:** Only use `service_role` key in server-side trusted code (migrations, admin). Never expose it.
- **Multi-tenant resolver in page components:** Tenant resolution belongs exclusively in middleware and layout. Page components receive tenant from context only.
- **Calling `get_current_tenant_id()` from app code:** This is a DB function for RLS policies only. App code should pass `tenant_id` explicitly and let RLS enforce isolation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session refresh across SSR | Custom cookie JWT management | `@supabase/ssr` `createServerClient` + middleware | Token rotation, PKCE, secure cookie flags all handled |
| Email/password auth | Custom bcrypt + JWT | Supabase Auth | Rate limiting, email verification, password strength all built in |
| OAuth flow (Google/GitHub) | Custom OAuth 2.0 flow | Supabase `signInWithOAuth` | State management, PKCE, callback URL handling, token exchange |
| Magic link | Custom email + token DB | Supabase `signInWithOtp` | Time-limited tokens, rate limiting, secure delivery |
| Form validation | Custom validators | `zod` schemas | Type-safe, composable, reusable across client/server |
| Secure token generation | `Math.random()` | Node `crypto.randomBytes(32)` | Cryptographically secure, 256-bit entropy |

**Key insight:** Supabase Auth handles the entire auth lifecycle. The `AuthAdapter` wraps it - never bypass it to call Supabase directly.

---

## Common Pitfalls

### Pitfall 1: `getSession()` vs `getClaims()` on Server
**What goes wrong:** Using `supabase.auth.getSession()` in Server Components or middleware returns an unvalidated session from cookies - can be forged.
**Why it happens:** Old tutorials and pre-`@supabase/ssr` 0.6 code used `getSession()`.
**How to avoid:** Always use `supabase.auth.getClaims()` for server-side auth checks. It validates JWT signature against Supabase's published public keys.
**Warning signs:** Any server-side code calling `getSession()` is a security bug. [CITED: supabase.com/docs/guides/auth/server-side/creating-a-client]

### Pitfall 2: Package Version Mismatch
**What goes wrong:** Project pins `@supabase/ssr: ^0.5.2` but `getClaims()` landed in 0.6+. Using old package means falling back to deprecated `getUser()` pattern.
**Why it happens:** Phase 1 scaffolding pinned older versions.
**How to avoid:** First task in Wave 0 must upgrade `@supabase/ssr` to `^0.10.2` and `@supabase/supabase-js` to `^2.103.0`.
**Warning signs:** TypeScript error `Property 'getClaims' does not exist` means wrong version. [VERIFIED: npm registry 2026-04-09]

### Pitfall 3: Missing `Cache-Control: private, no-store` on Auth Routes
**What goes wrong:** CDN or edge cache serves one user's authenticated response to another user.
**Why it happens:** Next.js defaults to caching. Auth middleware doesn't set cache headers.
**How to avoid:** All middleware responses after auth checks must set `Cache-Control: private, no-store`. [CITED: supabase.com/docs/guides/auth/server-side/advanced-guide]

### Pitfall 4: Tenant Resolution Before Auth in Middleware
**What goes wrong:** Auth check runs before tenant is resolved, meaning you can't use tenant context in auth decisions.
**Why it happens:** Naively putting auth check first.
**How to avoid:** Order in middleware: tenant resolution first, then session refresh, then route protection.

### Pitfall 5: `tenant_users.role` Column Migration
**What goes wrong:** Phase 1 schema has `tenant_users.role` as a text column with a CHECK constraint (`'owner' | 'admin' | 'member' | 'viewer'`). Phase 2 adds a `roles` table and needs `tenant_users.role_id` FK.
**Why it happens:** Schema evolution without a migration plan.
**How to avoid:** Migration must: (1) add `roles` table and seed defaults, (2) add `role_id uuid` column to `tenant_users`, (3) populate `role_id` from existing `role` text values, (4) add FK constraint, (5) eventually drop the old `role` text column (can defer to Phase 3 for backward compat).
**Warning signs:** If both `role` text and `role_id` FK exist simultaneously, RLS policies get ambiguous. [VERIFIED: existing migration inspection]

### Pitfall 6: RLS on New Tables
**What goes wrong:** New tables (`roles`, `permissions`, `role_permissions`, `invitations`) without RLS policies allow any authenticated user to read/write any tenant's data.
**Why it happens:** Forgetting to enable RLS + add policies for new tables.
**How to avoid:** Every new table migration must include: `ALTER TABLE x ENABLE ROW LEVEL SECURITY` + appropriate policies. Roles/permissions can be readable by all tenant members. `invitations` must be scoped to tenant.

### Pitfall 7: Subdomain Resolution Needing `NEXT_PUBLIC_APP_DOMAIN`
**What goes wrong:** Subdomain resolver needs to know the base domain to strip it from `Host` header. Hardcoding it breaks local dev and multi-domain deployments.
**Why it happens:** Subdomain resolver receives `tenant.sovra.dev` and needs to extract `tenant`.
**How to avoid:** `NEXT_PUBLIC_APP_DOMAIN` env var (default: `localhost:3000`). Subdomain resolver strips base domain; path resolver doesn't need it.

### Pitfall 8: OAuth Callback URL Configuration
**What goes wrong:** Google/GitHub OAuth redirect goes to wrong URL (production URL in dev, or vice versa).
**Why it happens:** OAuth providers have fixed allowed redirect URLs.
**How to avoid:** Supabase dashboard → Auth → URL Configuration → add both `http://localhost:3000/auth/callback` and production URL. `signInWithOAuth` passes `redirectTo` option but it must match a configured URL. [CITED: supabase.com/docs/guides/auth/social-login/auth-google]

---

## Code Examples

### Middleware (combined tenant + auth)
```typescript
// Source: [ASSUMED from official patterns - see Supabase SSR + Next.js middleware docs]
// packages/web/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { resolveTenant } from '@/lib/tenant/resolver'

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/auth/callback', '/invite']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Step 1: Resolve tenant (before auth)
  const tenantSlug = resolveTenant(request)

  // Step 2: Create Supabase client with cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    }
  )

  // Step 3: Refresh session (getClaims validates JWT signature)
  const { data: { claims } } = await supabase.auth.getClaims()

  // Step 4: Set cache headers to prevent CDN session leakage
  response.headers.set('Cache-Control', 'private, no-store')

  // Step 5: Set resolved tenant for Server Components
  if (tenantSlug) {
    response.headers.set('x-tenant-slug', tenantSlug)
  }

  // Step 6: Route protection
  const isPublicRoute = PUBLIC_ROUTES.some(r => request.nextUrl.pathname.startsWith(r))
  if (!claims && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)'],
}
```

### Path-Based Tenant Resolver
```typescript
// Source: [ASSUMED] - CONTEXT.md spec for path routing
// lib/tenant/path-resolver.ts
export class PathTenantResolver implements TenantResolver {
  resolve(request: NextRequest): string | null {
    const match = request.nextUrl.pathname.match(/^\/t\/([^\/]+)/)
    return match?.[1] ?? null
  }
}
```

### Subdomain Tenant Resolver
```typescript
// Source: [ASSUMED from WebSearch findings on Next.js subdomain routing]
// lib/tenant/subdomain-resolver.ts
export class SubdomainTenantResolver implements TenantResolver {
  private baseDomain: string
  constructor() {
    this.baseDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'localhost'
  }
  resolve(request: NextRequest): string | null {
    const host = request.headers.get('host') ?? ''
    const hostname = host.split(':')[0]  // strip port
    if (hostname === this.baseDomain || hostname === 'www.' + this.baseDomain) return null
    const subdomain = hostname.replace(`.${this.baseDomain}`, '')
    return subdomain !== hostname ? subdomain : null  // no match = no subdomain
  }
}
```

### RBAC Migration (Phase 2 new tables)
```sql
-- Source: [ASSUMED from CONTEXT.md schema requirements]
-- Add to new migration file

-- roles: tenant-scoped, seeded with defaults
create table roles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  description text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique(tenant_id, name)
);

-- permissions: global registry of available actions
create table permissions (
  id          uuid primary key default gen_random_uuid(),
  action      text unique not null,  -- 'agent:create', 'workspace:manage', etc.
  description text,
  resource    text not null,  -- 'agent', 'workspace', 'billing', etc.
  created_at  timestamptz not null default now()
);

-- role_permissions: which permissions a role has
create table role_permissions (
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- invitations: both email and link types
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text,                             -- null for link-based invites
  role_id     uuid not null references roles(id),
  token       text unique not null,             -- 64-char hex
  invite_type text not null default 'email'
              check (invite_type in ('email', 'link')),
  status      text not null default 'pending'
              check (status in ('pending', 'accepted', 'expired', 'revoked')),
  max_uses    integer,                          -- null = unlimited for link type
  use_count   integer not null default 0,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

-- Migrate tenant_users.role text → role_id FK
alter table tenant_users add column role_id uuid references roles(id);
-- (populate role_id via data migration in the same migration, then make not null)
```

### Default Role/Permission Seed Data
```typescript
// Source: [ASSUMED from CONTEXT.md spec] - constants.ts
export const DEFAULT_ROLES = ['owner', 'admin', 'member', 'viewer'] as const

export const DEFAULT_PERMISSIONS = [
  // agents
  { action: 'agent:create', resource: 'agent' },
  { action: 'agent:read', resource: 'agent' },
  { action: 'agent:update', resource: 'agent' },
  { action: 'agent:delete', resource: 'agent' },
  // workspaces
  { action: 'workspace:create', resource: 'workspace' },
  { action: 'workspace:read', resource: 'workspace' },
  { action: 'workspace:manage', resource: 'workspace' },
  { action: 'workspace:delete', resource: 'workspace' },
  // members
  { action: 'member:invite', resource: 'member' },
  { action: 'member:remove', resource: 'member' },
  { action: 'member:update_role', resource: 'member' },
  // billing
  { action: 'billing:read', resource: 'billing' },
  { action: 'billing:manage', resource: 'billing' },
  // settings
  { action: 'settings:read', resource: 'settings' },
  { action: 'settings:manage', resource: 'settings' },
]

// owner gets all; admin gets all except billing:manage;
// member gets agent:*, workspace:read; viewer gets :read only
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023–2024 | auth-helpers is deprecated; migration doc exists |
| `getSession()` server-side | `getClaims()` server-side | `@supabase/ssr` v0.6+ (2024) | `getClaims()` validates JWT signature; `getSession()` trusts unverified cookie |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 2025 (Supabase key redesign) | Both work; new projects should use publishable key form `sb_publishable_xxx` |
| Hardcoded role enum in DB CHECK | Roles table with FK | CONTEXT.md decision | Enables per-tenant custom roles without DB schema changes |
| `supabase.auth.getUser()` for middleware | `supabase.auth.getClaims()` | 2025 (ssr 0.6+) | Faster (no network roundtrip), still cryptographically verified |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Do NOT install. Use `@supabase/ssr`.
- `createMiddlewareClient` (from auth-helpers): Does not exist in `@supabase/ssr`. Use `createServerClient` with manual cookie wiring.
- `getSession()` in server code: Security risk - use `getClaims()`. [CITED: Supabase docs]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `getClaims()` API exists in `@supabase/ssr` ^0.10.2 | Standard Stack, Code Examples | If API doesn't exist, fall back to `getUser()` (makes network call to Supabase on each request) |
| A2 | `crypto.randomBytes` available in Next.js API routes without polyfill | Code Examples (invite tokens) | May need `import { randomBytes } from 'crypto'` - works in Node runtime but not Edge |
| A3 | `roles` table `unique(tenant_id, name)` constraint sufficient | Architecture Patterns | If tenants need case-insensitive uniqueness, add a lowercase check constraint |
| A4 | Invite token route at `/invite/[token]` works without tenant context in URL | File Structure | Path-based tenants require `/t/[slug]/invite/[token]` instead - but invitation flow should work pre-tenant-context |
| A5 | `tenant_users.role` text column can be kept alongside new `role_id` FK temporarily | Common Pitfalls | If DB has production data before Phase 2, migration must backfill `role_id` before adding NOT NULL |
| A6 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not new publishable key) is correct for self-hosted Supabase | Standard Stack | Self-hosted Supabase may not support publishable key format yet - verify against Supabase CLI version `2.84.2` |

---

## Open Questions

1. **`getClaims()` exact API signature in `@supabase/ssr` 0.10.2**
   - What we know: Documented as replacement for `getUser()`, validates JWT locally
   - What's unclear: Returns `{ data: { claims }, error }` or different shape? Middleware example above may need adjustment.
   - Recommendation: Check TypeScript types after `npm install @supabase/ssr@^0.10.2` - the planner should add a Wave 0 task to verify the API shape.

2. **Self-hosted Supabase and publishable key format**
   - What we know: Supabase is redesigning keys; new format is `sb_publishable_xxx`
   - What's unclear: Does the local Supabase CLI 2.84.2 generate publishable keys or only anon keys?
   - Recommendation: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for now. Document that `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be needed for hosted Supabase projects.

3. **`get_current_tenant_id()` with multi-tenant users**
   - What we know: The Phase 1 helper returns `limit 1` - a user belonging to multiple tenants gets an arbitrary tenant
   - What's unclear: Should the function accept a `tenant_id` parameter, or should RLS be bypassed via explicit `tenant_id` in queries?
   - Recommendation: The middleware-resolved `tenant_id` should be used in app queries explicitly. The `get_current_tenant_id()` function is a fallback for RLS policies only.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migrations, local dev | ✓ | 2.84.2 | - |
| Node.js crypto | Invite token generation | ✓ | Built-in | `webcrypto` if Edge runtime |
| `@supabase/ssr` 0.10.2 | Auth, session management | Needs upgrade (pinned 0.5.2) | Must install | - |
| Google OAuth app | AUTH-03 (Google login) | Unknown - config in Google Cloud | - | Skip in local dev; docs explain setup |
| GitHub OAuth app | AUTH-03 (GitHub login) | Unknown - config in GitHub | - | Skip in local dev; docs explain setup |
| SMTP / email | AUTH-02, AUTH-05, AUTH-06, RBAC-04 (email invites) | Unknown - Supabase project config | - | Magic link + invites work via invite links without SMTP |

**Missing dependencies with no fallback:**
- None that block core implementation. OAuth providers require external dashboard config but don't block local dev.

**Missing dependencies with fallback:**
- SMTP: Supabase sends auth emails via Supabase's own mailer in hosted mode. Self-hosted needs SMTP configured. Invite links work without SMTP.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x + @testing-library/react 16.x |
| Config file | `packages/web/vitest.config.ts` |
| Quick run command | `cd packages/web && npm test` |
| Full suite command | `cd packages/web && npm test -- --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Email/password signup and login | unit | `npm test -- auth/adapter` | ❌ Wave 0 |
| AUTH-02 | Magic link `signInWithOtp` called | unit | `npm test -- auth/adapter` | ❌ Wave 0 |
| AUTH-03 | OAuth `signInWithOAuth` called with provider | unit | `npm test -- auth/adapter` | ❌ Wave 0 |
| AUTH-04 | Session retrieved from cookies (server) | unit | `npm test -- auth/server` | ❌ Wave 0 |
| AUTH-05 | Password reset email triggered | unit | `npm test -- auth/adapter` | ❌ Wave 0 |
| AUTH-06 | Callback route exchanges code for session | unit | `npm test -- auth/callback` | ❌ Wave 0 |
| TEN-01 | Tenant creation inserts row + creates owner role | unit | `npm test -- tenant/` | ❌ Wave 0 |
| TEN-02 | RLS blocks cross-tenant data access | manual | Manual SQL test with 2 users | N/A |
| TEN-03 | Tenant context present in Server Component | unit | `npm test -- tenant/context` | ❌ Wave 0 |
| TEN-04 | SubdomainResolver extracts slug from host | unit | `npm test -- tenant/subdomain-resolver` | ❌ Wave 0 |
| RBAC-01 | Default roles seeded on tenant creation | unit | `npm test -- rbac/` | ❌ Wave 0 |
| RBAC-02 | `hasPermission` returns correct boolean | unit | `npm test -- rbac/checker` | ❌ Wave 0 |
| RBAC-03 | Route returns 403 without permission | unit (middleware mock) | `npm test -- middleware` | ❌ Wave 0 |
| RBAC-04 | Invite token accepted, user added to tenant | unit | `npm test -- rbac/invitation` | ❌ Wave 0 |

**Note:** Supabase DB calls must be mocked in unit tests - never hit real DB in test suite.

### Sampling Rate
- **Per task commit:** `cd packages/web && npm test`
- **Per wave merge:** `cd packages/web && npm test -- --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/web/src/__tests__/auth/adapter.test.ts` - covers AUTH-01..05
- [ ] `packages/web/src/__tests__/auth/server.test.ts` - covers AUTH-04
- [ ] `packages/web/src/__tests__/auth/callback.test.ts` - covers AUTH-06
- [ ] `packages/web/src/__tests__/tenant/path-resolver.test.ts` - covers TEN-03 (path)
- [ ] `packages/web/src/__tests__/tenant/subdomain-resolver.test.ts` - covers TEN-04
- [ ] `packages/web/src/__tests__/tenant/context.test.tsx` - covers TEN-03
- [ ] `packages/web/src/__tests__/rbac/checker.test.ts` - covers RBAC-01, RBAC-02
- [ ] `packages/web/src/__tests__/rbac/invitation.test.ts` - covers RBAC-04
- [ ] `packages/web/src/__tests__/middleware.test.ts` - covers AUTH-04, RBAC-03
- [ ] Shared mock: `packages/web/src/__tests__/mocks/supabase.ts` - Supabase client mock

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (email/password, magic link, OAuth) via AuthAdapter |
| V3 Session Management | yes | `@supabase/ssr` cookie-based sessions; `getClaims()` for validation; `Cache-Control: private, no-store` |
| V4 Access Control | yes | `PermissionChecker` interface; RLS enforces tenant isolation at DB layer |
| V5 Input Validation | yes | `zod` schemas on all auth forms and invite endpoints |
| V6 Cryptography | yes | Supabase JWT (RS256); invite tokens via `crypto.randomBytes(32)` - never `Math.random()` |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-tenant data access | Elevation of Privilege | RLS on all tables via `get_current_tenant_id()`; never bypass with service_role in client code |
| Session fixation | Tampering | Supabase rotates tokens on login; PKCE prevents code interception |
| Invite token brute force | Tampering | 256-bit tokens (64-char hex); `expires_at` enforced; `max_uses` tracked in DB |
| OAuth state forgery | Spoofing | `@supabase/ssr` handles PKCE state automatically |
| CDN session leakage | Information Disclosure | `Cache-Control: private, no-store` in all middleware responses |
| Unvalidated JWT server-side | Elevation of Privilege | `getClaims()` validates signature; never `getSession()` on server |
| Permission check bypass | Elevation of Privilege | RLS is the last line of defense; app-level checks are defense-in-depth |

---

## Sources

### Primary (HIGH confidence)
- [supabase.com/docs/guides/auth/server-side/creating-a-client](https://supabase.com/docs/guides/auth/server-side/creating-a-client) - `createBrowserClient`, `createServerClient`, `getClaims()` vs `getSession()`
- [supabase.com/docs/guides/auth/server-side/advanced-guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) - `Cache-Control: private, no-store` requirement
- [supabase.com/docs/guides/auth/auth-hooks](https://supabase.com/docs/guides/auth/auth-hooks) - custom access token hook free tier availability
- npm registry - `@supabase/ssr` 0.10.2 (2026-04-09), `@supabase/supabase-js` 2.103.0 (2026-04-09)
- Existing Phase 1 migration `20260412004330_initial_schema.sql` - schema baseline verified

### Secondary (MEDIUM confidence)
- [supabase.com/docs/guides/auth/social-login/auth-google](https://supabase.com/docs/guides/auth/social-login/auth-google) - Google OAuth callback URL pattern
- [makerkit.dev/courses/nextjs-app-router/authentication](https://makerkit.dev/courses/nextjs-app-router/authentication) - callback route `exchangeCodeForSession` pattern
- WebSearch: Next.js 15 middleware patterns, subdomain routing patterns (multiple sources)

### Tertiary (LOW confidence)
- WebSearch: multi-tenant RLS permission table design patterns (general PostgreSQL community articles)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified against npm registry 2026-04-09
- Architecture: HIGH - locked decisions from CONTEXT.md + verified Supabase SSR patterns
- Pitfalls: HIGH - version mismatch verified (registry), security items cited from official docs
- Code examples: MEDIUM - patterns verified from docs/community, exact API shapes flagged as open questions

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable - Supabase SSR, Next.js 15 are stable releases)
