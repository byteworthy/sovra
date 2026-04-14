# Environment Variables Reference

All environment variables for Sovra. Copy `.env.example` to `.env.local` and fill in the required values.

When optional variables are absent, the feature degrades gracefully with no errors thrown.

---

## Supabase

| Name | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | - | Supabase project URL (from project settings or `supabase status`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key for client-side access |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | Supabase service role key for server-side admin operations |

---

## Database

| Name | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string used by the Go worker service |

---

## AI Providers

At least one AI provider key is required for agent features to work.

| Name | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | Conditional | - | OpenAI API key. Required if using OpenAI models. |
| `ANTHROPIC_API_KEY` | Conditional | - | Anthropic API key. Required if using Claude models. |

---

## Worker Service

| Name | Required | Default | Description |
|---|---|---|---|
| `WORKER_URL` | Yes | `http://localhost:8080` | Base URL of the Go worker service (used by the web service to call the worker) |
| `HTTP_PORT` | No | `8080` | HTTP port the worker listens on |
| `GRPC_PORT` | No | `50051` | gRPC port the worker listens on |
| `GO_ENV` | No | `development` | Go environment (`development` or `production`) |
| `AGENT_WORKSPACE_PATH` | No | `/tmp/agent-workspace` | Filesystem path for agent workspace scratch space |

---

## App

| Name | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL of the web service. Used for OAuth redirects and absolute links. |
| `NODE_ENV` | No | `development` | Node environment (`development` or `production`) |

---

## Billing - Stripe

Optional. When absent, all billing endpoints return no-op responses and billing UI is hidden.

| Name | Required | Default | Description |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | No | - | Stripe secret key from the Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook signing secret (from webhook endpoint settings) |
| `STRIPE_PRICE_ID_PRO` | No | - | Stripe Price ID for the Pro tier |
| `STRIPE_PRICE_ID_ENTERPRISE` | No | - | Stripe Price ID for the Enterprise tier |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | - | Stripe publishable key for client-side Stripe.js |

---

## Rate Limiting - Upstash Redis

Optional. When absent, API key rate limiting is disabled and all requests pass through.

| Name | Required | Default | Description |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | No | - | Upstash Redis REST API URL (from Upstash console) |
| `UPSTASH_REDIS_REST_TOKEN` | No | - | Upstash Redis REST API token |

---

## Monitoring - Sentry

Optional. When absent, errors are logged to the console only (no remote error tracking).

| Name | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | No | - | Sentry DSN for client-side error tracking |
| `SENTRY_DSN` | No | - | Sentry DSN for server-side error tracking |
| `SENTRY_ORG` | No | - | Sentry organization slug (used for source map uploads) |
| `SENTRY_PROJECT` | No | - | Sentry project slug (used for source map uploads) |
| `SENTRY_AUTH_TOKEN` | No | - | Sentry auth token for source map uploads during build |

---

## Analytics - PostHog

Optional. When absent, analytics events are dropped silently.

| Name | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | No | - | PostHog project API key for client-side events |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog ingest host (change for EU data residency) |
| `POSTHOG_KEY` | No | - | PostHog project API key for server-side events |
| `POSTHOG_HOST` | No | `https://us.i.posthog.com` | PostHog ingest host for server-side events |

---

## Search

Optional. When absent, Brave Search tool is unavailable to agents.

| Name | Required | Default | Description |
|---|---|---|---|
| `BRAVE_SEARCH_API_KEY` | No | - | Brave Search API key for the agent web search tool |

---

## Summary

| Category | Required | Optional |
|---|---|---|
| Supabase | 3 vars | - |
| Database | 1 var | - |
| AI Providers | 1+ vars | - |
| Worker Service | `WORKER_URL` | 4 vars |
| App | - | 2 vars |
| Billing (Stripe) | - | 5 vars |
| Rate Limiting (Upstash) | - | 2 vars |
| Monitoring (Sentry) | - | 5 vars |
| Analytics (PostHog) | - | 4 vars |
| Search | - | 1 var |
