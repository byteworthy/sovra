# Phase 2: Core Infrastructure - Context

**Phase:** 2 of 6
**Goal:** Implement authentication, multi-tenancy, and RBAC
**Requirements:** AUTH-01..06, TEN-01..04, RBAC-01..04

## Grey Area Decisions

### 1. Auth Provider Strategy
**Decision:** Supabase Auth native - behind an `AuthAdapter` interface
**Rationale:** Open-source boilerplate must not lock users into one auth provider. Supabase Auth is the default (zero config with existing Supabase setup). An `AuthAdapter` interface allows swapping to NextAuth, Clerk, Auth0, or custom providers by implementing ~5 methods (signUp, signIn, signOut, getSession, getUser). No custom JWT hooks - keeps it working on Supabase free tier.

### 2. Multi-Tenant Routing
**Decision:** All three strategies via config - subdomain, path, header
**Implementation:** A `TenantResolver` interface with 3 implementations. `TENANT_RESOLUTION_STRATEGY` env var selects one. Default: `path` (simplest for local dev and self-hosters). Subdomain for SaaS deployments. Header for API-first/headless usage.
- Path: `/t/{slug}/dashboard`
- Subdomain: `{slug}.sovra.dev`
- Header: `X-Tenant-ID` or `X-Tenant-Slug`

### 3. Permission Model
**Decision:** Role + permissions table - customizable per tenant
**Rationale:** Hardcoded permission enums force forks. Open-source users need custom roles ("billing admin", "analyst", "agent operator"). Schema: `roles` table (tenant-scoped, seeded with owner/admin/member/viewer), `permissions` table (action strings), `role_permissions` junction. A `hasPermission(userId, tenantId, action)` utility checks via DB. Permission strings follow `resource:action` format (e.g., `agent:create`, `workspace:manage`, `billing:read`).

### 4. Invitation Flow
**Decision:** Both email invitations + shareable invite links
**Rationale:** Open-source deployers may not have SMTP configured. Invite links work without email. Email invitations for production setups. An `invitations` table tracks both types (status: pending/accepted/expired). Invite links have configurable expiry and max-use count.

### 5. Session Strategy
**Decision:** Supabase Auth JWT (default) with server-side session option
**Implementation:** Supabase handles JWT issuance/refresh natively. `@supabase/ssr` for cookie-based session management in Next.js. Server components read session from cookies. Client components use `useSession()` hook. Refresh handled automatically by Supabase client.

## Architecture Principles (Open-Source Optimized)

1. **Interfaces at every boundary** - AuthAdapter, TenantResolver, PermissionChecker
2. **Sensible defaults, zero mandatory config** - Works with just Supabase URL + anon key
3. **No vendor lock-in** - Every external dependency is behind an abstraction
4. **Progressive complexity** - Simple path routing + role-only permissions work out of the box. Subdomain routing + custom permissions are opt-in.
5. **Self-hostable** - No features that require paid tiers of any service

## Schema Changes Required

New migration for Phase 2:
- `roles` table (id, tenant_id, name, description, is_default, created_at)
- `permissions` table (id, action, description, resource, created_at)
- `role_permissions` junction (role_id, permission_id)
- `invitations` table (id, tenant_id, email, role_id, token, invite_type, status, max_uses, use_count, expires_at, created_at)
- Seed default roles and permissions
- Update RLS policies for new tables
- Migrate existing `tenant_users.role` text column to reference `roles` table

## File Structure Plan

```
packages/web/
├── lib/
│   ├── auth/
│   │   ├── adapter.ts          # AuthAdapter interface
│   │   ├── supabase-adapter.ts # Default Supabase implementation
│   │   ├── client.ts           # Browser auth client
│   │   └── server.ts           # Server-side auth utilities
│   ├── tenant/
│   │   ├── resolver.ts         # TenantResolver interface
│   │   ├── path-resolver.ts    # Path-based (default)
│   │   ├── subdomain-resolver.ts
│   │   ├── header-resolver.ts
│   │   └── middleware.ts       # Next.js middleware for tenant resolution
│   └── rbac/
│       ├── permissions.ts      # Permission checking utilities
│       ├── constants.ts        # Default role/permission seed data
│       └── hooks.ts            # usePermission, useRole hooks
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── callback/route.ts   # OAuth callback
│   ├── (tenant)/
│   │   └── t/[slug]/
│   │       ├── layout.tsx      # Tenant layout with context
│   │       └── dashboard/page.tsx
│   └── invite/[token]/page.tsx # Invitation acceptance
├── components/
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── signup-form.tsx
│   │   ├── oauth-buttons.tsx
│   │   └── auth-guard.tsx
│   └── tenant/
│       ├── tenant-switcher.tsx
│       ├── invite-form.tsx
│       └── member-list.tsx
└── middleware.ts               # Root middleware (auth + tenant)

packages/shared/
└── types/
    ├── auth.ts                 # Auth types
    ├── tenant.ts               # Tenant types
    └── rbac.ts                 # Role/permission types
```

## Dependencies to Add

- `@supabase/ssr` - Server-side Supabase client for Next.js
- `@supabase/supabase-js` - Already likely present, verify version
- `zod` - Input validation for auth forms
- No additional auth libraries - Supabase Auth handles email, magic link, OAuth natively

## Success Criteria (from ROADMAP.md)

1. User can sign up with email/password
2. User can log in with Google OAuth
3. User can create a new tenant
4. Tenant context is enforced in all queries
5. RLS prevents user A from seeing tenant B's data
6. Owner can invite users to tenant
7. Roles correctly restrict access (viewer can't delete agents)
8. Sessions persist across browser refresh
