<p align="center">
  <img src="https://raw.githubusercontent.com/byteworthy/sovra/main/.github/logo.svg" width="80" alt="Sovra" />
</p>

<h1 align="center">Sovra</h1>

<p align="center">
  <strong>The open-source AI agent platform you'd have to build yourself. Until now.</strong>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#what-you-get">What You Get</a> •
  <a href="#the-stack">The Stack</a> •
  <a href="#deploy">Deploy</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
</p>

---

## The Problem

You want to build an AI agent product. So you start wiring up auth, multi-tenancy, vector search, MCP tool integration, real-time collaboration, billing...

**Three months later, you still haven't shipped a single AI feature.**

Every SaaS boilerplate gives you auth and billing. None of them give you the AI infrastructure. Every agent framework gives you LLM orchestration. None of them give you the SaaS wrapper.

You're stuck gluing them together yourself.

## The Solution

Sovra is the full stack. Auth to agents. Database to deployment. One repo, one command, production-ready.

**What takes teams 3+ months to build, you get in one `git clone`.**

## Quick Start

### Prerequisites

- **Node.js** 18+ and **pnpm** 8+ (`npm install -g pnpm`)
- **Go** 1.22+ (for the worker service)
- **Docker** (for local Supabase)
- **Supabase CLI** (`brew install supabase/tap/supabase` or [install docs](https://supabase.com/docs/guides/cli/getting-started))

### Setup

```bash
# 1. Clone and install
git clone https://github.com/byteworthy/sovra.git
cd sovra
pnpm install

# 2. Start local Supabase (Postgres + Auth + pgvector)
supabase start
# Note the API URL and anon/service_role keys from the output

# 3. Configure environment
cp .env.example .env.local
cp packages/web/.env.example packages/web/.env.local
# Fill in the Supabase keys from step 2
# At minimum: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 4. Start the web app
cd packages/web && pnpm dev
# Open http://localhost:3000

# 5. (Optional) Start the Go worker for agent features
cd packages/worker && go run ./cmd/worker
```

### Environment Variables

See `.env.example` for the full list. Only Supabase keys are required — all other integrations (Stripe, Sentry, PostHog, Upstash) are optional and gracefully disabled when not configured.

## What You Get

### The SaaS Layer (so you never think about plumbing again)

| Feature | What it does |
|---------|-------------|
| **Multi-tenant auth** | Email, magic links, OAuth (Google, GitHub). Supabase-native with a swappable AuthAdapter interface. Bring your own provider. |
| **Tenant isolation** | Row-level security at the database level. Not middleware. Not application logic. Postgres enforces it. User A cannot see User B's data. Period. |
| **Roles and permissions** | Owner, admin, member, viewer out of the box. Need custom roles? The permission system is database-backed and tenant-configurable. No forking required. |
| **Invite system** | Email invitations AND shareable invite links. Works with or without SMTP configured. |
| **Billing ready** | Stripe integration with plan definitions, usage tracking, and customer portal. |
| **API keys** | Scoped API key generation with rate limiting and audit logging. |

### The AI Layer (the part nobody else ships)

| Feature | What it does |
|---------|-------------|
| **MCP native** | Full Model Context Protocol client AND server. Your agents discover and use tools the way the ecosystem intended. Not a wrapper. Not a shim. Native. |
| **Vector search** | pgvector built into your existing Postgres. No separate Pinecone bill. No Weaviate cluster. Semantic search, hybrid search, tenant-scoped. |
| **Agent runtime** | Create agents with custom model configs, system prompts, and tool assignments. Streaming responses via Vercel AI SDK. |
| **Multi-agent workspaces** | Agents collaborate in real-time. Round-robin, hierarchical, democratic, parallel execution modes. Shared memory. Conflict resolution. |
| **Memory strategies** | Full conversation history, summary compression, vector retrieval, or hybrid. Context never gets stale. |
| **Built-in tools** | File operations, web search, URL fetch, database query, semantic search. All MCP-compliant. All tenant-scoped. |

### The Production Layer (ship it, don't just demo it)

| Feature | What it does |
|---------|-------------|
| **Deploy anywhere** | Docker all-in-one, Railway, AWS, GCP. Self-hosted only. Your data stays on your infrastructure. |
| **Admin dashboard** | Tenant management, user management, system analytics. See everything. |
| **Monitoring** | Sentry for errors, PostHog for product analytics. Pre-wired. |
| **Audit logging** | Every sensitive operation tracked. Who did what, when, to which tenant. |

## The Stack

```
Frontend     Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
Agent Worker Go 1.22+ with Gin + gRPC (because Python is too slow for agent orchestration)
Database     Supabase PostgreSQL + pgvector + Row Level Security
Auth         Supabase Auth (swappable via AuthAdapter interface)
Real-time    Socket.IO
AI SDK       Vercel AI SDK + MCP SDK
Billing      Stripe
Monitoring   Sentry + PostHog
```

**Why Go for the worker?** Agent orchestration is I/O bound with bursts of CPU. Go's goroutines handle thousands of concurrent agent sessions on a single node. Python can't.

**Why Supabase?** Postgres + pgvector + auth + real-time + RLS in one service. No separate vector database bill. No separate auth service. Everything in one place, and you own the data.

**Why not NextAuth/Clerk/Auth0?** Sovra ships with Supabase Auth as the default (zero config). But the `AuthAdapter` interface means you can swap to any provider by implementing 5 methods. No lock-in.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js Frontend                │
│          (App Router, Vercel AI SDK)             │
└───────────────┬─────────────────┬───────────────┘
                │ API             │ gRPC
┌───────────────▼──┐    ┌────────▼────────────────┐
│   Supabase       │    │     Go Worker           │
│  (Auth, DB, RLS) │    │  (Agent Runtime, MCP)   │
└───────────────┬──┘    └────────┬────────────────┘
                │                │
         ┌──────▼────────────────▼──────┐
         │     PostgreSQL + pgvector     │
         │  (Tenant-isolated, RLS)       │
         └──────────────────────────────┘
```

## Who This Is For

- **Indie hackers** building AI-powered SaaS products who don't want to spend months on infrastructure
- **Startups** that need multi-tenant AI agent capabilities on day one
- **Agencies** building custom AI solutions for clients who need tenant isolation
- **Enterprise teams** evaluating self-hosted alternatives to closed-source agent platforms
- **Open-source contributors** who want to build on a solid, extensible foundation

## Who This Is NOT For

- If you need a simple chatbot wrapper, use OpenWebUI
- If you need an agent framework (no SaaS), use LangGraph or CrewAI
- If you want a hosted solution, this is self-hosted only

## Feature Roadmap

| Phase | Status | What Ships |
|-------|--------|-----------|
| Foundation | Done | Monorepo, database schema, Docker, dev environment |
| Core Infrastructure | Done | Supabase auth, multi-tenancy, RBAC, invitations |
| Agent Core | Done | Agent CRUD, chat interface, streaming, AI provider adapters |
| AI Features | Done | MCP client/server, built-in tools, vector storage, tool tracking |
| Multi-Agent | Done | Workspaces, 5 collaboration modes, 4 memory strategies, Socket.IO |
| Production Ready | Done | Stripe billing, admin dashboard, API keys, Sentry + PostHog, CI/CD |

## Deploy

### Docker (self-hosted)
```bash
# Build and run production containers
docker compose -f docker/compose.prod.yaml up -d
```

> **Note:** You'll need a running Supabase instance (hosted or self-hosted) with your migrations applied. See `supabase/migrations/` for the full schema.

### Railway / Vercel / Fly.io
Deploy the Next.js web app to any platform that supports Node.js. Deploy the Go worker as a separate service. Point both at your Supabase project.

### Environment Variables for Production
All required and optional variables are documented in `.env.example` with descriptions. At minimum you need:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `DATABASE_URL` (for the Go worker)

## Contributing

Contributions welcome. Read the [contributing guide](CONTRIBUTING.md) before opening a PR.

**The fastest way to contribute:** Pick any feature from the roadmap, open an issue, and start building.

## License

**MIT**. Use it for anything. Commercial, personal, educational. No strings attached.

---

<p align="center">
  <strong>Built by <a href="https://byteworthy.io">ByteWorthy</a></strong><br/>
  <sub>Ship AI products. Not infrastructure.</sub>
</p>
