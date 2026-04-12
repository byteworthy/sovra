# Phase 6: Production Ready - Research

**Researched:** 2026-04-12
**Domain:** Billing (Lemon Squeezy), Admin Dashboard, API Keys, Deployment (Railway/AWS/GCP), Monitoring (Sentry/PostHog)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Lemon Squeezy for billing (swappable like auth adapter pattern)
- Tenant-scoped everything via RLS -- admin must have super-admin role bypass
- Next.js App Router with Supabase auth
- Go worker for background processing
- Open-source flexibility -- billing provider must be swappable (Lemon Squeezy default, Stripe alternative)
- No em dashes in copywriting
- Premium UI for admin dashboard
- ai@3.4.33 SDK constraint (confirmed: package.json has `"ai": "^3.2.0"`)
- Deployment configs should work for self-hosted deployments

### Claude's Discretion
All other implementation choices are at Claude's discretion. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None -- discuss phase skipped.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BILL-01 | Subscription management (Lemon Squeezy integration) | `@lemonsqueezy/lemonsqueezy.js` v4.0.0 SDK; `subscriptions` table already exists with `lemon_squeezy_id` field |
| BILL-02 | Plan definitions (free, pro, enterprise) | Plan config map in `lib/billing/plans.ts`; subscriptions.plan col already has `text` type |
| BILL-03 | Usage tracking (API calls, storage, agents) | Existing `tool_executions` table for API cost; custom usage counters in `subscriptions` metadata or new `usage_tracking` table |
| BILL-04 | Customer portal access | LemonSqueezy customer portal URL via SDK `getSubscription()` response; redirect pattern |
| BILL-05 | Webhook handling for subscription events | HMAC-SHA256 signature verification; events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed` |
| ADMIN-01 | Admin dashboard UI | `/app/admin/` route group; super-admin check via `users.is_platform_admin` (requires migration) |
| ADMIN-02 | Tenant management (CRUD) | Supabase service-role client bypasses RLS for admin queries |
| ADMIN-03 | User management | Service-role queries against `users` + `tenant_users` |
| ADMIN-04 | System analytics overview | Aggregate queries with service-role; no third-party needed |
| ADMIN-05 | Audit logs viewer | Read from `audit_logs` table; existing schema is complete |
| APIK-01 | API key creation with permissions | `bsk_` prefix + crypto.randomBytes(32) → base64url; store SHA-256 hash in `key_hash` col |
| APIK-02 | API key authentication | API key middleware in Next.js route handlers; lookup by prefix, verify hash |
| APIK-03 | Rate limiting per key | `@upstash/ratelimit` v2.0.8 + `@upstash/redis` v1.37.0; sliding window by `key_prefix` |
| APIK-04 | API key usage tracking | `UPDATE api_keys SET last_used_at = now()` on each authenticated request |
| APIK-05 | API key expiration | Check `expires_at < now()` and `revoked_at IS NULL` on every auth |
| DEPL-01 | Railway deployment configuration | `railway.toml` per service; monorepo watch paths; auto-detects pnpm |
| DEPL-02 | AWS ECS/Cloud Run deployment configuration | Task definition JSON + service YAML for web+worker; ALB target groups |
| DEPL-03 | GCP Cloud Run deployment configuration | `service.yaml` per service; Cloud Build `cloudbuild.yaml` |
| DEPL-04 | GitHub Actions CI/CD workflow | Path-filtered workflows; pnpm cache; Docker layer cache via `type=gha` |
| DEPL-05 | Environment variable documentation | `.env.example` in root + per-service; deployment README section |
| MON-01 | Sentry error tracking | `@sentry/nextjs` v10.48.0; `instrumentation.ts` + `next.config.ts` wrapping |
| MON-02 | PostHog analytics | `posthog-js` v1.367.0 (client) + `posthog-node` v5.29.2 (server); provider component |
| MON-03 | Health check endpoints | Next.js `/api/health` route (already referenced in docker-compose healthcheck); Go `/health` already exists |
| MON-04 | Custom metrics | PostHog custom events for agent execution, tool usage, workspace runs |
</phase_requirements>

---

## Summary

Phase 6 adds the production layer to a feature-complete ByteSwarm: billing via Lemon Squeezy, a super-admin dashboard bypassing tenant RLS, API key issuance and authentication, multi-cloud deployment configs, and observability with Sentry + PostHog.

The database schema is largely ready -- `subscriptions`, `api_keys`, `audit_logs` tables all exist with correct columns and RLS policies. The main gaps are: (1) no `is_platform_admin` field on `users` for super-admin access, (2) no billing SDK installed, (3) no rate-limiting infrastructure, (4) no deployment config files in `platform/`, (5) no Sentry/PostHog SDKs installed, and (6) no `/api/health` route in Next.js (the docker-compose healthcheck references it but it does not exist yet).

**Primary recommendation:** Wave 0 adds the `is_platform_admin` migration and installs all SDKs. Wave 1 implements billing. Wave 2 implements API keys + rate limiting. Wave 3 is admin dashboard. Wave 4 is monitoring. Wave 5 is deployment configs + CI/CD.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@lemonsqueezy/lemonsqueezy.js` | 4.0.0 | Official Lemon Squeezy SDK | Only official LS SDK; typed responses; handles webhook verification helpers |
| `@sentry/nextjs` | 10.48.0 | Error tracking | Official Next.js Sentry integration; App Router support; `instrumentation.ts` pattern |
| `posthog-js` | 1.367.0 | Client-side analytics | Official PostHog web SDK; used by frontend provider component |
| `posthog-node` | 5.29.2 | Server-side analytics | Official PostHog server SDK; use with `flushAt:1, flushInterval:0` in Next.js Route Handlers |
| `@upstash/ratelimit` | 2.0.8 | Rate limiting per API key | Sliding window; works in Next.js Edge/Node runtime; standard for serverless rate limiting |
| `@upstash/redis` | 1.37.0 | Redis client for rate limiter | HTTP/REST Redis client; works in both edge and Node runtimes; peer dep of ratelimit |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `crypto` (Node built-in) | built-in | API key generation + hashing | `crypto.randomBytes(32)` for key generation; `crypto.createHash('sha256')` for storage |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@upstash/ratelimit` | In-memory rate limiter | In-memory doesn't survive restarts; fails across multiple containers |
| Upstash Redis | Self-hosted Redis | Self-hosted needs Docker service + network; Upstash free tier sufficient for open-source |
| `posthog-node` flush pattern | Standard batch flush | Next.js serverless functions are short-lived; must flush immediately |

**Installation:**
```bash
# From repo root (pnpm workspace)
pnpm --filter @byteswarm/web add @lemonsqueezy/lemonsqueezy.js@4.0.0
pnpm --filter @byteswarm/web add @sentry/nextjs@10.48.0
pnpm --filter @byteswarm/web add posthog-js@1.367.0 posthog-node@5.29.2
pnpm --filter @byteswarm/web add @upstash/ratelimit@2.0.8 @upstash/redis@1.37.0
```

**Version verification:** All versions verified against npm registry on 2026-04-12. [VERIFIED: npm registry]

---

## Architecture Patterns

### Recommended Project Structure (new files only)

```
packages/web/
├── app/
│   ├── api/
│   │   ├── health/route.ts           # MON-03: Next.js health endpoint
│   │   ├── billing/
│   │   │   ├── webhook/route.ts      # BILL-05: LS webhook handler
│   │   │   └── portal/route.ts      # BILL-04: redirect to customer portal
│   │   └── keys/
│   │       ├── route.ts              # APIK-01: create + list API keys
│   │       └── [id]/route.ts        # revoke a key
│   ├── (admin)/                      # route group - no layout URL segment
│   │   ├── layout.tsx               # super-admin guard
│   │   └── admin/
│   │       ├── page.tsx             # ADMIN-01: dashboard overview
│   │       ├── tenants/page.tsx     # ADMIN-02: tenant CRUD
│   │       ├── users/page.tsx       # ADMIN-03: user management
│   │       └── audit/page.tsx       # ADMIN-05: audit log viewer
│   └── (tenant)/t/[slug]/
│       └── billing/page.tsx         # tenant billing settings + portal link
├── lib/
│   ├── billing/
│   │   ├── plans.ts                  # BILL-02: plan definitions + limits
│   │   ├── client.ts                 # LS SDK client factory
│   │   ├── actions.ts               # server actions: get subscription
│   │   ├── webhook.ts               # BILL-05: event handlers
│   │   └── __tests__/billing.test.ts
│   ├── api-keys/
│   │   ├── generator.ts             # APIK-01: key generation
│   │   ├── authenticator.ts         # APIK-02: key verification
│   │   ├── rate-limiter.ts          # APIK-03: Upstash sliding window
│   │   └── __tests__/api-keys.test.ts
│   └── admin/
│       ├── service-client.ts        # service-role Supabase client
│       ├── queries.ts               # admin queries bypassing RLS
│       └── __tests__/admin.test.ts
├── components/
│   ├── billing/
│   │   ├── PlanCard.tsx
│   │   ├── BillingPortalButton.tsx
│   │   └── UsageMeter.tsx
│   ├── admin/
│   │   ├── TenantTable.tsx
│   │   ├── UserTable.tsx
│   │   ├── AuditLogTable.tsx
│   │   └── AnalyticsOverview.tsx
│   └── providers/
│       └── PostHogProvider.tsx       # MON-02: client analytics
├── instrumentation.ts                # MON-01: Sentry server/edge init
└── sentry.client.config.ts           # MON-01: Sentry client init
platform/
├── railway/
│   ├── railway.web.toml
│   └── railway.worker.toml
├── aws/
│   ├── task-definition.web.json
│   ├── task-definition.worker.json
│   └── service.json
└── gcp/
    ├── service.web.yaml
    └── service.worker.yaml
.github/
└── workflows/
    ├── ci.yml                        # DEPL-04: test + lint on PRs
    └── deploy.yml                    # DEPL-04: build + push Docker images
supabase/
└── migrations/
    └── 20260412300000_phase6_admin.sql  # add is_platform_admin to users
```

### Pattern 1: Lemon Squeezy Billing Adapter

**What:** Thin adapter wrapping `@lemonsqueezy/lemonsqueezy.js` SDK, keyed off `LEMONSQUEEZY_API_KEY` env var. Plan limits enforced in-app, not by LS.
**When to use:** All subscription reads and customer portal redirects.

```typescript
// Source: https://docs.lemonsqueezy.com/guides/tutorials/nextjs-saas-billing
// lib/billing/client.ts
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js'

export function configureLemonSqueezy() {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError(error) {
      throw new Error(`Lemon Squeezy error: ${error.message}`)
    },
  })
}
```

```typescript
// lib/billing/plans.ts [ASSUMED structure - no official ByteSwarm spec]
export const PLANS = {
  free:       { name: 'Free',       agents: 2,  apiCalls: 1000,  storage: 100 },
  pro:        { name: 'Pro',        agents: 20, apiCalls: 50000, storage: 10000 },
  enterprise: { name: 'Enterprise', agents: -1, apiCalls: -1,    storage: -1 },
} as const
export type PlanId = keyof typeof PLANS
```

### Pattern 2: Webhook Verification (BILL-05)

**What:** HMAC-SHA256 signature check using raw request body. Must disable Next.js body parser for this route.
**When to use:** POST /api/billing/webhook only.

```typescript
// Source: https://docs.lemonsqueezy.com/help/webhooks/webhook-requests
// app/api/billing/webhook/route.ts
import { createHmac, timingSafeEqual } from 'crypto'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('X-Signature') ?? ''
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex')
  const trusted = Buffer.from(digest, 'utf8')
  const received = Buffer.from(signature, 'utf8')

  if (trusted.length !== received.length || !timingSafeEqual(trusted, received)) {
    return new Response('Forbidden', { status: 403 })
  }

  const event = JSON.parse(rawBody)
  const eventName = event.meta?.event_name

  // Route to handler
  await handleWebhookEvent(eventName, event.data)
  return new Response('OK', { status: 200 })
}
```

Webhook events to handle:
- `subscription_created` → upsert `subscriptions` row, set plan
- `subscription_updated` → update plan, status, current_period_end
- `subscription_cancelled` → set status = 'cancelled'
- `subscription_expired` → set status = 'past_due' or expired
- `subscription_paused` → set status = 'paused'
- `subscription_resumed` → set status = 'active'

[VERIFIED: docs.lemonsqueezy.com event list]

### Pattern 3: API Key Generation + Authentication (APIK-01/02)

**What:** Generate high-entropy keys, store SHA-256 hash (not bcrypt -- API keys have inherent entropy, bcrypt degrades throughput with no security gain). Show the raw key ONCE to the user, never store it.

```typescript
// Source: industry standard pattern [ASSUMED - verified via multiple security sources]
// lib/api-keys/generator.ts
import { randomBytes, createHash } from 'crypto'

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(32)
  const raw = 'bsk_' + bytes.toString('base64url')
  const prefix = raw.slice(0, 12) // 'bsk_' + 8 chars for display/lookup
  const hash = createHash('sha256').update(raw).digest('hex')
  return { raw, hash, prefix }
}
```

```typescript
// lib/api-keys/authenticator.ts
export async function authenticateApiKey(
  supabase: SupabaseClient,
  rawKey: string
): Promise<ApiKeyAuthResult> {
  if (!rawKey.startsWith('bsk_')) return { valid: false }

  const prefix = rawKey.slice(0, 12)
  const hash = createHash('sha256').update(rawKey).digest('hex')

  const { data } = await supabase
    .from('api_keys')
    .select('id, tenant_id, permissions, expires_at, revoked_at')
    .eq('key_prefix', prefix)
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (!data) return { valid: false }
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { valid: false }

  // Async: update last_used_at without blocking
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id).then(() => {})

  return { valid: true, tenantId: data.tenant_id, permissions: data.permissions }
}
```

### Pattern 4: Rate Limiting per API Key (APIK-03)

**What:** Upstash sliding window rate limiter keyed by API key prefix. Self-hosters without Upstash can substitute a no-op limiter.

```typescript
// Source: https://github.com/upstash/ratelimit [CITED: upstash/ratelimit docs]
// lib/api-keys/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let rateLimiter: Ratelimit | null = null

export function getRateLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null // graceful no-op for self-hosters
  if (!rateLimiter) {
    rateLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/min default; override per plan
    })
  }
  return rateLimiter
}
```

**Fallback for self-hosters:** If `UPSTASH_REDIS_REST_URL` is not set, rate limiting is skipped. Document this in DEPL-05.

### Pattern 5: Super-Admin Dashboard (ADMIN-01 through ADMIN-05)

**What:** Add `is_platform_admin boolean default false` to `users` table. Admin layout checks this field using a service-role Supabase client (bypasses all RLS). Route group `(admin)` at `/admin/` path.

Migration needed:
```sql
-- supabase/migrations/20260412300000_phase6_admin.sql
alter table users add column is_platform_admin boolean not null default false;
```

```typescript
// lib/admin/service-client.ts
// Source: @supabase/supabase-js docs [CITED]
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // bypasses RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

**Guard pattern** in `app/(admin)/layout.tsx`:
```typescript
const { data: { user } } = await supabase.auth.getUser()
const { data: profile } = await adminClient.from('users')
  .select('is_platform_admin').eq('id', user.id).single()
if (!profile?.is_platform_admin) redirect('/dashboard')
```

### Pattern 6: Sentry Next.js Integration (MON-01)

**What:** Three files required for Next.js App Router + Sentry v10.

```typescript
// instrumentation.ts (project root, Next.js 15 standard location)
// Source: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
```

Add to `next.config.ts`:
```typescript
import { withSentryConfig } from '@sentry/nextjs'
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
})
```

For Next.js 15, add to next.config.ts experimental section:
```typescript
experimental: { clientTraceMetadata: ['sentry-trace', 'baggage'] }
```
[CITED: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/]

### Pattern 7: PostHog Next.js Integration (MON-02)

**What:** Client provider wrapping PostHog JS; server-side via `posthog-node` with immediate flush.

```typescript
// components/providers/PostHogProvider.tsx
'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
    })
  }, [])
  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

```typescript
// lib/analytics/server.ts - server-side event capture
// Source: https://posthog.com/docs/libraries/next-js [CITED]
import { PostHog } from 'posthog-node'

export function captureEvent(distinctId: string, event: string, props?: Record<string, unknown>) {
  const client = new PostHog(process.env.POSTHOG_KEY!, {
    host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })
  client.capture({ distinctId, event, properties: props })
  return client.shutdown() // must await
}
```

### Pattern 8: Health Check Endpoint (MON-03)

**What:** Next.js `/api/health` route. Go worker already has `/health`. The docker-compose prod config references `http://localhost:3000/api/health` for the web service healthcheck -- this route must exist.

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'ok' })
}
```

Enhanced version checks Supabase connection before responding.

### Pattern 9: Railway Deployment (DEPL-01)

**What:** One `railway.toml` per service at the package root. Railway auto-detects pnpm workspaces.

```toml
# platform/railway/railway.web.toml
[build]
builder = "dockerfile"
dockerfilePath = "packages/web/Dockerfile"

[deploy]
startCommand = "node packages/web/server.js"
healthcheckPath = "/api/health"
healthcheckTimeout = 300

[[services.watchPaths]]
path = "packages/web"

[[services.watchPaths]]
path = "packages/shared"
```
[CITED: https://docs.railway.com/deployments/monorepo]

### Pattern 10: GitHub Actions CI/CD (DEPL-04)

**What:** Path-filtered workflows. `ci.yml` runs tests on PRs; `deploy.yml` builds and pushes Docker images on main merge.

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    paths:
      - 'packages/web/**'
      - 'packages/shared/**'
      - 'packages/worker/**'
jobs:
  test-web:
    if: contains(github.event.pull_request.changed_files, 'packages/web')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @byteswarm/web test
      - run: pnpm --filter @byteswarm/web typecheck
```

Docker build caching via `type=gha` (GitHub Actions cache) reduces build time 60-80%.

### Anti-Patterns to Avoid

- **Storing raw API keys:** Only store `key_hash` and `key_prefix`. Show raw key once in UI, never again.
- **Using bcrypt for API key hashing:** SHA-256 is correct for high-entropy secrets. Bcrypt is for low-entropy passwords.
- **Running admin queries with anon key:** Always use service-role client for admin operations; anon key is subject to RLS.
- **Blocking on posthog-node flush:** `client.shutdown()` must be awaited or events will be dropped in serverless.
- **Reading `req.body` in webhook handler:** Must use `req.text()` to get raw body for HMAC verification. Next.js body parsing modifies the buffer.
- **Global PostHog node client:** PostHog Node client must be instantiated per-request in Next.js serverless (or use singleton with flush).
- **Hardcoding plan limits:** Plan limits belong in `lib/billing/plans.ts` as a single source of truth, not scattered across route handlers.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC logic | `crypto.createHmac` (built-in) with `timingSafeEqual` | Timing attacks on naive string comparison |
| Rate limiting state | In-memory counter | `@upstash/ratelimit` | In-memory fails across multiple containers/restarts |
| API key generation | Math.random() or uuid | `crypto.randomBytes(32)` | Math.random is not cryptographically secure |
| Error tracking DSN setup | Manual fetch to Sentry API | `@sentry/nextjs` + `withSentryConfig` | Source maps, session replay, App Router integration are complex |
| Lemon Squeezy API calls | Bare fetch to LS REST API | `@lemonsqueezy/lemonsqueezy.js` | Typed responses, pagination, error handling |

**Key insight:** The hard problems in this phase are security (timing attacks, key exposure) and infrastructure plumbing (webhook verification, rate limiting across instances). Standard tools solve all of them.

---

## Common Pitfalls

### Pitfall 1: Webhook body parser strips signature-verifiable payload
**What goes wrong:** Next.js parses `req.body` as JSON by default. The HMAC must be computed over the raw bytes received, not the parsed object. Using `req.json()` before HMAC check means the signature never matches.
**Why it happens:** Developers assume `req.json()` and `req.text()` return equivalent bytes.
**How to avoid:** Always call `await req.text()` first, then `JSON.parse()` manually in the webhook route.
**Warning signs:** Signature verification always returns 403 even with correct secret.

### Pitfall 2: Supabase service-role key exposed to client
**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` is used in a client component or in code that gets bundled for the browser. This key bypasses all RLS and is effectively a superuser credential.
**Why it happens:** `createAdminClient()` used in a non-server-only module.
**How to avoid:** Admin service client must only be imported in Server Components, API route handlers, and Server Actions. Add `'server-only'` import guard to `lib/admin/service-client.ts`.
**Warning signs:** Next.js warns about `SUPABASE_SERVICE_ROLE_KEY` being exposed; or the key appears in `window.__NEXT_DATA__`.

### Pitfall 3: PostHog Node SDK events dropped
**What goes wrong:** PostHog Node batches events by default. In serverless environments the function exits before the batch flushes, so events are silently dropped.
**Why it happens:** Default `flushAt: 20, flushInterval: 10000`.
**How to avoid:** Set `flushAt: 1, flushInterval: 0` and `await client.shutdown()` after capturing.
**Warning signs:** Events visible in local logs but absent from PostHog dashboard.

### Pitfall 4: Admin routes not protected at middleware layer
**What goes wrong:** `app/(admin)/layout.tsx` checks `is_platform_admin` but a direct API call to `/admin/...` bypasses the layout entirely if middleware doesn't also enforce it.
**Why it happens:** Layout guards protect page navigation but not API routes within the same path.
**How to avoid:** Add `/admin` path check in `middleware.ts` alongside the admin layout guard. Double enforcement.
**Warning signs:** Direct fetch to `/admin/users` returns data without auth cookie.

### Pitfall 5: Railway monorepo service root directory
**What goes wrong:** Railway `railway.toml` placed at repo root applies to all services, causing build conflicts.
**Why it happens:** Assuming a single config governs all services.
**How to avoid:** One `railway.toml` per service. Reference via service-specific root directory in Railway dashboard.
**Warning signs:** Railway builds attempt to build both web and worker with the same Dockerfile.

### Pitfall 6: is_platform_admin bypass via Supabase RLS
**What goes wrong:** The `users` RLS policy `users_select_own` only allows a user to see their own row. A service-role admin query reading `is_platform_admin` for another user fails silently with the anon key.
**Why it happens:** Admin layout uses the wrong Supabase client.
**How to avoid:** The admin layout must use the service-role client (not the SSR anon client) to read `is_platform_admin`.
**Warning signs:** `profile?.is_platform_admin` is always `undefined` or `null` in the guard check.

---

## Code Examples

### Lemon Squeezy Customer Portal URL (BILL-04)

```typescript
// Source: https://docs.lemonsqueezy.com/guides/tutorials/nextjs-saas-billing [CITED]
import { getSubscription } from '@lemonsqueezy/lemonsqueezy.js'

export async function getCustomerPortalUrl(lsSubscriptionId: string) {
  configureLemonSqueezy()
  const { data, error } = await getSubscription(lsSubscriptionId)
  if (error || !data) throw new Error('Failed to fetch subscription')
  return data.data.attributes.urls.customer_portal
}
```

### AWS ECS Task Definition structure (DEPL-02)

```json
// platform/aws/task-definition.web.json [ASSUMED standard ECS structure]
{
  "family": "byteswarm-web",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "web",
    "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/byteswarm-web:${VERSION}",
    "portMappings": [{ "containerPort": 3000 }],
    "environment": [
      { "name": "NODE_ENV", "value": "production" }
    ],
    "secrets": [
      { "name": "NEXT_PUBLIC_SUPABASE_URL", "valueFrom": "arn:aws:secretsmanager:..." }
    ],
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
    }
  }]
}
```

### GCP Cloud Run service.yaml (DEPL-03)

```yaml
# platform/gcp/service.web.yaml [ASSUMED standard Cloud Run YAML]
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: byteswarm-web
spec:
  template:
    spec:
      containers:
        - image: gcr.io/${PROJECT_ID}/byteswarm-web:${VERSION}
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
          resources:
            limits:
              cpu: "1"
              memory: "1Gi"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sentry `_app.js` wrapper (Pages Router) | `instrumentation.ts` + `withSentryConfig` | Next.js 13+ App Router | Required for App Router error capture |
| PostHog manual `identify()` on every page | `person_profiles: 'identified_only'` option | PostHog 2024 | Reduces costs; only creates person profiles on identify() |
| Lemon Squeezy v3 API | `@lemonsqueezy/lemonsqueezy.js` v4 | April 2025 | v4 has breaking changes in function signatures vs v3 |
| bcrypt for all key hashing | SHA-256 for high-entropy secrets | Security guidance 2024+ | bcrypt for passwords, SHA-256 for generated API keys |

**Deprecated/outdated:**
- `lemonsqueezy-webhooks` npm package: Use the built-in `crypto.createHmac` approach instead. The SDK v4 does not include a webhook helper, so manual HMAC is the current standard.
- PostHog `capture_pageview: true` default: Disable in App Router; handle navigation manually via `usePathname` effect to avoid duplicate events.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Plan limits (agents: 2/20/-1, apiCalls: 1000/50000/-1) | Standard Stack / Plans | These are placeholder limits; owner must configure actual limits before launch |
| A2 | `is_platform_admin` field approach for super-admin | Architecture Patterns | Alternative: Supabase service role check against a separate admin_users table; either works |
| A3 | AWS task definition uses Fargate CPU/memory of 512/1024 | Code Examples | Actual sizing depends on load expectations; tune at deploy time |
| A4 | GCP Cloud Run YAML uses standard `serving.knative.dev/v1` | Code Examples | Standard for GCP Cloud Run but confirm GCP project uses standard Cloud Run (not Autopilot) |
| A5 | Upstash rate limit of 100 req/min per key | Architecture Patterns | Actual limit per plan tier; free plan default; must be parameterized by plan |
| A6 | PostHog `flushAt:1, flushInterval:0` pattern | Architecture Patterns | Correct per official docs for serverless; verify if using long-lived server processes instead |

---

## Open Questions

1. **Upstash vs. self-hosted Redis for rate limiting**
   - What we know: `@upstash/ratelimit` requires `@upstash/redis` which connects to Upstash HTTP API
   - What's unclear: Self-hosters who run their own Redis cannot use `@upstash/redis` directly
   - Recommendation: Add a no-op rate limiter fallback when `UPSTASH_REDIS_REST_URL` is absent; document in DEPL-05 that rate limiting requires Upstash or a separate Redis adapter

2. **Lemon Squeezy store + variant IDs**
   - What we know: The LS SDK requires `storeId` and variant IDs to create checkout links
   - What's unclear: These are runtime values the deployer must provide, not hardcoded
   - Recommendation: Use env vars `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_PRO`, `LEMONSQUEEZY_VARIANT_ENTERPRISE`

3. **PostHog self-hosted vs. cloud**
   - What we know: `posthog-js` can point to `https://us.i.posthog.com` (cloud) or self-hosted
   - What's unclear: Self-hosted PostHog is a separate Docker service not currently in compose configs
   - Recommendation: Default to PostHog cloud with optional self-hosted via `NEXT_PUBLIC_POSTHOG_HOST` env var; document in DEPL-05

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js crypto (built-in) | APIK-01, APIK-02, BILL-05 | Yes | built-in | None needed |
| Upstash Redis | APIK-03 | No (not in docker-compose) | -- | No-op limiter when env var absent |
| Lemon Squeezy account | BILL-01 to BILL-05 | Not verifiable | -- | Mock adapter for local dev |
| Sentry project | MON-01 | Not verifiable | -- | SDK initializes with empty DSN in dev; no-op |
| PostHog project | MON-02 | Not verifiable | -- | SDK no-ops when key absent |
| GitHub Actions runner | DEPL-04 | Yes (GitHub) | ubuntu-latest | Self-hosted runner |

**Missing dependencies with no fallback:**
- None that block code execution. All external services (Upstash, Lemon Squeezy, Sentry, PostHog) degrade gracefully when env vars are absent.

**Missing dependencies with fallback:**
- Upstash Redis: Rate limiting skipped when `UPSTASH_REDIS_REST_URL` is not set

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already configured in `packages/web`) |
| Config file | `packages/web/vitest.config.ts` (inferred from existing tests) |
| Quick run command | `pnpm --filter @byteswarm/web test` |
| Full suite command | `pnpm --filter @byteswarm/web test --reporter=verbose` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILL-05 | Webhook signature verification accepts valid, rejects invalid | unit | `pnpm --filter @byteswarm/web test lib/billing` | No - Wave 0 |
| BILL-02 | Plan limits config is correct shape | unit | `pnpm --filter @byteswarm/web test lib/billing` | No - Wave 0 |
| APIK-01 | Key generation produces `bsk_` prefix, unique hash | unit | `pnpm --filter @byteswarm/web test lib/api-keys` | No - Wave 0 |
| APIK-02 | Key authentication rejects expired/revoked keys | unit | `pnpm --filter @byteswarm/web test lib/api-keys` | No - Wave 0 |
| APIK-03 | Rate limiter returns 429 after limit exceeded | unit (mock Redis) | `pnpm --filter @byteswarm/web test lib/api-keys` | No - Wave 0 |
| APIK-05 | Expired key returns 401 | unit | `pnpm --filter @byteswarm/web test lib/api-keys` | No - Wave 0 |
| MON-03 | `/api/health` returns 200 with `{"status":"ok"}` | smoke | `curl http://localhost:3000/api/health` | No - Wave 0 |
| ADMIN-01 | Admin layout redirects non-admin users | unit | `pnpm --filter @byteswarm/web test lib/admin` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @byteswarm/web test --run`
- **Per wave merge:** `pnpm --filter @byteswarm/web test --reporter=verbose && pnpm --filter @byteswarm/web typecheck`
- **Phase gate:** Full suite green + `go test ./...` in worker before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/web/lib/billing/__tests__/billing.test.ts` -- covers BILL-05, BILL-02
- [ ] `packages/web/lib/api-keys/__tests__/api-keys.test.ts` -- covers APIK-01, APIK-02, APIK-03, APIK-05
- [ ] `packages/web/lib/admin/__tests__/admin.test.ts` -- covers ADMIN-01 redirect guard
- [ ] `packages/web/app/api/health/route.ts` -- covers MON-03

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (existing) + API key auth via SHA-256 lookup |
| V3 Session Management | Yes | Supabase SSR cookies (existing) |
| V4 Access Control | Yes | `is_platform_admin` guard + service-role client for admin; `billing:manage` RBAC permission for tenant billing |
| V5 Input Validation | Yes | zod for webhook payload parsing; plan ID validation against PLANS constant |
| V6 Cryptography | Yes | `crypto.randomBytes(32)` for key generation; `crypto.createHash('sha256')` for storage; `timingSafeEqual` for webhook HMAC |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook replay attack | Spoofing | HMAC-SHA256 signature check; optionally check webhook timestamp freshness |
| API key brute-force | Elevation | SHA-256 lookup by prefix first (limits search space); keys are 32 bytes random (2^256 entropy) |
| Service-role key client-side exposure | Elevation | `server-only` import guard on `lib/admin/service-client.ts` |
| Timing attack on HMAC comparison | Spoofing | `crypto.timingSafeEqual()` required; never use `===` for HMAC comparison |
| IDOR on admin routes | Elevation | Middleware enforces `is_platform_admin`; layout adds second check |
| Subscription status forgery | Tampering | Subscription state only updated via verified webhooks, never direct client API calls |

---

## Sources

### Primary (HIGH confidence)
- npm registry - `@lemonsqueezy/lemonsqueezy.js@4.0.0`, `@sentry/nextjs@10.48.0`, `posthog-js@1.367.0`, `posthog-node@5.29.2`, `@upstash/ratelimit@2.0.8`, `@upstash/redis@1.37.0` -- versions verified 2026-04-12
- Existing codebase -- `subscriptions`, `api_keys`, `audit_logs` table schemas; RBAC constants; middleware pattern; test patterns
- `docker/compose.prod.yaml` -- confirms web healthcheck references `/api/health`

### Secondary (MEDIUM confidence)
- [Sentry Next.js Manual Setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/) -- `instrumentation.ts` pattern, `withSentryConfig`, Next.js 15 `clientTraceMetadata`
- [PostHog Next.js Docs](https://posthog.com/docs/libraries/next-js) -- `flushAt:1, flushInterval:0` for serverless
- [Railway Monorepo Docs](https://docs.railway.com/deployments/monorepo) -- `railway.toml` per-service config
- [Lemon Squeezy Webhook Docs](https://docs.lemonsqueezy.com/help/webhooks) -- event names, X-Signature header
- [Lemon Squeezy Next.js SaaS Billing Guide](https://docs.lemonsqueezy.com/guides/tutorials/nextjs-saas-billing) -- customer portal URL pattern

### Tertiary (LOW confidence)
- WebSearch: AWS ECS task definition structure for Next.js + Fargate -- standard industry pattern, not LS/Sentry specific
- WebSearch: GCP Cloud Run `service.yaml` YAML structure -- standard knative format

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all versions verified against npm registry
- Architecture: HIGH - based on existing codebase patterns + official docs
- Pitfalls: HIGH - based on known gotchas from official docs and security research
- Deployment configs: MEDIUM - structure is standard but exact values are project-specific

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (Lemon Squeezy SDK, Sentry, PostHog are stable; Railway config format is stable)
