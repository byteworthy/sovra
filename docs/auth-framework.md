# Auth and Middleware Framework

Sovra uses a layered auth framework that combines middleware controls, Supabase session validation, and database-level tenant isolation.

## Core principles

1. Session validation is performed against Supabase Auth (`getUser`) rather than trusting raw cookies.
2. Tenant isolation is enforced by PostgreSQL RLS policies.
3. Middleware adds route-level guards and secure defaults (headers + cache controls).
4. Redirect flows use sanitized `next` paths to prevent open redirects.

## Middleware behavior summary

`packages/web/middleware.ts` applies these rules:

- Public routes (`/`, `/docs`, auth routes, selected webhooks/health) bypass hard auth checks.
- Authenticated users are redirected away from `/auth/login` and `/auth/signup`.
- Protected page routes redirect unauthenticated users to `/auth/login?next=...`.
- Protected API routes return JSON `401` (no HTML redirects).
- Admin routes require both authentication and `is_platform_admin`.
- Authenticated responses are marked `Cache-Control: private, no-store`.
- Security headers are set on all middleware responses.

## Security headers set in middleware

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Origin-Agent-Cluster: ?1`

## Redirect safety utilities

`packages/web/lib/auth/redirect.ts` centralizes redirect hygiene:

- `sanitizeRedirectPath`: allows only safe relative paths.
- `appendNextParam`: appends safe `next` values for auth links.
- `buildAuthCallbackUrl`: builds callback URLs with safe `next` propagation.

## OAuth and magic-link flow

Auth pages pass `next` through OAuth and magic-link callback URLs so users return to the intended destination after successful sign-in.

## Validation and tests

Coverage is enforced by:

- `packages/web/src/__tests__/middleware.test.ts`
- `packages/web/src/__tests__/auth/callback.test.ts`
- `packages/web/src/__tests__/auth/redirect.test.ts`

