---
phase: 06-production-ready
plan: 01
subsystem: billing
tags: [billing, lemon-squeezy, webhooks, health, migration, tdd]
dependency_graph:
  requires: []
  provides: [billing-backend, health-endpoint, is_platform_admin-migration]
  affects: [subscription-management, plan-enforcement, admin-dashboard]
tech_stack:
  added:
    - "@lemonsqueezy/lemonsqueezy.js@4.0.0"
    - "@sentry/nextjs@10.48.0"
    - "posthog-js@1.367.0"
    - "posthog-node@5.29.2"
    - "@upstash/ratelimit@2.0.8"
    - "@upstash/redis@1.37.0"
  patterns:
    - HMAC-SHA256 webhook verification with timingSafeEqual
    - TDD (test-first) for all billing logic
    - req.text() before JSON parse for webhook raw body integrity
key_files:
  created:
    - supabase/migrations/20260412300000_phase6_admin.sql
    - packages/web/lib/billing/plans.ts
    - packages/web/lib/billing/client.ts
    - packages/web/lib/billing/webhook.ts
    - packages/web/lib/billing/actions.ts
    - packages/web/lib/billing/__tests__/billing.test.ts
    - packages/web/app/api/health/route.ts
    - packages/web/app/api/billing/webhook/route.ts
    - packages/web/app/api/billing/portal/route.ts
  modified:
    - packages/web/package.json (6 new dependencies)
    - pnpm-lock.yaml
decisions:
  - "timingSafeEqual with length-equality guard before comparison to prevent timing attacks on webhook signatures"
  - "req.text() before JSON.parse in webhook route to ensure HMAC verification uses original raw bytes"
  - "Plan limits use -1 to represent unlimited (enterprise) rather than Infinity for JSON-safe serialization"
  - "configureLemonSqueezy uses module-level flag to prevent double-init"
metrics:
  duration_seconds: 222
  completed_date: "2026-04-12"
  tasks_completed: 2
  files_created: 9
  files_modified: 2
  tests_added: 15
---

# Phase 6 Plan 1: Billing Backend + Health Endpoint Summary

**One-liner:** Lemon Squeezy billing backend with HMAC-SHA256 webhook verification, 3-tier plan definitions (free/pro/enterprise), customer portal redirect, usage tracking, and health endpoint for Docker.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | SDKs + migration + plan definitions + health | ca1bddd | plans.ts, client.ts, health/route.ts, migration |
| 2 | Webhook handler + event processing + portal | 7bb915c | webhook.ts, actions.ts, webhook/route.ts, portal/route.ts |

## What Was Built

### Migration
`supabase/migrations/20260412300000_phase6_admin.sql` adds `is_platform_admin boolean NOT NULL DEFAULT false` to the users table.

### Plan Definitions (`lib/billing/plans.ts`)
Three tiers with explicit limits:
- **free**: agents=2, apiCalls=1000, storageMb=100, workspaces=1
- **pro**: agents=20, apiCalls=50000, storageMb=10000, workspaces=5
- **enterprise**: all -1 (unlimited)

Exports `PLANS`, `PlanId`, `getPlanLimits()` (defaults to free for unknown), `PLAN_DISPLAY` with name/price/badge.

### Billing Client (`lib/billing/client.ts`)
Wraps `lemonSqueezySetup` with env guard (throws on missing `LEMONSQUEEZY_API_KEY`) and module-level init guard.

### Health Endpoint (`app/api/health/route.ts`)
Public `GET` returning `{ status: 'ok' }` — satisfies Docker Compose healthcheck at `http://localhost:3000/api/health`.

### Webhook Handler (`lib/billing/webhook.ts`)
- `verifyWebhookSignature(rawBody, signature, secret)`: HMAC-SHA256 with `timingSafeEqual`. Length-mismatch guard prevents panic before comparison.
- `handleWebhookEvent(eventName, data, supabase)`: routes 6 events — `subscription_created` (upsert), `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed`. Unknown events log but do not throw.

### Billing Actions (`lib/billing/actions.ts`)
- `getSubscriptionForTenant()`: fetches subscription row by tenant_id
- `getUsageForTenant()`: queries tool_executions (current billing period) + agents counts
- `getCustomerPortalUrl()`: calls LS SDK `getSubscription()`, extracts `attributes.urls.customer_portal`

### Webhook Route (`app/api/billing/webhook/route.ts`)
`POST` reads raw body via `req.text()` first, verifies HMAC, then parses JSON and dispatches to `handleWebhookEvent`. Returns 403 on bad signature.

### Portal Route (`app/api/billing/portal/route.ts`)
Authenticated `POST`, fetches tenant subscription, calls `getCustomerPortalUrl()`, returns `{ url }` or 404.

## Tests

15 tests, all passing. Coverage:
- PLANS structure and limits for each tier
- getPlanLimits fallback to free for unknown plan IDs
- configureLemonSqueezy throws when env var missing
- GET /api/health returns 200 with { status: 'ok' }
- verifyWebhookSignature: valid signature, invalid signature, empty signature
- handleWebhookEvent: subscription_created upserts, subscription_cancelled updates, unknown events handled gracefully
- getSubscriptionForTenant returns data or null
- getUsageForTenant returns { apiCalls, agents }

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrong relative import path for health route in test**
- **Found during:** Task 1 test execution (RED phase)
- **Issue:** `../../app/api/health/route` from `lib/billing/__tests__/` resolves to `lib/app/api/health/route`, not `app/api/health/route`
- **Fix:** Changed to `@/app/api/health/route` alias which resolves correctly from tsconfig baseUrl
- **Files modified:** `lib/billing/__tests__/billing.test.ts`

**2. [Rule 3 - Blocking] node_modules missing before first test run**
- **Found during:** First test run attempt
- **Issue:** Dependencies not installed in worktree
- **Fix:** Ran `pnpm install` at project root before SDK install
- **Files modified:** None (runtime fix)

## Threat Surface Scan

The threat model in the plan covers all new surfaces introduced:

| Flag | File | Description |
|------|------|-------------|
| Covered by T-06-01 | webhook/route.ts | External POST endpoint - HMAC verified |
| Covered by T-06-03 | health/route.ts | Public endpoint - returns only { status: 'ok' } |
| Covered by T-06-02 | webhook.ts | Subscription state only mutated via verified webhook |

No uncovered threat surfaces introduced.

## Known Stubs

None. All exported functions are fully wired. The portal route requires `LEMONSQUEEZY_API_KEY` and `LEMONSQUEEZY_WEBHOOK_SECRET` to be set in environment for live operation (documented in client.ts error message).

## Self-Check: PASSED

Files exist:
- supabase/migrations/20260412300000_phase6_admin.sql - FOUND
- packages/web/lib/billing/plans.ts - FOUND
- packages/web/lib/billing/webhook.ts - FOUND
- packages/web/app/api/health/route.ts - FOUND
- packages/web/lib/billing/__tests__/billing.test.ts - FOUND

Commits exist:
- ca1bddd - Task 1 commit - FOUND
- 7bb915c - Task 2 commit - FOUND
