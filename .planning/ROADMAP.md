# Roadmap: ByteSwarm

**Created:** 2026-04-11
**Phases:** 6
**Requirements:** 77

## Roadmap Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation | Project scaffold + database + Docker setup | FOUN-01 to FOUN-05, DB-01 to DB-05 | 9 |
| 2 | Core Infrastructure | Auth + multi-tenancy + RBAC + basic API | AUTH-01 to AUTH-06, TEN-01 to TEN-04, RBAC-01 to RBAC-04 | 13 |
| 3 | Agent Core | Agent CRUD + chat UI + streaming | AGNT-01 to AGNT-05, CHAT-01 to CHAT-05 | 10 |
| 4 | AI Features | MCP + tools + vector storage | MCP-01 to MCP-08, VECT-01 to VECT-05 | 13 |
| 5 | Multi-Agent | Workspaces + collaboration + memory | MUL-01 to MUL-06, MEM-01 to MEM-05, REAL-01 to REAL-05 | 16 |
| 6 | Production Ready | Billing + admin + deployment + monitoring | BILL-01 to BILL-05, ADMIN-01 to ADMIN-05, APIK-01 to APIK-05, DEPL-01 to DEPL-05, MON-01 to MON-04 | 19 |

## Phase Details

---

### Phase 1: Foundation

**Goal:** Set up project structure, database, and local development environment

**Plans:** 4 plans

Plans:
- [x] 01-01-PLAN.md - Fix scaffold extensions + monorepo setup (shared package, Makefile, env)
- [x] 01-02-PLAN.md - Go worker service (Gin health, gRPC stub, pgxpool, Docker)
- [x] 01-03-PLAN.md - Supabase schema + migrations (14 tables, RLS, pgvector, indexes)
- [x] 01-04-PLAN.md - Docker Compose (dev + prod) + Vitest testing setup + quality gate

**Requirements:**
- FOUN-01: Monorepo structure with pnpm workspaces
- FOUN-02: Next.js 15 with App Router, TypeScript, Tailwind
- FOUN-03: Go 1.22+ worker service with Gin + gRPC
- FOUN-04: Docker Compose all-in-one for local development
- FOUN-05: Docker Compose for production
- DB-01: Supabase PostgreSQL 15 setup
- DB-02: pgvector extension enabled
- DB-03: All tables created
- DB-04: RLS policies for tenant isolation
- DB-05: Database indexes

**Success Criteria:**
1. `npm run dev` starts Next.js with hot reload
2. `docker-compose up` starts all services locally
3. Go worker compiles and connects to database
4. All database tables exist with correct schema
5. RLS policies prevent cross-tenant queries
6. Project builds without errors
7. Tests run and pass
8. TypeScript compiles without errors
9. Linting passes

**Dependencies:** None (Phase 1)

---

### Phase 2: Core Infrastructure

**Goal:** Implement authentication, multi-tenancy, and RBAC

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md - Auth types + AuthAdapter interface + Supabase adapter + client/server factories + PKCE callback
- [x] 02-02-PLAN.md - RBAC migration (roles, permissions, invitations) + TenantResolver implementations + TenantContext
- [x] 02-03-PLAN.md - RBAC permission checker + root middleware + tenant creation + invitation system
- [x] 02-04-PLAN.md - Schema push + motion utilities + UI primitives + auth pages (split-screen, glass morphism, all states)
- [x] 02-05-PLAN.md - Tenant layout + sidebar + tenant switcher + member management + onboarding wizard + toasts

**Requirements:**
- AUTH-01: Email/password signup and login
- AUTH-02: Magic link authentication
- AUTH-03: OAuth providers (Google, GitHub)
- AUTH-04: Session management with JWT
- AUTH-05: Password reset flow
- AUTH-06: Email verification
- TEN-01: Tenant creation and management
- TEN-02: Tenant-level RLS policies
- TEN-03: Tenant context in all queries
- TEN-04: Subdomain-based tenant identification
- RBAC-01: Role definitions
- RBAC-02: Permission system
- RBAC-03: Role-based route protection
- RBAC-04: Tenant user invitation system

**Success Criteria:**
1. User can sign up with email/password
2. User can log in with Google OAuth
3. User can create a new tenant
4. Tenant context is enforced in all queries
5. RLS prevents user A from seeing tenant B's data
6. Owner can invite users to tenant
7. Roles correctly restrict access (viewer can't delete agents)
8. Sessions persist across browser refresh

**Dependencies:** Phase 1

---

### Phase 3: Agent Core

**Goal:** Build agent management and chat interface

**Requirements:**
- AGNT-01: Agent CRUD operations
- AGNT-02: Model configuration (provider, name, temperature, max_tokens)
- AGNT-03: Agent tools assignment
- AGNT-04: System prompt configuration
- AGNT-05: Agent status tracking
- CHAT-01: Real-time chat UI
- CHAT-02: Streaming responses via Vercel AI SDK
- CHAT-03: Message history persistence
- CHAT-04: Conversation creation and management
- CHAT-05: Chat input with file/code support

**Success Criteria:**
1. User can create an agent with custom model config
2. User can edit and delete agents
3. Chat interface displays messages in real-time
4. Responses stream as they're generated
5. Conversation history persists and loads
6. User can create new conversations
7. User can delete conversations
8. Model temperature affects response creativity
9. Tools can be assigned to agents

**Dependencies:** Phase 2

---

### Phase 4: AI Features

**Goal:** Implement MCP integration, built-in tools, and vector storage

**Requirements:**
- MCP-01: MCP Client in Next.js
- MCP-02: MCP Server in Go worker
- MCP-03: Tool registry system
- MCP-04: Built-in file tools (read/write/list)
- MCP-05: Built-in web tools (search/fetch)
- MCP-06: Built-in database tools (query/semantic search)
- MCP-07: Tool execution timeout and error handling
- MCP-08: Tool usage cost tracking
- VECT-01: Document embedding storage
- VECT-02: Semantic search with pgvector
- VECT-03: Hybrid search (keyword + semantic)
- VECT-04: Vector index configuration
- VECT-05: Tenant-scoped vector queries

**Success Criteria:**
1. MCP server starts and exposes tools
2. MCP client connects and discovers tools
3. Agent can execute file read tool
4. Agent can execute web search tool
5. Documents can be embedded and stored
6. Semantic search returns relevant results
7. Vector queries are tenant-scoped
8. Tool execution times out after 30 seconds
9. Tool usage is tracked with costs

**Dependencies:** Phase 3

---

### Phase 5: Multi-Agent

**Goal:** Build workspace collaboration and advanced memory

**Requirements:**
- MUL-01: Workspace creation and management
- MUL-02: Agent collaboration modes
- MUL-03: Shared memory between agents
- MUL-04: Real-time agent status updates
- MUL-05: Agent-to-agent messaging
- MUL-06: Conflict resolution
- MEM-01: Conversation memory (full history)
- MEM-02: Summary memory (condensed)
- MEM-03: Vector memory (semantic retrieval)
- MEM-04: Hybrid memory (combined)
- MEM-05: Context compression
- REAL-01: Socket.IO server setup
- REAL-02: Workspace room management
- REAL-03: Agent status broadcasting
- REAL-04: Message streaming
- REAL-05: Reconnection handling

**Success Criteria:**
1. User can create workspaces with multiple agents
2. Agents can collaborate in round_robin mode
3. Agents share memory within workspace
4. Agent status updates in real-time
5. Agents can send messages to each other
6. Conflicts are resolved via voting
7. Vector memory retrieves relevant past context
8. Context compression prevents token overflow
9. WebSocket reconnects after disconnect

**Dependencies:** Phase 4

---

### Phase 6: Production Ready

**Goal:** Add billing, admin, deployment configs, and monitoring

**Requirements:**
- BILL-01: Subscription management (Lemon Squeezy)
- BILL-02: Plan definitions (free, pro, enterprise)
- BILL-03: Usage tracking
- BILL-04: Customer portal access
- BILL-05: Webhook handling
- ADMIN-01: Admin dashboard UI
- ADMIN-02: Tenant management (CRUD)
- ADMIN-03: User management
- ADMIN-04: System analytics overview
- ADMIN-05: Audit logs viewer
- APIK-01: API key creation
- APIK-02: API key authentication
- APIK-03: Rate limiting per key
- APIK-04: API key usage tracking
- APIK-05: API key expiration
- DEPL-01: Railway deployment config
- DEPL-02: AWS deployment config
- DEPL-03: GCP deployment config
- DEPL-04: GitHub Actions CI/CD
- DEPL-05: Environment documentation
- MON-01: Sentry integration
- MON-02: PostHog integration
- MON-03: Health check endpoints
- MON-04: Custom metrics

**Success Criteria:**
1. Users can subscribe via Lemon Squeezy
2. Usage limits enforced per plan
3. Admin can view all tenants
4. Admin can manage users
5. API keys work for programmatic access
6. Rate limiting prevents abuse
7. Deploys successfully to Railway
8. Deploys successfully to AWS
9. Deploys successfully to GCP
10. CI/CD runs tests on push
11. Errors tracked in Sentry
12. Analytics visible in PostHog

**Dependencies:** Phase 5

---

## Notes

- Phase 1 is most critical - foundation determines everything else
- Phase 2 (auth/multi-tenancy) must be rock-solid - security implications
- Phase 3-4 build the core AI functionality
- Phase 5 adds multi-agent which differentiates ByteSwarm
- Phase 6 makes it production-ready for self-hosted deployment

---
*Roadmap created: 2026-04-11*
*Last updated: 2026-04-12 after Phase 2 planning*
