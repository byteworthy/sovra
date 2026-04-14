# Phase 1: Foundation - Research

**Researched:** 2026-04-11
**Domain:** Monorepo setup, Next.js 15, Go worker, Supabase PostgreSQL, Docker Compose
**Confidence:** HIGH (for standard stack), MEDIUM (for database schema specifics)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None - all implementation choices are at Claude's discretion. Pure infrastructure phase.

### Claude's Discretion
All implementation choices. Use established best practices for monorepo setup, Docker configuration, and database schema design.

### Deferred Ideas (OUT OF SCOPE)
None - infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUN-01 | Monorepo structure with pnpm workspaces (web, worker, shared packages) | Section: Monorepo Setup |
| FOUN-02 | Next.js 15 with App Router, TypeScript, Tailwind CSS | Section: Next.js 15 App Router |
| FOUN-03 | Go 1.22+ worker service with Gin + gRPC structure | Section: Go Worker Service |
| FOUN-04 | Docker Compose all-in-one for local development | Section: Docker Compose |
| FOUN-05 | Docker Compose for production (expects external services) | Section: Docker Compose |
| DB-01 | Supabase PostgreSQL 15 setup | Section: Supabase Local Development |
| DB-02 | pgvector extension enabled for vector storage | Section: Supabase Local Development, Database Schema |
| DB-03 | All tables created (14 tables) | Section: Database Schema |
| DB-04 | RLS policies for tenant isolation | Section: RLS Policies |
| DB-05 | Database indexes for performance | Section: Database Schema |
</phase_requirements>

---

## Summary

Sovra Phase 1 sets up a hybrid monorepo: pnpm workspaces manage the TypeScript/JavaScript side (Next.js web app, shared types), while the Go worker lives at `packages/worker/` as a Go module with its own `go.mod`. pnpm workspaces do not manage Go modules - the Go service is invoked via a `Makefile` or shell commands called from pnpm scripts.

The project already has `packages/web/` scaffolded with Next.js 15 and Tailwind. However, there are three critical issues to fix: (1) `.cts`/`.ctsx` file extensions on React components (should be `.tsx`/`.ts`), (2) the `next.config.cts` file (should be `next.config.ts`), and (3) the `packages/shared/` and `packages/worker/` packages are missing. Supabase CLI is not installed on the dev machine but is available via Homebrew (`brew install supabase`). Go is not installed.

For local dev, the recommended pattern is **Supabase CLI + Docker Compose together**: `supabase start` runs the Supabase stack (Postgres + Auth + Storage + Studio) on dedicated ports, then a separate `docker-compose.yml` wraps Next.js and Go in containers that connect to the running Supabase stack. This avoids bundling all 12 Supabase containers into a custom compose file.

**Primary recommendation:** Fix existing file extension issues, create missing packages (shared, worker), initialize Supabase with migrations, and wire up Docker Compose using Supabase CLI for the DB layer.

---

## Project Constraints (from CLAUDE.md)

Directives from `CLAUDE.md` that the planner must honor:

- Directory structure is prescribed: `packages/web/`, `packages/worker/`, `packages/shared/`, `supabase/migrations/`, `docker/`, `platform/`
- After every coding task: `npm run test && npm run lint && npm run type-check` + `go build ./... && go test ./...` + commit + push
- Security: "Extremely hardened - no shortcuts." All API routes must check authentication, all DB queries must be tenant-scoped.
- Always use tenant-scoped queries. Test RLS policies with multiple tenants. Never bypass RLS in application code.
- Multi-tenancy is a core constraint from day one, not added later.
- Quality gates before claiming work complete: tests pass, lint clean, TypeScript/Go compile clean, build succeeds.

---

## Existing Codebase State

**What already exists (DO NOT recreate):**
- `package.json` (root) - pnpm workspace config, scripts wired [VERIFIED: codebase grep]
- `pnpm-workspace.yaml` - `packages: ['packages/*']` [VERIFIED: codebase grep]
- `packages/web/` - Next.js 15 app skeleton with App Router [VERIFIED: codebase grep]
- `packages/web/package.json` - deps including next@^15.1.0, react@^19, tailwindcss@^3.4.17, @supabase/supabase-js@^2.47.0 [VERIFIED: codebase grep]
- `packages/web/tailwind.config.ts` - CSS variable-based design tokens, shadcn/ui compatible [VERIFIED: codebase grep]
- `packages/web/tsconfig.json` - strict, bundler module resolution, paths for `@/*` and `@sovra/shared/*` [VERIFIED: codebase grep]
- `packages/web/components/ui/` - button.tsx, badge.tsx, card.ctsx (note wrong extension) [VERIFIED: codebase grep]
- `platform/railway/`, `platform/aws/`, `platform/gcp/` - directories exist (contents unknown)
- `supabase/migrations/` - directory exists but empty [VERIFIED: codebase grep]

**What needs to be created:**
- `packages/worker/` - Go worker service (missing entirely)
- `packages/shared/` - Shared TypeScript types package (missing)
- `supabase/config.toml` - Supabase project config (missing)
- `docker/` files - Docker Compose configs (directory exists but empty)
- Migration SQL files in `supabase/migrations/`

**Critical bugs in existing scaffold to fix:**
- `packages/web/app/layout.cts` and `page.cts` - must be renamed to `.tsx`
- `packages/web/components/ui/card.ctsx` - must be renamed to `.tsx`
- `packages/web/next.config.cts` - must be renamed to `next.config.ts`
- The `.cts` extension means CommonJS TypeScript module, incompatible with Next.js App Router JSX components

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^15.1.0 (already in package.json) | Frontend + API routes | App Router, Turbopack, Server Actions |
| React | ^19.0.0 | UI rendering | Required by Next.js 15 |
| TypeScript | ^5.7.0 | Type safety | Already configured |
| Tailwind CSS | ^3.4.17 | Styling | Already configured with CSS vars |
| pnpm | 9.0.0 | Package manager + workspaces | Already set in packageManager field |
| Gin | v1.12.0 | Go HTTP framework | Latest stable [VERIFIED: Go proxy] |
| google.golang.org/grpc | v1.80.0 | gRPC for Go | Latest stable [VERIFIED: Go proxy] |
| pgx/v5 | v5.9.1 | Go PostgreSQL driver | Standard, pgxpool for pooling [VERIFIED: Go proxy] |
| air-verse/air | v1.65.0 | Go hot reload | Standard for Docker dev [VERIFIED: Go proxy] |
| @supabase/supabase-js | ^2.47.0 (already in package.json) | Supabase client | Official client |
| @supabase/ssr | ^0.5.2 (already in package.json) | Server-side Supabase | Required for Next.js App Router |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.4 | Unit testing for Next.js | Phase 1 test wiring only |
| @vitejs/plugin-react | ^6.0.1 | Vitest React support | Required with vitest |
| @testing-library/react | ^16.3.2 | Component testing utilities | When testing React components |
| vite-tsconfig-paths | latest | Path alias resolution in tests | Resolves @/* imports in tests |
| golang-migrate/migrate | v4.19.1 | DB migration runner in Go | If Go service needs to run migrations |

**Note on Tailwind:** Package.json has `tailwindcss@^3.4.17`. The current npm latest is 4.2.2 (Tailwind v4). v4 uses a completely different config format (no tailwind.config.ts, CSS-based config). The existing scaffold is wired for **Tailwind v3**. Do NOT upgrade to v4 - it would require complete config rewrite. [VERIFIED: npm registry]

**Note on Next.js version:** The existing `package.json` pins `next@^15.1.0`. The npm `latest` tag is now 16.2.3 (Next.js 16), but the project specifies 15. Stick with 15.x (currently 15.3.9 is `next-15-3` tag). [VERIFIED: npm registry]

### Installation Commands
```bash
# Supabase CLI (dev machine, one-time)
brew install supabase

# Go (dev machine, one-time)
brew install go  # installs 1.22+

# Go worker dependencies (run inside packages/worker/)
go mod init github.com/sovra/worker
go get github.com/gin-gonic/gin@v1.12.0
go get google.golang.org/grpc@v1.80.0
go get github.com/jackc/pgx/v5@v5.9.1
go get github.com/jackc/pgx/v5/pgxpool@v5.9.1

# Shared package (pnpm, from root)
pnpm --filter @sovra/shared install

# Vitest for web package
pnpm --filter @sovra/web add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

---

## Architecture Patterns

### Recommended Project Structure
```
sovra/
├── packages/
│   ├── web/                    # Next.js 15 App Router (EXISTS, needs fixes)
│   │   ├── app/                # Routes, layouts, pages (.tsx not .cts)
│   │   │   ├── layout.tsx      # Root layout (RENAME from .cts)
│   │   │   ├── page.tsx        # Home page (RENAME from .cts)
│   │   │   └── (routes)/       # Route groups added in later phases
│   │   ├── components/
│   │   │   └── ui/             # shadcn/ui components (fix card.ctsx → .tsx)
│   │   ├── lib/
│   │   │   ├── utils.ts        # cn() utility (EXISTS)
│   │   │   └── supabase/       # Supabase client helpers (ADD)
│   │   │       ├── client.ts   # Browser client
│   │   │       └── server.ts   # Server client (for Server Components)
│   │   ├── next.config.ts      # RENAME from next.config.cts
│   │   ├── tailwind.config.ts  # EXISTS - v3 config, keep as-is
│   │   └── package.json        # EXISTS
│   ├── worker/                 # Go worker service (CREATE)
│   │   ├── cmd/
│   │   │   └── worker/
│   │   │       └── main.go     # Entry point
│   │   ├── internal/
│   │   │   ├── config/         # Config loading (env vars)
│   │   │   ├── db/             # Database connection (pgxpool)
│   │   │   ├── grpc/           # gRPC server setup
│   │   │   └── http/           # Gin HTTP server (health checks)
│   │   ├── proto/              # .proto files for gRPC contracts
│   │   ├── go.mod
│   │   ├── go.sum
│   │   ├── Dockerfile          # Multi-stage: builder + runtime
│   │   ├── Dockerfile.dev      # Dev: uses air for hot reload
│   │   └── .air.toml           # Air config for hot reload
│   └── shared/                 # Shared TypeScript types (CREATE)
│       ├── types/
│       │   ├── database.ts     # Generated Supabase types
│       │   └── index.ts        # Manual shared types
│       └── package.json        # name: @sovra/shared
├── supabase/
│   ├── config.toml             # Supabase project config (CREATE)
│   ├── migrations/             # SQL migration files (ADD files)
│   │   └── 20260411000000_initial_schema.sql
│   └── seed.sql                # Dev seed data (optional)
├── docker/
│   ├── compose.dev.yaml        # Local dev: Next.js + Go + depends on supabase start
│   └── compose.prod.yaml       # Prod: Next.js + Go (external DB/auth)
├── platform/
│   ├── railway/                # EXISTS (contents TBD)
│   ├── aws/                    # EXISTS
│   └── gcp/                    # EXISTS
├── Makefile                    # Go build/test/generate commands
├── package.json                # Root pnpm workspace (EXISTS)
└── pnpm-workspace.yaml         # EXISTS
```

### Pattern 1: pnpm + Go Hybrid Monorepo
**What:** pnpm workspaces manage JS/TS packages only. Go lives in `packages/worker/` as a first-class Go module, invoked from pnpm scripts via shell exec.
**When to use:** Any JS+Go hybrid monorepo.
**Example:**
```json
// Root package.json (root-level scripts for Go)
{
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "go:build": "cd packages/worker && go build ./...",
    "go:test": "cd packages/worker && go test ./...",
    "go:dev": "cd packages/worker && air -c .air.toml"
  }
}
```
```yaml
# pnpm-workspace.yaml - JS/TS packages only
packages:
  - 'packages/web'
  - 'packages/shared'
# Note: packages/worker is NOT listed here (it's a Go module, not a pnpm package)
```
[VERIFIED: pnpm workspace docs pattern + community practice]

### Pattern 2: Next.js 15 Supabase Client Setup
**What:** Two Supabase clients required - one for browser (components), one for server (Server Components, Route Handlers, Server Actions). `@supabase/ssr` handles cookie-based session management.
**When to use:** All Next.js 15 App Router projects using Supabase Auth.
**Example:**
```typescript
// Source: Supabase docs + @supabase/ssr package
// packages/web/lib/supabase/client.ts (browser)
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// packages/web/lib/supabase/server.ts (server components)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}
```
[CITED: supabase.com/docs/guides/auth/server-side/nextjs]

### Pattern 3: Go Worker Structure
**What:** `cmd/worker/main.go` is the entry point. Business logic in `internal/`. Clean separation of HTTP (Gin health endpoints) from gRPC (agent execution).
```go
// packages/worker/cmd/worker/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/sovra/worker/internal/config"
    "github.com/sovra/worker/internal/db"
    "github.com/sovra/worker/internal/grpc"
    "github.com/sovra/worker/internal/http"
)

func main() {
    cfg := config.Load()
    pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
    if err != nil { log.Fatalf("db connect: %v", err) }
    defer pool.Close()

    go http.StartHealthServer(cfg.HTTPPort)
    go grpc.StartServer(cfg.GRPCPort, pool)

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("shutting down")
}
```
[ASSUMED - standard Go service entrypoint pattern]

### Pattern 4: Air Hot Reload in Docker
```toml
# packages/worker/.air.toml
root = "."
tmp_dir = "/tmp/air"

[build]
  cmd = "go build -o /tmp/air/worker ./cmd/worker"
  bin = "/tmp/air/worker"
  delay = 1000
  exclude_dir = ["vendor", "testdata"]
  include_ext = ["go", "mod"]
  kill_delay = "0s"

[log]
  time = true

[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"
```
[CITED: github.com/air-verse/air]

### Anti-Patterns to Avoid
- **Using `.cts` extensions for React components:** `.cts` = CommonJS TypeScript module. React/JSX requires `.tsx`. Files in the existing scaffold named `layout.cts`, `page.cts`, `card.ctsx` must be renamed. [VERIFIED: TypeScript docs]
- **Including Go in pnpm-workspace.yaml:** Go is not a pnpm package. Listing `packages/worker` in pnpm-workspace.yaml causes `pnpm install` to fail with "no package.json" errors.
- **Running `supabase start` inside Docker Compose:** Supabase CLI manages its own Docker containers. The dev workflow is `supabase start` (Supabase stack) + `docker-compose up` (app services). Do not attempt to nest them.
- **Calling `supabase db push` for local dev:** Use `supabase db reset` locally (re-applies all migrations from scratch). `db push` is for pushing to remote Supabase cloud.
- **Creating IVFFlat index on empty table:** IVFFlat requires training data. For phase 1 (empty DB), use HNSW which can index an empty table. [CITED: pgvector README]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Go hot reload | Custom file watcher | Air (air-verse/air) | Handles OS-level file events, binary restart |
| Go DB connection pool | sync.Pool or custom | pgxpool (pgx/v5) | Handles idle connections, health checks, prepared statements |
| TypeScript types for DB | Manual interface typing | `supabase gen types typescript` | Auto-generates from live schema, stays in sync |
| Tenant context in RLS | Custom session variable | Supabase JWT claims (app_metadata) | Built into every query automatically via auth.jwt() |
| Docker health check polling | Bash sleep loops | Docker native healthcheck + `depends_on: condition: service_healthy` | Correct startup ordering, visible in `docker ps` |

**Key insight:** The entire Supabase local stack (Postgres, Auth, Storage, Studio, Realtime) is managed by `supabase start` - no custom Postgres container needed. This saves 100+ lines of Docker Compose complexity.

---

## Supabase Local Development

### CLI Workflow
```bash
# One-time setup
brew install supabase   # macOS
supabase init           # Creates supabase/config.toml

# Daily workflow
supabase start          # Starts local stack on Docker
supabase status         # Shows URLs and keys
# Studio:  http://localhost:54323
# API:     http://localhost:54321
# DB:      postgresql://postgres:postgres@localhost:54322/postgres

# Migrations
supabase migration new initial_schema          # Creates supabase/migrations/TIMESTAMP_initial_schema.sql
# Edit the SQL file
supabase db reset                              # Applies all migrations to local DB

# Generate types (run after schema changes)
supabase gen types typescript --local > packages/shared/types/database.ts
```
[CITED: supabase.com/docs/guides/local-development/overview]

### Key Config (supabase/config.toml)
```toml
[api]
port = 54321

[db]
port = 54322
major_version = 15

[studio]
port = 54323

[inbucket]
port = 54324   # Local email testing

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["https://localhost:3000"]
```
[CITED: supabase.com/docs/guides/cli/config]

### pgvector Setup in Migration
```sql
-- supabase/migrations/20260411000000_initial_schema.sql
-- Enable pgvector
create extension if not exists vector with schema extensions;

-- Vector column example (dimensions depend on embedding model)
-- OpenAI text-embedding-3-small: 1536 dims
-- OpenAI text-embedding-3-large: 3072 dims  
-- Sentence transformers (local): 384 dims
-- Use 1536 as safe default for OpenAI compatibility

-- HNSW index (can build on empty table, unlike IVFFlat)
create index on vector_documents using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```
[CITED: supabase.com/docs/guides/database/extensions/pgvector]

---

## Database Schema

All 14 required tables (DB-03). Organized by dependency order.

```sql
-- ===== FOUNDATION TABLES =====

-- Tenants: top-level isolation boundary
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,           -- used for subdomain routing
  name        text not null,
  plan        text not null default 'free',   -- free | pro | enterprise
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Users: references auth.users (Supabase manages auth)
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tenant membership + RBAC
create table tenant_users (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        text not null default 'member', -- owner | admin | member | viewer
  created_at  timestamptz not null default now(),
  unique(tenant_id, user_id)
);

-- Subscriptions (Lemon Squeezy - Phase 6, but table created now)
create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  lemon_squeezy_id      text unique,
  plan                  text not null default 'free',
  status                text not null default 'active',
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ===== AGENT TABLES =====

-- Agents
create table agents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  description     text,
  system_prompt   text,
  model_provider  text not null default 'openai',  -- openai | anthropic | etc.
  model_name      text not null default 'gpt-4o',
  temperature     numeric(3,2) not null default 0.7,
  max_tokens      integer not null default 4096,
  tools           jsonb not null default '[]',     -- array of tool names
  status          text not null default 'idle',    -- idle | running | error
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Workspaces: multi-agent collaboration contexts
create table workspaces (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  name                text not null,
  description         text,
  collaboration_mode  text not null default 'round_robin', -- round_robin | hierarchical | democratic | parallel
  conflict_resolution text not null default 'vote',        -- vote | hierarchy | consensus
  created_by          uuid references users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ===== CONVERSATION TABLES =====

-- Conversations
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  workspace_id  uuid references workspaces(id) on delete set null,
  agent_id      uuid references agents(id) on delete set null,
  user_id       uuid references users(id) on delete set null,
  title         text,
  memory_type   text not null default 'conversation', -- conversation | summary | vector | hybrid
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Messages
create table messages (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  agent_id        uuid references agents(id) on delete set null,
  role            text not null,            -- user | assistant | system | tool
  content         text not null,
  tool_calls      jsonb,                    -- array of {name, arguments, result}
  tokens_used     integer,
  created_at      timestamptz not null default now()
);

-- Shared memory between agents in workspace
create table shared_memory (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  key           text not null,
  value         jsonb not null,
  updated_by    uuid references agents(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(workspace_id, key)
);

-- ===== VECTOR / AI TABLES =====

-- Vector documents for semantic search
create table vector_documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  agent_id    uuid references agents(id) on delete set null,
  content     text not null,
  metadata    jsonb not null default '{}',
  embedding   extensions.vector(1536),     -- pgvector column
  created_at  timestamptz not null default now()
);

-- ===== OPERATIONAL TABLES =====

-- Tool execution tracking
create table tool_executions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  agent_id        uuid references agents(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  tool_name       text not null,
  input           jsonb not null default '{}',
  output          jsonb,
  status          text not null default 'pending', -- pending | running | success | error | timeout
  error_message   text,
  duration_ms     integer,
  cost_usd        numeric(10, 6),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- Audit logs (append-only)
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,               -- agent.create | agent.delete | etc.
  resource    text not null,               -- resource type
  resource_id uuid,
  metadata    jsonb not null default '{}',
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- API keys for programmatic access
create table api_keys (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  created_by      uuid references users(id),
  name            text not null,
  key_hash        text unique not null,   -- bcrypt hash of the actual key
  key_prefix      text not null,          -- first 8 chars for display (e.g. "ag_live_")
  permissions     jsonb not null default '[]',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Feature flags for tenant/plan gating
create table feature_flags (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,  -- null = global
  flag_name   text not null,
  enabled     boolean not null default false,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique(tenant_id, flag_name)
);
```
[ASSUMED - derived from REQUIREMENTS.md table list + standard SaaS patterns. Specific field choices are discretionary.]

### Database Indexes (DB-05)
```sql
-- Tenant isolation (most critical - used in every RLS policy)
create index idx_agents_tenant_id on agents(tenant_id);
create index idx_conversations_tenant_id on conversations(tenant_id);
create index idx_messages_tenant_id on messages(tenant_id);
create index idx_vector_documents_tenant_id on vector_documents(tenant_id);
create index idx_tool_executions_tenant_id on tool_executions(tenant_id);
create index idx_audit_logs_tenant_id on audit_logs(tenant_id);
create index idx_api_keys_tenant_id on api_keys(tenant_id);

-- Lookup by foreign key
create index idx_messages_conversation_id on messages(conversation_id);
create index idx_conversations_agent_id on conversations(agent_id);
create index idx_tenant_users_user_id on tenant_users(user_id);
create index idx_tool_executions_agent_id on tool_executions(agent_id);

-- Time-series queries
create index idx_messages_created_at on messages(created_at desc);
create index idx_audit_logs_created_at on audit_logs(created_at desc);

-- Vector similarity (HNSW - builds on empty table, unlike IVFFlat)
create index idx_vector_documents_embedding on vector_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);
```
[ASSUMED - standard indexing patterns for the access patterns described in REQUIREMENTS.md]

---

## RLS Policies

### Multi-Tenant RLS Pattern

Supabase RLS uses the authenticated user's JWT to determine tenant context. The recommended pattern stores `tenant_id` in JWT `app_metadata` (set server-side only, not writable by users). The `auth.jwt()` function makes this accessible in policies.

```sql
-- Enable RLS on all tenant-scoped tables
alter table tenants enable row level security;
alter table agents enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table workspaces enable row level security;
alter table shared_memory enable row level security;
alter table vector_documents enable row level security;
alter table tool_executions enable row level security;
alter table audit_logs enable row level security;
alter table api_keys enable row level security;

-- Helper function: get current user's tenant_id
-- Using (select ...) wrapper caches the result per query (performance)
create or replace function get_current_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id
  from tenant_users
  where user_id = (select auth.uid())
  limit 1;
$$;

-- Example RLS policy for agents table
-- SELECT: user can only see agents in their tenant
create policy "tenant_isolation_select" on agents
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- INSERT: user can only create agents in their tenant
create policy "tenant_isolation_insert" on agents
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

-- UPDATE: user can only update agents in their tenant
create policy "tenant_isolation_update" on agents
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

-- DELETE: user can only delete agents in their tenant
create policy "tenant_isolation_delete" on agents
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- Repeat this same 4-policy pattern for each tenant-scoped table
```
[CITED: makerkit.dev/blog/tutorials/supabase-rls-best-practices + supabase.com/docs/guides/database/row-level-security]

### RLS for Audit Logs (insert-only by design)
```sql
-- Audit logs: authenticated users can read their tenant's logs
create policy "tenant_audit_select" on audit_logs
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- Insert allowed (service role inserts audit entries)
-- No UPDATE or DELETE policy - append-only enforcement
create policy "tenant_audit_insert" on audit_logs
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));
```

### Common RLS Pitfalls
1. **Missing `(select ...)` wrapper on auth functions**: `auth.uid()` called without `(select auth.uid())` re-evaluates per row (O(n) not O(1)). Always wrap: `(select auth.uid())`. [CITED: Supabase RLS performance docs]
2. **Using `user_metadata` for tenant ID**: `user_metadata` is client-writable. Only `app_metadata` is server-controlled. Tenant ID must come from `app_metadata` or from a DB lookup via `tenant_users`. [CITED: makerkit.dev RLS guide]
3. **Forgetting `to authenticated`**: Without specifying the role, the policy applies to all roles including `anon`, causing potential leaks. Always specify `to authenticated` for tenant-scoped data.
4. **Service role bypasses all RLS**: Go worker connecting with `DATABASE_URL` (direct DB URL) bypasses RLS entirely. Use the pooler URL + set the tenant context in the connection when reading tenant data from Go. [ASSUMED - known Supabase pattern]

---

## Docker Compose

### Local Development Pattern (`docker/compose.dev.yaml`)

**Architecture decision:** Supabase runs via `supabase start` (CLI-managed). The compose file only runs the application services (Next.js + Go worker) and exposes them to the already-running Supabase network.

```yaml
# docker/compose.dev.yaml
name: sovra-dev

services:
  web:
    build:
      context: ../packages/web
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ../packages/web:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    network_mode: host   # Allows access to supabase start ports
    command: pnpm dev

  worker:
    build:
      context: ../packages/worker
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"   # HTTP health/admin
      - "50051:50051" # gRPC
    volumes:
      - ../packages/worker:/app
      - go-cache:/root/.cache/go
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
      - HTTP_PORT=8080
      - GRPC_PORT=50051
      - GO_ENV=development
    network_mode: host
    command: air -c .air.toml

volumes:
  go-cache:
```

### Production Pattern (`docker/compose.prod.yaml`)
```yaml
# docker/compose.prod.yaml - expects external DB, Auth, etc.
name: sovra-prod

services:
  web:
    image: sovra/web:${VERSION:-latest}
    build:
      context: ../packages/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  worker:
    image: sovra/worker:${VERSION:-latest}
    build:
      context: ../packages/worker
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - HTTP_PORT=8080
      - GRPC_PORT=50051
    restart: unless-stopped
    depends_on:
      web:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```
[ASSUMED - standard Docker Compose v2 patterns, verified compose v2 uses `compose.yaml` not `docker-compose.yml`]

### Key Docker Compose v2 Notes
- Filename: `compose.yaml` (canonical) or `compose.dev.yaml` / `compose.prod.yaml`. Both work. `docker-compose.yml` still accepted for backward compat. [VERIFIED: Docker docs]
- `depends_on: condition: service_healthy` requires a healthcheck to be defined on the dependency. [VERIFIED: Docker docs]
- Go multi-stage Dockerfile: use `golang:1.22-alpine` as builder, `alpine:3.20` as runtime. Binary-only final image. [ASSUMED - standard Go Docker pattern]

---

## Testing Setup

### Validation Architecture

**nyquist_validation is ENABLED** (confirmed in `.planning/config.json`)

#### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 + @testing-library/react 16.3.2 (to be installed) |
| Go testing | Built-in `go test ./...` |
| Config file | `packages/web/vitest.config.ts` (to be created - Wave 0) |
| Quick run (web) | `pnpm --filter @sovra/web test --run` |
| Full suite (web) | `pnpm --filter @sovra/web test` |
| Quick run (worker) | `cd packages/worker && go test ./...` |
| Full suite (worker) | `cd packages/worker && go test -race ./...` |

#### Vitest Config (to create)
```typescript
// packages/web/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```
[CITED: nextjs.org/docs/app/guides/testing/vitest]

#### Phase 1 Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUN-02 | Next.js compiles without errors | compile | `pnpm --filter @sovra/web typecheck` | ❌ Wave 0 |
| FOUN-02 | Root layout renders | unit | `pnpm --filter @sovra/web test --run` | ❌ Wave 0 |
| FOUN-03 | Go worker compiles | compile | `cd packages/worker && go build ./...` | ❌ Wave 0 |
| FOUN-03 | Go worker connects to DB | integration | `cd packages/worker && go test ./internal/db/...` | ❌ Wave 0 |
| DB-03 | All tables exist | smoke | `supabase db diff --local` (no diff = tables present) | ❌ Wave 0 |
| DB-04 | RLS prevents cross-tenant access | manual | pgTap or manual psql test | ❌ Wave 0 |
| FOUN-04 | Docker Compose starts | smoke | `docker compose -f docker/compose.dev.yaml up --wait` | ❌ Wave 0 |

#### Wave 0 Gaps
- [ ] `packages/web/vitest.config.ts` - Vitest configuration
- [ ] `packages/web/vitest.setup.ts` - Test setup (jest-dom matchers)
- [ ] `packages/web/__tests__/layout.test.tsx` - Root layout smoke test
- [ ] `packages/worker/internal/db/db_test.go` - DB connection test
- [ ] Vitest install: `pnpm --filter @sovra/web add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`

#### Sampling Rate
- **Per task commit:** `pnpm --filter @sovra/web typecheck && pnpm --filter @sovra/web lint`
- **Per wave merge:** `pnpm test && pnpm typecheck` (root runs all)
- **Phase gate:** Full suite green + `go test ./...` before `/gsd-verify-work`

---

## Common Pitfalls

### Pitfall 1: `.cts` File Extensions on React Components
**What goes wrong:** Next.js fails to compile or renders blank pages. TypeScript shows "JSX element implicitly has type 'any'" or similar.
**Why it happens:** `.cts` = CommonJS TypeScript module. It cannot contain JSX. React components need `.tsx`. The existing scaffold has this bug (`layout.cts`, `page.cts`, `card.ctsx`).
**How to avoid:** Rename all React component files to `.tsx`, all utility files to `.ts`. The `next.config.cts` → `next.config.ts` rename is also required.
**Warning signs:** `tsc --noEmit` reports JSX errors; `next dev` output shows module resolution failures.

### Pitfall 2: Supabase CLI Not Installed
**What goes wrong:** `supabase init`, `supabase start` commands not found. Migration workflow blocked.
**Why it happens:** Supabase CLI is not installed (confirmed: not in PATH, not in homebrew).
**How to avoid:** `brew install supabase` as first step. Version available via brew: 2.84.2. [VERIFIED: brew info supabase]
**Warning signs:** `command not found: supabase`

### Pitfall 3: Go Not Installed
**What goes wrong:** `go build`, `go test`, Air commands fail.
**Why it happens:** Go is not installed on the dev machine. [VERIFIED: `go not in PATH`]
**How to avoid:** `brew install go` installs the current release (1.24+, satisfies the `>=1.22` requirement).
**Warning signs:** `command not found: go`

### Pitfall 4: pnpm Workspace Including Go Package
**What goes wrong:** `pnpm install` fails with "no package.json in packages/worker".
**Why it happens:** `pnpm-workspace.yaml: packages: ['packages/*']` matches `packages/worker/` which is a Go module without `package.json`.
**How to avoid:** Either (a) add a stub `package.json` to `packages/worker/` with just `{"name": "@sovra/worker", "private": true}`, or (b) explicitly list only JS packages in `pnpm-workspace.yaml`.
**Warning signs:** pnpm install fails with "No matching version found."

### Pitfall 5: RLS Blocks Service Role Connections
**What goes wrong:** Go worker queries return no rows even when data exists.
**Why it happens:** Go worker connecting to Supabase with a non-service-role key gets RLS applied. Worker has no `auth.uid()` so all tenant-scoped policies return false.
**How to avoid:** Go worker uses `DATABASE_URL` (direct connection bypassing PostgREST) which uses the `postgres` superuser role - RLS is **bypassed** for direct connections. Ensure `DATABASE_URL` uses the direct connection string, not the PostgREST URL. For operations that need tenant scoping from Go, set `SET app.current_tenant_id = '...'` before the query.
**Warning signs:** Empty result sets from Go, works fine from browser.

### Pitfall 6: pgvector `extensions.vector` vs `public.vector`
**What goes wrong:** `ERROR: type "vector" does not exist` in queries.
**Why it happens:** Supabase enables pgvector in the `extensions` schema. Using `vector(1536)` without schema prefix fails if `extensions` is not in `search_path`.
**How to avoid:** Use `extensions.vector(1536)` in table definitions. Or add `extensions` to the database search path in `supabase/config.toml`.
**Warning signs:** Migration applies successfully but table queries fail with type errors.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 2) | Supabase Auth (Phase 2) |
| V3 Session Management | No (Phase 2) | @supabase/ssr with cookies |
| V4 Access Control | Yes | RLS policies on all tables |
| V5 Input Validation | Partial | zod (already in deps) |
| V6 Cryptography | No (Phase 2) | Supabase handles auth tokens |

### Foundational Security for Phase 1

| Pattern | Standard Control |
|---------|-----------------|
| Secrets in environment | `.env.local` (gitignored), never hardcoded |
| Docker secrets | Environment variables via `.env` file, never baked into images |
| DB passwords | Strong random values; Supabase local uses `postgres` (dev only) |
| API key storage | `key_hash` column stores bcrypt hash; `key_prefix` for display only (table pre-created in Phase 1, used in Phase 6) |
| Audit trail | `audit_logs` table created Phase 1 - insert-only RLS policy |

### .gitignore Must Cover (Phase 1)
```
.env
.env.local
.env.production
packages/web/.env.local
packages/worker/.env
supabase/.env
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next.config.js` | `next.config.ts` (TypeScript config) | Next.js 15.0 | Type-safe config; native TS support |
| `pages/` directory | `app/` directory (App Router) | Next.js 13+ | Server Components, layouts, async components |
| `tailwind.config.js` | v3: still `.ts`; v4: `@import "tailwindcss"` in CSS | Tailwind v4 (2025) | Project uses v3 - do NOT upgrade |
| `gin` v1.9 | `gin` v1.12 (2026-02-28) | Feb 2026 | Go 1.25 module requirement |
| `google.golang.org/grpc` v1.6x | v1.80.0 | Apr 2026 | Latest stable |
| `pgx` v4 | `pgx` v5.9.1 | Stable major v5 | API changes; v5 is current |
| `docker-compose.yml` | `compose.yaml` | Docker Compose v2 | Canonical filename changed |
| IVFFlat index (default) | HNSW index (preferred) | pgvector 0.5+ | HNSW: no training data required, better recall |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | All services, Supabase local | ✓ | 28.5.2 | - |
| pnpm | JS package management | ✓ | 9.0.0 | - |
| Node.js | Next.js dev, pnpm scripts | ✓ | v22.22.0 | - |
| Go | packages/worker build | ✗ | - | Install via `brew install go` |
| Supabase CLI | DB migrations, local dev | ✗ | - | Install via `brew install supabase` (2.84.2 available) |
| Air (Go hot reload) | Dev workflow for worker | ✗ | - | Install via `go install github.com/air-verse/air@latest` after Go installed |

**Missing dependencies with no fallback:**
- Go runtime - required to build/run the worker service. Must be installed before worker tasks.
- Supabase CLI - required for `supabase init`, `supabase start`, and migration workflow. Must be installed before DB tasks.

**Missing dependencies with fallback:**
- Air (hot reload) - dev convenience only. Can develop without it by rebuilding the Go binary manually. Not a blocker for phase 1.

---

## Open Questions

1. **Shared package scope**
   - What we know: `pnpm-workspace.yaml` covers `packages/*`, and `tsconfig.json` has `@sovra/shared/*` path alias pointing to `../shared/*`
   - What's unclear: Does `packages/shared/` need a full `package.json` with build step, or just TypeScript files consumed via path alias?
   - Recommendation: Use TypeScript path alias only (no build step) for Phase 1. Supabase-generated types + manual types. Add build step in Phase 2 if needed.

2. **Go worker: gRPC vs HTTP for Phase 1**
   - What we know: FOUN-03 says "Gin + gRPC structure" but Phase 1 has no actual agent execution. The worker just needs to compile and connect to DB.
   - What's unclear: Should gRPC be fully wired in Phase 1 or just stubbed?
   - Recommendation: Create the gRPC server stub with one health RPC. Full protocol defined in Phase 3 when agent execution is built.

3. **Docker network for local dev**
   - What we know: `supabase start` creates its own Docker network. App services in `compose.dev.yaml` need to reach Supabase ports.
   - What's unclear: `network_mode: host` works on Linux but not on macOS Docker Desktop (where host network is the VM, not the Mac).
   - Recommendation: Use `host.docker.internal` for macOS. Use `localhost` (with `network_mode: host`) for Linux. Document both in compose file comments.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 14-table schema field types and column names are correct for Phase 1 | Database Schema | Need to adjust schema in migration; low risk since no data exists yet |
| A2 | Go worker can use `network_mode: host` in dev Docker Compose to reach Supabase CLI ports | Docker Compose | Docker compose dev won't work on macOS - need `host.docker.internal` fallback |
| A3 | pnpm-workspace.yaml currently causes `pnpm install` to fail due to Go module directory | Monorepo Setup | May actually work if Go module directory doesn't have conflicting files - test during execution |
| A4 | Go worker uses direct DB connection bypassing RLS | RLS Policies, Pitfall 5 | Worker queries might be unexpectedly scoped - verify during integration |
| A5 | `extensions.vector` schema prefix required for pgvector | Database Schema | Schema resolution may work without prefix if search_path is set in supabase config |

---

## Sources

### Primary (HIGH confidence)
- npm registry - verified package versions: next@15.1.0, tailwindcss@3.4.17, @supabase/supabase-js@2.103.0, vitest@4.1.4, @vitejs/plugin-react@6.0.1, @testing-library/react@16.3.2
- Go module proxy (proxy.golang.org) - verified: gin@v1.12.0 (2026-02-28), grpc@v1.80.0 (2026-04-01), pgx/v5@v5.9.1 (2026-03-22), air@v1.65.0 (2026-04-05)
- Existing codebase files - verified: package.json, pnpm-workspace.yaml, tsconfig.json, tailwind.config.ts, next.config.cts (with bug), components/
- Docker version - Docker 28.5.2 confirmed installed
- Supabase brew info - version 2.84.2 available, not installed
- Go: not installed (confirmed not in PATH)

### Secondary (MEDIUM confidence)
- [supabase.com/docs/guides/local-development/overview](https://supabase.com/docs/guides/local-development/overview) - CLI workflow, migration commands
- [supabase.com/docs/guides/database/extensions/pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) - pgvector extension setup
- [makerkit.dev/blog/tutorials/supabase-rls-best-practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - RLS patterns for multi-tenant apps
- [nextjs.org/docs/app/guides/testing/vitest](https://nextjs.org/docs/app/guides/testing/vitest) - Vitest setup for Next.js
- [github.com/air-verse/air](https://github.com/air-verse/air) - Air configuration reference
- WebSearch: Next.js 15 pnpm best practices, Docker Compose patterns, RLS patterns

### Tertiary (LOW confidence)
- Go worker internal structure (cmd/internal layout) - standard Go pattern, widely adopted

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - versions verified against npm registry and Go module proxy
- Architecture patterns: MEDIUM - standard patterns, some specific to this hybrid stack
- Database schema: MEDIUM - table names from REQUIREMENTS.md, field choices assumed
- Pitfalls: HIGH - bugs (`.cts` extensions, missing tools) verified against existing codebase
- RLS patterns: MEDIUM - cited from Supabase official docs and respected community source

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable ecosystem; Go modules, Supabase CLI change slowly)

---

## RESEARCH COMPLETE
