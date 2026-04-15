# Sovra — Agent & Contributor Guide

Sovra is an open-source, AI-native SaaS platform for building multi-tenant AI agent applications with MCP, vector search, and multi-agent collaboration. This file gives AI coding agents and contributors the context needed to work in the repository productively.

- **Repo:** github.com/byteworthy/sovra
- **Stack:** Next.js 15 + Go 1.22+ + Supabase + Tailwind + shadcn/ui
- **Maintainer:** [ByteWorthy](https://byteworthy.io)
- **License:** MIT (see `LICENSE`)
- **Commercial derivative:** [Klienta](https://github.com/byteworthy/klienta) — white-label client-portal boilerplate for AI agencies

## Quick Start

```bash
pnpm install
supabase start
cp .env.example .env.local && cp packages/web/.env.example packages/web/.env.local
cd packages/web && pnpm dev          # http://localhost:3000
cd packages/worker && go run ./cmd/worker  # Agent worker (optional)
```

## Directory Structure

```
sovra/
├── packages/
│   ├── web/           # Next.js frontend + API routes
│   ├── worker/        # Go agent worker (MCP, Socket.IO, gRPC)
│   └── shared/        # Shared TypeScript types and schemas
├── supabase/
│   └── migrations/    # 7 database migrations
├── docker/            # Docker Compose (dev + prod)
├── platform/          # Deployment configs (AWS, GCP, Railway)
└── docs/              # Deployment guide, env var reference
```

## Key Patterns

### Multi-Tenancy
- All database queries MUST be tenant-scoped
- Row-level security enforced at Postgres level
- Never bypass RLS in application code

### Security
- All API routes check authentication
- All server actions verify user + tenant membership
- Audit log sensitive operations
- CSP, HSTS, rate limiting, JWT verification in middleware

### npm Scope
- Shared types: `@sovra/shared`
- Web package: `@sovra/web`
- Go module: `github.com/byteworthy/sovra-worker`

## Quality Gates

Before opening a PR or claiming work complete:

```bash
pnpm test                               # Vitest — all tests must pass
pnpm lint                               # Zero errors, zero warnings
pnpm type-check                         # TypeScript clean
pnpm build                              # Production build succeeds
cd packages/worker && go test ./...     # Go tests pass
```

## Commit Convention

```
type(scope): message
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`, `build`, `style`, `revert`.

One logical change per commit. Never commit `.env*`, credentials, or generated artifacts.

## Contributing

- `CONTRIBUTING.md` — contribution workflow and review expectations
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1
- `SECURITY.md` — vulnerability disclosure process
- `SUPPORT.md` — community support and commercial options
- GitHub Discussions is the primary venue for questions and design chat

---

Maintained by [ByteWorthy](https://byteworthy.io).
