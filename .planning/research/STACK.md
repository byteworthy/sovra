# Stack Research - Sovra

**Research Type:** Project Research - Stack dimension
**Date:** 2026-04-11

## Technology Stack

### Frontend & API Layer

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Framework | Next.js | 15 (App Router) | Industry standard for AI SaaS, excellent DX |
| Language | TypeScript | 5.5+ | Type safety for complex AI integrations |
| Styling | Tailwind CSS | 3.4 | Utility-first, highly customizable |
| UI Components | shadcn/ui | latest | MIT licensed, accessible, customizable |
| State Management | Zustand | latest | Simple, performant, TypeScript-first |
| Data Fetching | React Query | latest | Caching, optimistic updates |
| Real-time | Socket.IO client | latest | Multi-agent collaboration |
| AI SDK | Vercel AI SDK | 3.0 | Streaming, tool calling, provider abstraction |
| MCP | @modelcontextprotocol/sdk | latest | Official TypeScript SDK for MCP |

### Backend Worker Service

| Component | Technology | Version | Rationale |
|-----------|------------|---------|-----------|
| Language | Go | 1.22+ | Performance for long-running AI tasks |
| Web Framework | Gin | latest | Fast, lightweight, battle-tested |
| RPC | gRPC | latest | Efficient service communication |
| Concurrency | Goroutines | native | Native Go concurrency model |
| Streaming | SSE + WebSockets | native | Real-time agent responses |
| MCP (Go) | go-mcp-sdk | latest | MCP protocol implementation |
| ML | ONNX Runtime | latest | Local model inference |

### Database & Storage

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Primary DB | Supabase PostgreSQL 15 | Built-in auth, real-time, excellent DX |
| Vector DB | pgvector | Built-in to Supabase, no separate service |
| Cache | Redis 7 (Upstash) | Sessions, rate limiting, caching |
| File Storage | Supabase Storage | S3-compatible, simple integration |
| Search | Typesense (optional) | Advanced full-text search |

### Infrastructure & Deployment

| Platform | Service | Use Case |
|----------|---------|----------|
| Frontend | Vercel | Next.js deployment |
| Worker | Railway / Cloud Run / AWS ECS | Go service deployment |
| CDN | Cloudflare | Global edge caching |
| Monitoring | Sentry | Error tracking |
| Analytics | PostHog | Product analytics (open source) |
| CI/CD | GitHub Actions | Automated testing/deployment |

### AI & ML Stack

| Component | Technology |
|-----------|------------|
| LLM Providers | OpenAI, Anthropic, Google, local models |
| Orchestration | LangChain.js (lightweight), custom for complex |
| Embeddings | text-embedding-3-large, multilingual-e5-large |
| Vector Dimensions | 1536 (OpenAI default) |

## What NOT to Use and Why

| Avoid | Reason |
|-------|--------|
| Closed-source boilerplates | Sovra is fully open source |
| Pinecone / Weaviate | pgvector is sufficient and built-in |
| Firebase | Want SQL + pgvector, not NoSQL |
| AWS Lambda for worker | Long-running agent tasks need persistent processes |
| Prisma | Direct SQL for performance-critical operations |
| Redux | Zustand is simpler and sufficient |

## Confidence Levels

| Component | Confidence | Notes |
|-----------|------------|-------|
| Next.js + Go hybrid | High | Proven pattern in production AI apps |
| pgvector | High | Stable extension, excellent Supabase support |
| MCP protocol | Medium | Evolving standard, but solid implementation |
| Multi-cloud deploy | Medium | Requires careful abstraction |

---
*Researcher: gsd-project-researcher*
*Output: .planning/research/STACK.md*