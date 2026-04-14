# Research Summary - Sovra

**Synthesized:** 2026-04-11

## Key Findings

### Stack Summary

**Frontend:** Next.js 15 + TypeScript + Tailwind + shadcn/ui + Zustand + React Query + Vercel AI SDK + MCP SDK

**Backend:** Go 1.22 + Gin + gRPC + Goroutines + SSE/WebSockets

**Data:** Supabase PostgreSQL 15 + pgvector + Redis + Supabase Storage

**Deployment:** Vercel + Railway/Cloud Run/AWS ECS + Cloudflare

### Table Stakes

Essential features expected in any AI SaaS:
1. Multi-tenant isolation with RLS
2. User authentication (email, OAuth, magic links)
3. Agent CRUD with model configuration
4. Real-time chat with streaming
5. Conversation history persistence
6. Vector storage and semantic search
7. API keys with rate limiting

### Differentiators

What makes Sovra unique:
1. Full MCP client/server implementation
2. Multi-agent workspaces with real-time collaboration
3. Built-in tool ecosystem (file ops, web search, code execution)
4. Multiple memory strategies (conversation, summary, vector, hybrid)
5. Self-hosted all-in-one Docker deployment
6. Multi-cloud deploy (Railway, AWS, GCP)

### Architecture Highlights

- **AsyncGenerator agent loop** for streaming with backpressure
- **Speculative tool execution** during model response
- **4-layer context compression** to manage context windows
- **Fork agents** for prompt cache sharing (~95% token savings)

## Watch Out For

### High Priority

1. **Multi-tenant RLS complexity** - Test thoroughly, use service role sparingly
2. **Tool execution security** - Sandbox tools, enforce timeouts, track costs
3. **Deployment underestimation** - Docker from day one, validate env vars

### Medium Priority

4. **Streaming latency** - Use speculative execution
5. **Memory management** - Implement compression early
6. **MCP protocol changes** - Pin versions, monitor updates
7. **Real-time state sync** - Use established Socket.IO patterns

### Security Musts

- Never expose API keys client-side
- Minimize service role usage
- Implement rate limiting from day one
- Complete audit logging for compliance

## Files Created

- `.planning/research/STACK.md` - Technology decisions
- `.planning/research/FEATURES.md` - Feature categories
- `.planning/research/ARCHITECTURE.md` - System design
- `.planning/research/PITFALLS.md` - Common mistakes
- `.planning/research/SUMMARY.md` - This file

---
*Synthesizer: gsd-research-synthesizer*
*Output: .planning/research/SUMMARY.md*