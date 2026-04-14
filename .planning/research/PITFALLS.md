# Pitfalls Research - Sovra

**Research Type:** Project Research - Pitfalls dimension
**Date:** 2026-04-11

## Common Mistakes and How to Avoid Them

### 1. Multi-Tenant RLS Complexity

**Warning Signs:**
- Queries returning wrong tenant data
- Permissions seem correct but data leaks
- RLS policies not being applied

**Prevention:**
- Test every query with multiple tenant contexts
- Use service role only where absolutely necessary
- Add RLS test suite to CI

**Phase to Address:** Phase 1-2 (Foundation + Core Infrastructure)

### 2. Tool Execution Security

**Warning Signs:**
- Tools executing with excessive permissions
- No timeout on long-running tools
- Cost tracking inaccurate

**Prevention:**
- Sandboxed tool execution environments
- Strict timeout limits (30s default)
- Per-tool cost tracking with budget enforcement

**Phase to Address:** Phase 4 (AI Features)

### 3. Memory Strategy Mismanagement

**Warning Signs:**
- Conversation history grows unbounded
- Vector search returns irrelevant results
- Memory not clearing between sessions

**Prevention:**
- Implement 4-layer compression early
- Set vector similarity thresholds
- Add memory cleanup for inactive conversations

**Phase to Address:** Phase 5 (Multi-Agent)

### 4. Streaming Response Latency

**Warning Signs:**
- Chat feels slow despite streaming
- First token takes too long
- Tool execution blocks streaming

**Prevention:**
- Use speculative tool execution
- Stream tool results as they complete
- Optimize database queries for streaming

**Phase to Address:** Phase 3 (Agent Core)

### 5. Deployment Complexity Underestimation

**Warning Signs:**
- Works locally, fails in production
- Environment variables inconsistent
- Database migrations fail on deploy

**Prevention:**
- Docker Compose from day one
- Environment variable validation
- Automated migration testing in CI

**Phase to Address:** Phase 6 (Production Ready)

### 6. Multi-Cloud Abstraction Gaps

**Warning Signs:**
- Cloud-specific code scattered throughout
- Can't easily switch providers
- Feature works on one cloud, fails on another

**Prevention:**
- Abstract cloud-specific operations
- Use containerization for worker service
- Test on multiple platforms early

**Phase to Address:** Phase 6 (Production Ready)

### 7. MCP Protocol Evolution

**Warning Signs:**
- Tool schema incompatible with latest MCP
- Server/client version mismatch
- Features work with one MCP server but not another

**Prevention:**
- Pin MCP SDK versions
- Test against multiple MCP servers
- Monitor MCP protocol announcements

**Phase to Address:** Phase 4 (AI Features)

### 8. Real-time State Synchronization

**Warning Signs:**
- Multiple agents show inconsistent state
- Messages appear out of order
- Workspace events don't propagate

**Prevention:**
- Use established Socket.IO patterns
- Implement optimistic updates
- Add reconnection handling

**Phase to Address:** Phase 5 (Multi-Agent)

## Critical Security Pitfalls

| Pitfall | Impact | Prevention |
|---------|--------|------------|
| API key exposure | Full account compromise | Strict .env handling, server-side only |
| RLS bypass via service role | Data breach | Minimize service role usage |
| No rate limiting | Resource exhaustion | Redis-based rate limiting from day one |
| Missing audit logs | Compliance failure | Log all tenant-scoped actions |

## Phase Mapping

- Phase 1-2: Foundation + Core → RLS testing, deployment basics
- Phase 3: Agent Core → Streaming optimization
- Phase 4: AI Features → MCP security, tool sandboxing
- Phase 5: Multi-Agent → State sync, memory management
- Phase 6: Production → Multi-cloud, full security audit

---
*Researcher: gsd-project-researcher*
*Output: .planning/research/PITFALLS.md*