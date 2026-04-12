---
phase: 06-production-ready
plan: 05
subsystem: monitoring
tags: [sentry, posthog, analytics, observability, error-tracking]
dependency_graph:
  requires: [06-01]
  provides: [sentry-error-tracking, posthog-analytics, custom-event-catalog]
  affects: [packages/web/app/layout.tsx, packages/web/next.config.ts]
tech_stack:
  added: ["@sentry/nextjs@10.48.0 (already installed)", "posthog-js@1.367.0 (already installed)", "posthog-node@5.29.2 (already installed)"]
  patterns: ["Sentry graceful degradation (env guard)", "PostHog identified_only profiles", "serverless flush pattern (flushAt:1 + await shutdown)"]
key_files:
  created:
    - packages/web/sentry.client.config.ts
    - packages/web/sentry.server.config.ts
    - packages/web/sentry.edge.config.ts
    - packages/web/instrumentation.ts
    - packages/web/components/providers/PostHogProvider.tsx
    - packages/web/lib/analytics/server.ts
    - packages/web/lib/analytics/events.ts
    - packages/web/lib/analytics/__tests__/analytics.test.ts
  modified:
    - packages/web/next.config.ts
    - packages/web/app/layout.tsx
decisions:
  - "Used named import { PostHog } from 'posthog-node' (not default) — matches actual package export shape"
  - "capture_pageview: false in PostHogProvider — App Router requires manual tracking via usePathname"
  - "One PostHog client per captureEvent call is intentional — serverless has no long-lived process"
  - "Low Sentry sample rates (0.1) — open-source users control their own quotas"
metrics:
  duration_minutes: 10
  completed: "2026-04-12T16:07:35Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 2
requirements: [MON-01, MON-02, MON-04]
---

# Phase 06 Plan 05: Monitoring Integration Summary

Sentry error tracking + PostHog analytics fully wired with graceful degradation, correct serverless flush pattern, and a typed custom event catalog covering agent execution, tool usage, workspace runs, and billing events.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Sentry integration (server, client, edge) | 575bf38 | sentry.*.config.ts, instrumentation.ts, next.config.ts |
| 2 | PostHog provider + server events + event catalog | fcea406 | PostHogProvider.tsx, server.ts, events.ts, layout.tsx |

## What Was Built

### Task 1 — Sentry

- `sentry.client.config.ts`: Initializes only when `NEXT_PUBLIC_SENTRY_DSN` is set. Sample rates: traces 0.1, replay-on-error 1.0, session replay 0.
- `sentry.server.config.ts` + `sentry.edge.config.ts`: Mirror pattern for server/edge runtimes using `SENTRY_DSN`.
- `instrumentation.ts`: `register()` conditionally imports the right config based on `NEXT_RUNTIME`; `onRequestError` re-exports `Sentry.captureRequestError`.
- `next.config.ts`: Wrapped with `withSentryConfig`; `clientTraceMetadata: ['sentry-trace', 'baggage']` added for Next.js 15 distributed tracing.

### Task 2 — PostHog

- `PostHogProvider.tsx`: Client provider with `identified_only` profiles (GDPR-friendly, threat T-06-17) and `capture_pageview: false` (App Router requires manual pageview tracking).
- `lib/analytics/server.ts`: `captureEvent()` creates one PostHog Node client per call with `flushAt: 1, flushInterval: 0` and `await client.shutdown()` — required for serverless where background flushes are dropped.
- `lib/analytics/events.ts`: `EVENTS` const catalog with `EventName` type for `agent_execution`, `tool_usage`, `workspace_run`, `api_key_created`, `api_key_revoked`, `subscription_changed`, `billing_portal_opened`.
- `app/layout.tsx`: `PostHogProvider` wraps `children` in root layout.

## Test Results

9/9 tests passing. TypeScript clean (`tsc --noEmit` exits 0).

Coverage:
- Sentry init called when DSN present
- Sentry does not throw when DSN absent
- `instrumentation.ts` exports `register` and `onRequestError`
- `captureEvent` constructs PostHog client with `flushAt:1, flushInterval:0`
- `captureEvent` passes correct `distinctId`/`event`/`properties`
- `captureEvent` awaits `client.shutdown()`
- `captureEvent` returns without throwing when `POSTHOG_KEY` absent
- `EVENTS` catalog has all required keys

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] posthog-node uses named export, not default export**
- **Found during:** Task 2 typecheck
- **Issue:** `import PostHog from 'posthog-node'` fails — package exports `{ PostHog }` as a named class, not a default export
- **Fix:** Changed to `import { PostHog } from 'posthog-node'`; updated test mock to `return { PostHog: MockPostHog }` and cast via `as unknown as`
- **Files modified:** `lib/analytics/server.ts`, `lib/analytics/__tests__/analytics.test.ts`
- **Commit:** fcea406

**2. [Rule 1 - Bug] Test mock factory not usable as constructor**
- **Found during:** Task 2 GREEN phase
- **Issue:** `vi.fn().mockImplementation(() => ({...}))` cannot be called with `new`
- **Fix:** Switched to `vi.fn(function(this) { Object.assign(this, ...) })` pattern
- **Files modified:** `lib/analytics/__tests__/analytics.test.ts`
- **Commit:** fcea406

## Known Stubs

None — all analytics code is wired. Events require callers to pass real properties; the catalog is documentation, not enforcement.

## Threat Flags

No new threat surface beyond what was in the plan's threat model (T-06-17, T-06-18, T-06-19 all mitigated as designed).

## Self-Check: PASSED
