# AgentForge

## What This Is

AgentForge is a production-ready, open-source AI-native SaaS boilerplate for building multi-tenant AI applications with native Model Context Protocol (MCP) integration, vector database support, and real-time multi-agent collaboration capabilities. Target users are AI product builders, startup founders, and enterprise developers.

## Core Value

**Zero-to-Production AI Apps in Hours** — Not weeks. Pre-configured with all AI essentials: MCP-native tool ecosystem, pgvector for semantic search, multi-tenant isolation, and real-time multi-agent workspaces. Self-hosted with deploy-anywhere flexibility (Railway, AWS, GCP).

## Requirements

### Active

- [ ] Next.js 15 App Router foundation with TypeScript, Tailwind, shadcn/ui
- [ ] Go 1.22+ worker service with Gin + gRPC for agent processing
- [ ] Supabase PostgreSQL with pgvector extension for vector storage
- [ ] Multi-tenant architecture with Row Level Security (RLS) isolation
- [ ] Authentication via NextAuth.js (email/password, OAuth, magic links)
- [ ] MCP Client/Server implementation with tool registry
- [ ] Built-in tools: file_ops, web_search, query_database, execute_code, send_email
- [ ] Streaming responses via Vercel AI SDK and SSE
- [ ] Workspace system for multi-agent collaboration
- [ ] Agent memory: conversation, summary, vector, and hybrid strategies
- [ ] Real-time collaboration via Socket.IO
- [ ] RBAC with roles: owner, admin, member, viewer
- [ ] Billing via Lemon Squeezy or Stripe
- [ ] Admin dashboard with tenant/user management
- [ ] Docker Compose all-in-one for local/self-hosted deployment
- [ ] Multi-cloud deployment configs (Railway, AWS, GCP)
- [ ] API keys with tenant-scoped permissions
- [ ] Audit logging for compliance

### Out of Scope

- [Managed cloud service] — Self-hosted only, no SaaS offering
- [Pre-trained models] — Bring your own API keys (OpenAI, Anthropic, Google)
- [Mobile app] — Web-first, React Native/Expo at a later phase

## Context

**Source Specification:** AgentFlow-Specification-Complete.md (comprehensive 1614-line technical spec)

**Architecture Overview:**
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Zustand + React Query + Vercel AI SDK + MCP TypeScript SDK
- Backend Worker: Go 1.22+ with Gin + gRPC + Goroutines + SSE/WebSockets + ONNX Runtime
- Database: Supabase PostgreSQL 15 + pgvector + Redis (Upstash-compatible) + Supabase Storage
- Infrastructure: Vercel (Next.js) + Railway/Cloud Run/AWS (Go worker) + Cloudflare CDN + Sentry + PostHog

**Key Patterns from Claude Code from Source:**
- AsyncGenerator agent loop for streaming
- Speculative tool execution during model streaming
- Concurrent-safe batching partitioned by safety class
- Fork agents for prompt cache sharing
- 4-layer context compression (snip, microcompact, collapse, autocompact)
- File-based memory with LLM recall

## Constraints

- **Security**: Extremely hardened and secure — no shortcuts on auth, RLS, encryption, audit trails
- **Self-Hosted**: Must work without external SaaS dependencies beyond API keys
- **Multi-Platform Deploy**: Railway, AWS, GCP equally supported from start
- **All-in-One Docker**: Single docker-compose up for immediate use

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Go hybrid | Max DX with production power — Next.js for web/API, Go for long-running agent tasks | — Pending |
| Supabase + pgvector | Built-in vector storage, no separate vector DB required | — Pending |
| MCP-native | Full client/server implementation for extensible tool ecosystem | — Pending |
| Multi-cloud deploy | No vendor lock-in, user choice | — Pending |
| MIT License | True open source for community | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-11 after initialization*