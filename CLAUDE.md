# Sovra - Claude Code Instructions

This file provides project-specific guidance for Claude Code when working on Sovra.

## Project Overview

**Sovra** is an open-source AI-native SaaS boilerplate for building multi-tenant AI applications with MCP, vector database, and multi-agent collaboration.

## Quick Start

```bash
# Local development
docker-compose up

# Build and test
npm run build
go build ./...

# View project state
/gsd-progress
```

## Directory Structure

```
sovra/
├── packages/
│   ├── web/           # Next.js frontend + API
│   ├── worker/       # Go agent worker service
│   └── shared/       # Shared types and schemas
├── supabase/
│   └── migrations/    # Database migrations
├── docker/           # Docker configs
├── platform/         # Per-platform deployment
└── .planning/        # GSD planning artifacts
```

## Key Commands

| Command | Description |
|---------|-------------|
| `/gsd-progress` | Show project status |
| `/gsd-discuss-phase 1` | Start Phase 1 discussion |
| `/gsd-plan-phase 1` | Plan Phase 1 |
| `/gsd-execute-phase 1` | Execute Phase 1 |

## Phase Roadmap

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | Pending |
| 2 | Core Infrastructure | Pending |
| 3 | Agent Core | Pending |
| 4 | AI Features | Pending |
| 5 | Multi-Agent | Pending |
| 6 | Production Ready | Pending |

## Important Patterns

### From Claude Code from Source

1. **AsyncGenerator agent loop** - Streams responses naturally
2. **Speculative tool execution** - Start read-only tools during streaming
3. **4-layer context compression** - snip → microcompact → collapse → autocompact
4. **Fork agents** - Cache sharing saves ~95% tokens

### Multi-Tenancy

- Always use tenant-scoped queries
- Test RLS policies with multiple tenants
- Never bypass RLS in application code

### Security Requirements

- 🔒 Extremely hardened - no shortcuts
- All API routes must check authentication
- All database queries must be tenant-scoped
- Audit log all sensitive operations

## Reading Before Work

Always read before making changes:
- `.planning/PROJECT.md` - Current project context
- `.planning/REQUIREMENTS.md` - v1 requirements
- `.planning/ROADMAP.md` - Current phase details

## Quality Gates

Before claiming any work complete:

1. **Test** - Tests pass
2. **Lint** - ESLint/ruff clean
3. **Type Check** - TypeScript/Go compilation clean
4. **Security** - NoSecrets check
5. **Build** - Production build succeeds

## Shipping

After every coding task:
```bash
npm run test && npm run lint && npm run type-check
go build ./... && go test ./...
git add -A && git commit -m "type(scope): message"
git push
```

---

*This file maintained by GSD workflow*