# Sovra Architecture

Technical overview of how Sovra is structured and how requests flow across services.

## Companion docs

- `docs/deployment.md`
- `docs/environment-variables.md`
- `docs/huggingface-integration.md`
- `docs/worker.md`
- `docs/testing.md`
- `docs/premium-benchmark.md`
- `docs/operations-runbook.md`
- `docs/production-readiness.md`
- `docs/release-process.md`

## High-level diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser / Clients                          │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 Web App                           │
│                                                                      │
│  App Router + Server Actions + API Routes                            │
│  - Auth/session handling                                              │
│  - Tenant membership checks                                           │
│  - Billing/admin/workspace orchestration                             │
│  - Broadcast writes to worker /internal/broadcast                    │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Supabase (PostgreSQL)                         │
│                                                                      │
│  - Auth + JWT                                                        │
│  - Row-level security policies                                       │
│  - Tenant/user/workspace/agent data                                 │
│  - pgvector embeddings + semantic retrieval                          │
└───────────────────────┬───────────────────────────────┬──────────────┘
                        │                               │
                        ▼                               ▼
           ┌──────────────────────────┐      ┌────────────────────────┐
           │   Go Worker Service      │      │  External Integrations │
           │                          │      │                        │
           │ :8080  health            │      │ Stripe, Sentry,        │
           │ :50051 gRPC health       │      │ PostHog, Upstash,      │
           │ :3001  MCP (/mcp)        │      │ OpenAI, Anthropic,     │
           │ :3002  Socket.IO +       │      │ Hugging Face           │
           │                          │      │                        │
           │        /internal/broadcast │    └────────────────────────┘
           └──────────────────────────┘
```

## Request flow

1. A user request reaches the Next.js app.
2. Web server code creates a tenant-scoped Supabase client.
3. Membership/permission checks run in app logic.
4. PostgreSQL RLS enforces tenant isolation at the data layer.
5. For realtime updates, web server sends events to worker `/internal/broadcast`.
6. Worker emits Socket.IO room events to connected clients.

## Tenant isolation model

Sovra uses layered isolation:

1. App-layer membership checks (authenticated user + tenant membership).
2. Data-layer enforcement with Postgres RLS policies.
3. Worker broadcast room names scoped to `{tenantId}:{workspaceId}`.

RLS is the final enforcement boundary for data reads/writes.

## Worker trust boundary

Internal worker routes use a shared bearer secret:

- `/internal/broadcast`
- `/mcp`

`INTERNAL_API_SECRET` is optional in non-production for local development, but required in production. Startup and middleware both enforce fail-closed behavior in production.

## Failure domains

| Domain | Failure mode | Impact | Recovery |
|---|---|---|---|
| Web app | Runtime regression or bad deploy | UI/API unavailable or degraded | Roll back deploy, inspect logs/Sentry, re-run smoke tests |
| Worker | Socket/MCP/gRPC server failure | Realtime + tool execution degraded | Restart worker, inspect logs, run worker health checks |
| Supabase | Connectivity or RLS issue | Data operations fail | Validate DB health, migration state, and policy integrity |
| External APIs | Provider outage (AI/billing/observability) | Feature-specific degradation | Retry, failover, or temporarily disable dependent features |

## Architectural decisions (current)

- Next.js App Router keeps API and UI in one runtime and supports server components.
- Go worker handles high-concurrency realtime and long-running tool execution.
- Supabase is the single source of truth for auth, relational data, and vector storage.
- Security-sensitive internal routes are isolated behind explicit shared-secret auth.
