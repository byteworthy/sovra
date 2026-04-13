# Requirements: ByteSwarm

**Defined:** 2026-04-11
**Core Value:** Zero-to-Production AI Apps in Hours - Pre-configured with MCP, vector DB, multi-tenant, and multi-agent collaboration. Self-hosted with multi-cloud deploy.

## v1 Requirements

### Foundation (FOUN)

- [ ] **FOUN-01**: Monorepo structure with pnpm workspaces (web, worker, shared packages)
- [ ] **FOUN-02**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- [ ] **FOUN-03**: Go 1.22+ worker service with Gin + gRPC structure
- [ ] **FOUN-04**: Docker Compose all-in-one for local development
- [ ] **FOUN-05**: Docker Compose for production (expects external services)

### Database (DB)

- [ ] **DB-01**: Supabase PostgreSQL 15 setup
- [ ] **DB-02**: pgvector extension enabled for vector storage
- [ ] **DB-03**: All tables created (tenants, users, tenant_users, agents, workspaces, conversations, messages, shared_memory, vector_documents, subscriptions, tool_executions, audit_logs, api_keys, feature_flags)
- [ ] **DB-04**: Row Level Security (RLS) policies for tenant isolation
- [ ] **DB-05**: Database indexes for performance

### Authentication (AUTH)

- [ ] **AUTH-01**: Email/password signup and login
- [ ] **AUTH-02**: Magic link authentication
- [ ] **AUTH-03**: OAuth providers (Google, GitHub)
- [ ] **AUTH-04**: Session management with JWT
- [ ] **AUTH-05**: Password reset flow
- [ ] **AUTH-06**: Email verification

### Multi-Tenancy (TEN)

- [ ] **TEN-01**: Tenant creation and management
- [ ] **TEN-02**: Tenant-level RLS policies
- [ ] **TEN-03**: Tenant context in all queries
- [ ] **TEN-04**: Subdomain-based tenant identification

### RBAC (RBAC)

- [ ] **RBAC-01**: Role definitions (owner, admin, member, viewer)
- [ ] **RBAC-02**: Permission system (agent:create, agent:read, etc.)
- [ ] **RBAC-03**: Role-based route protection
- [ ] **RBAC-04**: Tenant user invitation system

### Agent Core (AGNT)

- [ ] **AGNT-01**: Agent CRUD operations
- [ ] **AGNT-02**: Model configuration (provider, name, temperature, max_tokens)
- [ ] **AGNT-03**: Agent tools assignment
- [ ] **AGNT-04**: System prompt configuration
- [ ] **AGNT-05**: Agent status tracking (idle, running, error)

### Chat Interface (CHAT)

- [ ] **CHAT-01**: Real-time chat UI with message display
- [ ] **CHAT-02**: Streaming responses via Vercel AI SDK
- [ ] **CHAT-03**: Message history persistence
- [ ] **CHAT-04**: Conversation creation and management
- [ ] **CHAT-05**: Chat input with file/code support

### MCP Integration (MCP)

- [ ] **MCP-01**: MCP Client in Next.js for tool discovery
- [ ] **MCP-02**: MCP Server in Go worker for tool execution
- [ ] **MCP-03**: Tool registry system
- [ ] **MCP-04**: Built-in tools: file read/write, directory list
- [ ] **MCP-05**: Built-in tools: web search, URL fetch
- [ ] **MCP-06**: Built-in tools: database query, semantic search
- [ ] **MCP-07**: Tool execution timeout and error handling
- [ ] **MCP-08**: Tool usage cost tracking

### Vector Storage (VECT)

- [ ] **VECT-01**: Document embedding storage
- [ ] **VECT-02**: Semantic search with pgvector
- [ ] **VECT-03**: Hybrid search (keyword + semantic)
- [ ] **VECT-04**: Vector index configuration
- [ ] **VECT-05**: Tenant-scoped vector queries

### Memory Strategies (MEM)

- [ ] **MEM-01**: Conversation memory (full history)
- [ ] **MEM-02**: Summary memory (condensed)
- [ ] **MEM-03**: Vector memory (semantic retrieval)
- [ ] **MEM-04**: Hybrid memory (combined approach)
- [ ] **MEM-05**: Context compression (snip, microcompact, collapse)

### Multi-Agent (MUL)

- [ ] **MUL-01**: Workspace creation and management
- [ ] **MUL-02**: Agent collaboration modes (round_robin, hierarchical, democratic, parallel)
- [ ] **MUL-03**: Shared memory between agents
- [ ] **MUL-04**: Real-time agent status updates
- [ ] **MUL-05**: Agent-to-agent messaging
- [ ] **MUL-06**: Conflict resolution (vote, hierarchy, consensus)

### Real-Time (REAL)

- [ ] **REAL-01**: Socket.IO server setup
- [ ] **REAL-02**: Workspace room management
- [ ] **REAL-03**: Agent status broadcasting
- [ ] **REAL-04**: Message streaming
- [ ] **REAL-05**: Reconnection handling

### Billing (BILL)

- [ ] **BILL-01**: Subscription management (Stripe integration)
- [ ] **BILL-02**: Plan definitions (free, pro, enterprise)
- [ ] **BILL-03**: Usage tracking (API calls, storage, agents)
- [ ] **BILL-04**: Customer portal access
- [ ] **BILL-05**: Webhook handling for subscription events

### Admin (ADMIN)

- [ ] **ADMIN-01**: Admin dashboard UI
- [ ] **ADMIN-02**: Tenant management (CRUD)
- [ ] **ADMIN-03**: User management
- [ ] **ADMIN-04**: System analytics overview
- [ ] **ADMIN-05**: Audit logs viewer

### API Keys (APIK)

- [ ] **APIK-01**: API key creation with permissions
- [ ] **APIK-02**: API key authentication
- [ ] **APIK-03**: Rate limiting per key
- [ ] **APIK-04**: API key usage tracking
- [ ] **APIK-05**: API key expiration

### Deployment (DEPL)

- [ ] **DEPL-01**: Railway deployment configuration
- [ ] **DEPL-02**: AWS ECS/Cloud Run deployment configuration
- [ ] **DEPL-03**: GCP Cloud Run deployment configuration
- [ ] **DEPL-04**: GitHub Actions CI/CD workflow
- [ ] **DEPL-05**: Environment variable documentation

### Monitoring (MON)

- [ ] **MON-01**: Sentry error tracking integration
- [ ] **MON-02**: PostHog analytics integration
- [ ] **MON-03**: Health check endpoints
- [ ] **MON-04**: Custom metrics (agent execution, tool usage)

## v2 Requirements

### Advanced Features

- **ADV-01**: Custom MCP server creation UI
- **ADV-02**: Advanced analytics dashboard
- **ADV-03**: Team invitation with approval workflow
- **ADV-04**: Audit log export
- **ADV-05**: Webhook integrations for events

## Out of Scope

| Feature | Reason |
|---------|--------|
| SaaS hosting | Self-hosted only, community project |
| Pre-configured paid LLM APIs | Users provide own API keys |
| Mobile app (native) | Web-first, later consideration |
| Real-time video/voice | Out of boilerplate scope |
| Built-in LLM fine-tuning | Use external services |

## Traceability

All requirements mapped to phases. See ROADMAP.md for phase-to-requirement mapping.

**Coverage:**
- v1 requirements: 77 total
- Mapped to phases: 77
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-11 after initial definition*