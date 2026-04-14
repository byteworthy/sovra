# Architecture Research - Sovra

**Research Type:** Project Research - Architecture dimension
**Date:** 2026-04-11

## Component Boundaries

### Client Layer (Next.js)
- User-facing React application
- Authentication UI and flows
- Chat interface components
- Admin dashboard
- Real-time connection to worker

### API Layer (Next.js API Routes)
- REST endpoints for CRUD operations
- Authentication via NextAuth.js
- Rate limiting via Redis
- Tenant context injection
- Lightweight operations only

### Worker Layer (Go)
- Long-running AI agent processes
- MCP tool execution
- Vector search operations
- Memory management
- Streaming responses via SSE/WebSocket

### Data Layer (Supabase)
- PostgreSQL for structured data
- pgvector for embeddings
- Row Level Security policies
- Real-time subscriptions
- File storage

### External Services
- OpenAI / Anthropic / Google AI APIs
- Stripe / Lemon Squeezy for billing
- Optional: Sentry, PostHog

## Data Flow

```
User Action (React)
    ↓
Next.js API Route (auth check, tenant isolation)
    ↓
Go Worker (async via gRPC or HTTP)
    ↓
LLM API (OpenAI/Anthropic)
    ↓
Tool Execution (MCP)
    ↓
Database (Supabase/Redis)
    ↓
Real-time Update (Socket.IO)
    ↓
User Sees Response
```

## Build Order (Dependencies)

### Phase 1: Foundation
1. Project scaffolding (monorepo structure)
2. Database schema (all tables + pgvector)
3. Docker Compose local dev

### Phase 2: Core Infrastructure
4. Authentication system
5. Multi-tenancy with RLS
6. Basic API layer

### Phase 3: Agent Core
7. Agent CRUD + model configuration
8. Chat interface with streaming
9. Conversation history

### Phase 4: AI Features
10. MCP client implementation
11. Built-in tools registry
12. Vector storage + search

### Phase 5: Multi-Agent
13. Workspace system
14. Real-time collaboration
15. Memory strategies

### Phase 6: Production Ready
16. Billing integration
17. Admin dashboard
18. Multi-cloud deployment configs

## Architecture Patterns

### AsyncGenerator Agent Loop
- Streams responses as they're generated
- Natural backpressure and cancellation
- Used in Go worker for LLM interaction

### Speculative Tool Execution
- Start read-only tools during model streaming
- Execute before response completes
- Reduces perceived latency

### Concurrent-Safe Batching
- Partition tools by safety (read vs write)
- Read tools run in parallel
- Writes serialized

### Fork Agents for Cache Sharing
- Parallel sub-agents share byte-identical prompt prefixes
- Saves ~95% input tokens
- Used in multi-agent workspaces

### 4-Layer Context Compression
- snip: Truncate oldest messages
- microcompact: Summarize conversation
- collapse: Merge similar messages
- autocompact: Automatic when near limit

---
*Researcher: gsd-project-researcher*
*Output: .planning/research/ARCHITECTURE.md*