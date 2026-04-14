<p align="center">
  <img src="https://raw.githubusercontent.com/byteworthy/sovra/main/.github/logo.svg" width="80" alt="Sovra — open-source AI agent platform" />
</p>

<h1 align="center">Sovra</h1>

<p align="center">
  <strong>Ship AI products. Not infrastructure.</strong>
</p>

<p align="center">
  Open-source platform for building multi-tenant AI agent applications.<br/>
  Auth, billing, MCP tools, vector search, multi-agent collaboration — in one repo.
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-what-you-get">Features</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-the-stack">Stack</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-architecture">Architecture</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-deploy">Deploy</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-contributing">Contribute</a>
</p>

<p align="center">
  <a href="https://github.com/byteworthy/sovra/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/byteworthy/sovra/issues"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" /></a>
  <a href="https://github.com/byteworthy/sovra"><img src="https://img.shields.io/github/stars/byteworthy/sovra?style=flat-square" alt="GitHub Stars" /></a>
  <a href="https://github.com/byteworthy/sovra"><img src="https://img.shields.io/github/last-commit/byteworthy/sovra?style=flat-square" alt="Last Commit" /></a>
</p>

<br/>

> **Every AI SaaS boilerplate gives you auth and billing. None give you the AI infrastructure.**
> Every agent framework gives you LLM orchestration. None give you the SaaS wrapper.
> Sovra is both. One repo. One command. Production-ready.

<br/>

## Why Sovra?

You want to build an AI agent product. So you start wiring up auth, multi-tenancy, vector search, MCP tools, real-time collaboration, billing...

**Three months later, you still haven't shipped a single AI feature.**

Sovra eliminates that. Clone it, run it, build on it. What takes teams 3+ months, you get in one `git clone`.

<br/>

## &#x1f680; Quick Start

```bash
git clone https://github.com/byteworthy/sovra.git
cd sovra && pnpm install
supabase start              # Local Postgres + Auth + pgvector
cp .env.example .env.local  # Add Supabase keys from output
cd packages/web && pnpm dev # Open http://localhost:3000
```

**That's it.** Multi-tenant auth, vector database, agent runtime, real-time collaboration. Running locally.

<details>
<summary><strong>Full setup guide</strong> (prerequisites + Go worker)</summary>

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/) 8+
- [Go](https://go.dev/) 1.22+ (for the agent worker service)
- [Docker](https://www.docker.com/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)

### Step-by-step

```bash
# 1. Clone and install dependencies
git clone https://github.com/byteworthy/sovra.git
cd sovra
pnpm install

# 2. Start local Supabase (Postgres + Auth + pgvector)
supabase start
# Copy the API URL and anon/service_role keys from the output

# 3. Configure environment
cp .env.example .env.local
cp packages/web/.env.example packages/web/.env.local
# Fill in the Supabase keys from step 2

# 4. Start the web app
cd packages/web && pnpm dev
# Open http://localhost:3000

# 5. (Optional) Start the Go worker for agent features
cd packages/worker
go mod download
go run ./cmd/worker
```

### Environment Variables

See [`.env.example`](.env.example) for all options. Only Supabase keys are required — Stripe, Sentry, PostHog, and Upstash are optional and gracefully disabled when not configured.

</details>

<br/>

## &#x2728; What You Get

### SaaS Layer

Everything you'd spend months building before writing a single AI feature:

| | Feature | Details |
|-|---------|---------|
| &#x1f512; | **Multi-tenant auth** | Email, magic links, OAuth (Google, GitHub). Swappable via `AuthAdapter` interface. |
| &#x1f6e1; | **Tenant isolation** | Row-level security at the database. Postgres enforces it — not middleware, not app logic. |
| &#x1f465; | **Roles & permissions** | Owner, admin, member, viewer. Database-backed, tenant-configurable. |
| &#x1f4e8; | **Invite system** | Email invitations + shareable links. Works with or without SMTP. |
| &#x1f4b3; | **Billing** | Stripe integration — plans, usage tracking, customer portal. |
| &#x1f511; | **API keys** | Scoped generation with rate limiting and audit logging. |

### AI Layer

The part nobody else ships:

| | Feature | Details |
|-|---------|---------|
| &#x1f9e9; | **MCP native** | Full Model Context Protocol client AND server. Your agents use tools the ecosystem way. |
| &#x1f50d; | **Vector search** | pgvector inside your existing Postgres. Semantic search, hybrid search, tenant-scoped. |
| &#x1f916; | **Agent runtime** | Custom models, system prompts, tool assignments. Streaming via Vercel AI SDK. |
| &#x1f91d; | **Multi-agent workspaces** | 5 collaboration modes (round-robin, hierarchical, democratic, parallel, debate). Shared memory. Conflict resolution. |
| &#x1f9e0; | **Memory strategies** | Full history, summary compression, vector retrieval, or hybrid. |
| &#x1f6e0; | **Built-in tools** | File ops, web search, URL fetch, DB query, semantic search. All MCP-compliant. All tenant-scoped. |

### Production Layer

Ship it, don't just demo it:

| | Feature | Details |
|-|---------|---------|
| &#x2601; | **Deploy anywhere** | Docker, Railway, AWS, GCP. Self-hosted. Your data, your infrastructure. |
| &#x1f4ca; | **Admin dashboard** | Tenant management, user management, system health, audit logs. |
| &#x1f6a8; | **Monitoring** | Sentry for errors, PostHog for analytics. Pre-wired. |
| &#x1f50f; | **Security hardened** | CSP, HSTS, rate limiting, JWT verification, input validation. Production-ready. |

<br/>

## &#x1f527; The Stack

```
Frontend       Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
Agent Worker   Go 1.22+ with Gin + gRPC
Database       Supabase PostgreSQL + pgvector + Row Level Security
Auth           Supabase Auth (swappable via AuthAdapter)
Real-time      Socket.IO (Go server + React client)
AI SDK         Vercel AI SDK + MCP SDK
Billing        Stripe
Monitoring     Sentry + PostHog
```

<details>
<summary><strong>Why these choices?</strong></summary>

**Why Go for the worker?** Agent orchestration is I/O bound with bursts of CPU. Go's goroutines handle thousands of concurrent agent sessions on a single node. Python can't.

**Why Supabase?** Postgres + pgvector + auth + real-time + RLS in one service. No separate vector database bill. No separate auth service. Everything in one place, and you own the data.

**Why not NextAuth/Clerk/Auth0?** Sovra ships with Supabase Auth by default (zero config). But the `AuthAdapter` interface means you can swap to any provider by implementing 5 methods. No lock-in.

</details>

<br/>

## &#x1f3d7; Architecture

```
                    ┌─────────────────────────────────┐
                    │        Next.js Frontend          │
                    │     (App Router, AI SDK, UI)     │
                    └──────────┬──────────┬────────────┘
                               │          │
                          API  │          │  Socket.IO / gRPC
                               │          │
                    ┌──────────▼──┐  ┌────▼──────────────┐
                    │  Supabase   │  │    Go Worker       │
                    │  Auth + DB  │  │  Agents + MCP      │
                    │  + RLS      │  │  + Real-time       │
                    └──────┬──────┘  └────┬───────────────┘
                           │              │
                    ┌──────▼──────────────▼──────┐
                    │   PostgreSQL + pgvector     │
                    │   (Tenant-isolated, RLS)    │
                    └────────────────────────────┘
```

<br/>

## &#x1f4e6; Project Structure

```
sovra/
├── packages/
│   ├── web/           # Next.js 15 frontend + API routes
│   ├── worker/        # Go agent worker (MCP server, Socket.IO, gRPC)
│   └── shared/        # Shared TypeScript types and schemas
├── supabase/
│   └── migrations/    # 7 database migrations (apply with supabase db push)
├── docker/            # Docker Compose (dev + prod)
├── platform/          # Deployment configs (AWS, GCP, Railway)
├── docs/              # Deployment guide, env var reference
├── .github/           # CI/CD workflows
└── .env.example       # All config options with descriptions
```

<br/>

## &#x1f680; Deploy

### Docker

```bash
docker compose -f docker/compose.prod.yaml up -d
```

### Railway / Vercel / Fly.io

Deploy the Next.js app to any Node.js platform. Deploy the Go worker as a separate service. Point both at your Supabase project.

### Environment Variables

All required and optional variables are documented in [`.env.example`](.env.example). At minimum:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side) |
| `DATABASE_URL` | Worker | Direct Postgres connection for Go worker |
| `STRIPE_SECRET_KEY` | No | Enables billing features |
| `OPENAI_API_KEY` | No | Enables AI agent chat |
| `SENTRY_DSN` | No | Enables error tracking |

<br/>

## &#x1f91d; Who This Is For

- **Indie hackers** building AI-powered SaaS — skip 3 months of infrastructure work
- **Startups** that need multi-tenant AI agents on day one
- **Agencies** building white-label AI solutions with tenant isolation
- **Enterprise teams** evaluating self-hosted alternatives to closed-source agent platforms
- **Open-source contributors** looking for a solid, extensible AI platform foundation

### Who This Is NOT For

- Simple chatbot wrapper? Use [OpenWebUI](https://github.com/open-webui/open-webui)
- Agent framework only (no SaaS)? Use [LangGraph](https://github.com/langchain-ai/langgraph) or [CrewAI](https://github.com/crewAIInc/crewAI)
- Need a hosted solution? Sovra is self-hosted only

<br/>

## &#x1f4cb; Roadmap

| Phase | Status | What Ships |
|-------|:------:|-----------|
| Foundation | &#x2705; | Monorepo, database schema, Docker, dev environment |
| Core Infrastructure | &#x2705; | Supabase auth, multi-tenancy, RBAC, invitations |
| Agent Core | &#x2705; | Agent CRUD, chat interface, streaming, AI provider adapters |
| AI Features | &#x2705; | MCP client/server, built-in tools, vector storage, tool tracking |
| Multi-Agent | &#x2705; | Workspaces, 5 collab modes, 4 memory strategies, Socket.IO |
| Production Ready | &#x2705; | Stripe billing, admin dashboard, API keys, Sentry + PostHog, CI/CD |
| **Community** | **Next** | **Your contributions, new MCP tools, more AI providers** |

<br/>

## &#x1f91d; Contributing

Contributions welcome! Read the [contributing guide](CONTRIBUTING.md) before opening a PR.

**Good first contributions:**
- New MCP tools for agents
- Additional AI provider adapters (Gemini, local models)
- Documentation improvements
- Accessibility and i18n

<br/>

## &#x1f4dc; License

[MIT](LICENSE) — use it for anything. Commercial, personal, educational. No strings.

<br/>

---

<p align="center">
  <sub>Built by <a href="https://byteworthy.io">ByteWorthy</a></sub><br/>
  <sub>Ship AI products. Not infrastructure.</sub>
</p>

<p align="center">
  <a href="https://github.com/byteworthy/sovra">
    <img src="https://img.shields.io/github/stars/byteworthy/sovra?style=social" alt="Star Sovra on GitHub" />
  </a>
</p>
