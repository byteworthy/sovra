---
phase: 04-ai-features
verified: 2026-04-12T02:15:00Z
status: human_needed
score: 9/9 must-haves verified
human_verification:
  - test: "Start Docker Compose (docker compose -f docker/compose.dev.yaml up worker) and send a POST to http://localhost:3001/mcp with an MCP initialize handshake body. Verify the server responds with an MCP InitializeResult JSON payload."
    expected: "HTTP 200 with JSON body containing protocolVersion, capabilities, and serverInfo fields."
    why_human: "MCP protocol handshake requires a running Go process. The test verifies the Streamable HTTP transport handles the full MCP initialization sequence, which cannot be simulated without starting the server."
  - test: "Use the chat UI with an agent that has semantic_search in its tools list. Send a message that would trigger a database search. Check the tool_executions table in Supabase (SELECT * FROM tool_executions ORDER BY created_at DESC LIMIT 5) after the conversation."
    expected: "Rows inserted in tool_executions with tool_name='semantic_search', non-null tenant_id, status='success' or 'error', and a cost_usd value."
    why_human: "End-to-end tool execution tracking requires a running system with MCP server, Next.js, and Supabase all connected. The unit tests mock these boundaries."
  - test: "Call POST /api/documents/embed with a valid JWT and body {\"content\": \"test document for semantic search\"}, then call POST /api/documents/search with {\"query\": \"test document\", \"mode\": \"hybrid\"}."
    expected: "Embed returns 201 with an id. Search returns 200 with results array containing the embedded document ranked by similarity."
    why_human: "Requires a running Supabase instance with the 20260412100000_vector_fts.sql migration applied and a valid OpenAI API key. The RPC functions (match_documents, hybrid_search_documents) need to be confirmed present in the live database."
---

# Phase 4: AI Features Verification Report

**Phase Goal:** Implement MCP integration, built-in tools, and vector storage
**Verified:** 2026-04-12T02:15:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | MCP server starts and exposes tools | VERIFIED | `handler.go` StartMCPServer binds port 3001; `server.go` registers 6 tools via RegisterFileTools/RegisterWebTools/RegisterDatabaseTools; `main.go` line 42 `go mcpserver.StartMCPServer`; Go build clean; 8 server tests pass |
| 2 | MCP client connects and discovers tools | VERIFIED | `client.ts` getMcpClient() creates StreamableHTTPClientTransport to WORKER_MCP_URL; `tool-registry.ts` buildAiToolsFromMcp() calls client.listTools(); 13 client+registry tests pass |
| 3 | Agent can execute file read tool | VERIFIED | `tools/file.go` RegisterFileTools registers file_read with filepath.Clean + strings.HasPrefix sandbox; path traversal rejected; 6 file tool tests pass including TestFileRead_ReturnsContent and TestFileRead_RejectsPathTraversal |
| 4 | Agent can execute web search tool | VERIFIED | `tools/web.go` RegisterWebTools registers web_search calling Brave Search API; returns error when key missing; TestWebSearch_ReturnsParsedResults and TestWebFetch_BlocksPrivateIPs (4 subtests) pass |
| 5 | Documents can be embedded and stored | VERIFIED | `embed.ts` embedText() uses text-embedding-3-small; `documents/embed/route.ts` validates 1536 dimensions before insert into vector_documents; 5 embed tests pass |
| 6 | Semantic search returns relevant results | VERIFIED | `search.ts` semanticSearch() calls match_documents RPC with filter_tenant_id; hybridSearch() calls hybrid_search_documents RPC with RRF fusion; 9 search tests pass |
| 7 | Vector queries are tenant-scoped | VERIFIED | `database.go` requires tenant_id (returns error if empty); `search.ts` passes filter_tenant_id to both RPCs; migration creates SECURITY DEFINER RPCs with filter_tenant_id parameter |
| 8 | Tool execution times out after 30 seconds | VERIFIED | Go tools: context.WithTimeout(30s) in file.go (3 places), web.go (2 places), database.go (2 places), all check errors.Is(err, context.DeadlineExceeded); TS tools: AbortSignal.timeout(30000) in tool-registry.ts execute function |
| 9 | Tool usage is tracked with costs | VERIFIED | `route.ts` TOOL_COSTS map with per-tool costs; onFinish iterates steps[].toolCalls and inserts into tool_executions with tenant_id, cost_usd, status, input, output; 6 chat route tests pass including cost tracking test |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/worker/internal/mcp/server.go` | MCP server with tool registration | VERIFIED | `mcp.NewServer` present; calls RegisterFileTools/RegisterWebTools/RegisterDatabaseTools |
| `packages/worker/internal/mcp/handler.go` | HTTP handler for Streamable HTTP | VERIFIED | `mcp.NewStreamableHTTPHandler` present; StartMCPServer binds port |
| `packages/worker/internal/mcp/tools/file.go` | file_read, file_write, file_list | VERIFIED | filepath.Clean + strings.HasPrefix sandbox; 3 server.AddTool calls |
| `packages/worker/internal/mcp/tools/web.go` | web_search, web_fetch | VERIFIED | BRAVE_SEARCH_API_KEY check; 127.0.0.0 SSRF block; net.LookupHost; io.LimitReader |
| `packages/worker/internal/mcp/tools/database.go` | semantic_search with tenant isolation | VERIFIED | tenant_id required; text fallback + embedding path; DeadlineExceeded handling |
| `packages/web/lib/mcp/client.ts` | Singleton MCP client | VERIFIED | StreamableHTTPClientTransport; getMcpClient() singleton pattern; resetMcpClient() |
| `packages/web/lib/mcp/tool-registry.ts` | buildAiToolsFromMcp() | VERIFIED | tool() wrapping; callTool with AbortSignal.timeout(30000); getAgentTools() filter |
| `packages/web/app/api/chat/route.ts` | Chat route with MCP tools | VERIFIED | getMcpClient + buildAiToolsFromMcp + getAgentTools imports; maxSteps:10; tool_executions insert |
| `packages/web/lib/vector/embed.ts` | embedText/embedMany | VERIFIED | text-embedding-3-small; EXPECTED_DIMENSIONS = 1536; dimension validation |
| `packages/web/lib/vector/search.ts` | semanticSearch/hybridSearch | VERIFIED | match_documents RPC; hybrid_search_documents RPC; filter_tenant_id in both |
| `packages/web/app/api/documents/embed/route.ts` | POST embed endpoint | VERIFIED | embedText import; embedding.length !== 1536 guard; vector_documents insert |
| `packages/web/app/api/documents/search/route.ts` | POST search endpoint | VERIFIED | embedText + semanticSearch + hybridSearch imports; mode routing |
| `supabase/migrations/20260412100000_vector_fts.sql` | FTS + RPC migration | VERIFIED | tsvector generated column; idx_vector_documents_fts GIN index; match_documents and hybrid_search_documents functions; filter_tenant_id; hnsw.ef_search=100 |
| `packages/web/lib/agent/types.ts` | AVAILABLE_TOOLS matches Go server | VERIFIED | web_search, web_fetch, file_read, file_write, file_list, semantic_search -- matches 6 Go-registered tools; database_query removed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/worker/cmd/worker/main.go` | `packages/worker/internal/mcp/server.go` | goroutine calling StartMCPServer | WIRED | Line 42: `go mcpserver.StartMCPServer(cfg.MCPPort, pool, cfg)` |
| `packages/worker/internal/mcp/server.go` | `packages/worker/internal/mcp/tools/` | RegisterFileTools/RegisterWebTools/RegisterDatabaseTools | WIRED | Lines 17-19 call all three register functions |
| `packages/web/lib/mcp/client.ts` | `worker:3001/mcp` | StreamableHTTPClientTransport with WORKER_MCP_URL | WIRED | `new URL(process.env.WORKER_MCP_URL ?? 'http://worker:3001/mcp')` |
| `packages/web/lib/mcp/tool-registry.ts` | `packages/web/lib/mcp/client.ts` | getMcpClient() call | WIRED | buildAiToolsFromMcp takes Client param; chat route calls getMcpClient() |
| `packages/web/app/api/chat/route.ts` | `packages/web/lib/mcp/tool-registry.ts` | buildAiToolsFromMcp import | WIRED | Lines 4-5 import both getMcpClient and buildAiToolsFromMcp/getAgentTools; used at lines 55-57 |
| `packages/web/app/api/documents/embed/route.ts` | `packages/web/lib/vector/embed.ts` | embedText import | WIRED | Line 5 imports embedText; called at line 52 |
| `packages/web/app/api/documents/search/route.ts` | `packages/web/lib/vector/search.ts` | hybridSearch import | WIRED | Lines 4-5 import both; called at lines 61 and 66 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `chat/route.ts` | agentTools | getMcpClient() -> buildAiToolsFromMcp() -> client.listTools() -> Go MCP server | Yes -- tools fetched live from Go worker's registered tool set | FLOWING |
| `chat/route.ts` | tool_executions insert | steps[].toolCalls from streamText onFinish | Yes -- actual tool call records from AI SDK completion steps | FLOWING |
| `documents/embed/route.ts` | embedding | embedText(content) -> OpenAI text-embedding-3-small API | Yes -- real API call; throws if OPENAI_API_KEY unset | FLOWING |
| `documents/search/route.ts` | results | hybridSearch/semanticSearch -> supabase.rpc() | Yes -- Supabase RPC calls to match_documents/hybrid_search_documents in DB | FLOWING |
| `tools/database.go` | semantic_search | pgxpool query to vector_documents with tenant_id filter | Yes -- real SQL with pgvector <=> operator and text fallback | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Go worker builds cleanly | `cd packages/worker && go build ./...` | Clean, no output | PASS |
| Go MCP server tests pass | `go test ./internal/mcp/... -v -count=1` | 20 tests pass (8 server + 12 tool) | PASS |
| Web MCP client tests pass | `npx vitest run lib/mcp/` | 13 tests pass | PASS |
| Vector library tests pass | `npx vitest run lib/vector/` | 14 tests pass | PASS |
| Chat route tests pass | `npx vitest run app/api/chat/` | 6 tests pass | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Clean, no output | PASS |
| Full MCP initialize handshake (runtime) | Requires running Docker Compose | Not testable without server | SKIP -- needs human |
| End-to-end tool execution tracking | Requires Supabase + MCP server | Not testable without live infra | SKIP -- needs human |
| Document embed + search round-trip | Requires OpenAI API key + Supabase | Not testable without live infra | SKIP -- needs human |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| MCP-01 | 04-02-PLAN | MCP Client in Next.js for tool discovery | SATISFIED | client.ts getMcpClient() with StreamableHTTPClientTransport; tool-registry.ts buildAiToolsFromMcp() |
| MCP-02 | 04-01-PLAN | MCP Server in Go worker for tool execution | SATISFIED | server.go NewMCPServer; handler.go StartMCPServer on port 3001; Streamable HTTP transport |
| MCP-03 | 04-02-PLAN | Tool registry system | SATISFIED | tool-registry.ts with buildAiToolsFromMcp() and getAgentTools() filtering by agent.tools |
| MCP-04 | 04-01-PLAN | Built-in file tools (read/write/list) | SATISFIED | tools/file.go registers file_read, file_write, file_list with sandbox protection |
| MCP-05 | 04-01-PLAN | Built-in web tools (search/fetch) | SATISFIED | tools/web.go registers web_search (Brave API) and web_fetch (SSRF protection) |
| MCP-06 | 04-01-PLAN | Built-in database tools (query/semantic search) | SATISFIED | tools/database.go registers semantic_search with tenant_id filtering and embedding/text modes |
| MCP-07 | 04-01-PLAN, 04-02-PLAN | Tool execution timeout and error handling | SATISFIED | Go: context.WithTimeout(30s) on all handlers; TS: AbortSignal.timeout(30000); graceful degradation in chat route |
| MCP-08 | 04-02-PLAN | Tool usage cost tracking | SATISFIED | TOOL_COSTS map in route.ts; tool_executions insert with cost_usd per tool invocation |
| VECT-01 | 04-03-PLAN | Document embedding storage | SATISFIED | embed.ts embedText(); documents/embed/route.ts inserts into vector_documents with 1536-dim validation |
| VECT-02 | 04-03-PLAN | Semantic search with pgvector | SATISFIED | search.ts semanticSearch() calls match_documents RPC; migration creates cosine similarity function |
| VECT-03 | 04-03-PLAN | Hybrid search (keyword + semantic) | SATISFIED | search.ts hybridSearch() calls hybrid_search_documents RPC; migration implements RRF fusion with FTS + HNSW |
| VECT-04 | 04-03-PLAN | Vector index configuration | SATISFIED | Migration sets hnsw.ef_search=100; HNSW index (m=16, ef_construction=64) already exists from Phase 1; GIN index on FTS column added |
| VECT-05 | 04-03-PLAN | Tenant-scoped vector queries | SATISFIED | All RPCs require filter_tenant_id; database.go requires tenant_id; SECURITY DEFINER on RPC functions |

### Anti-Patterns Found

None detected. Scanned all 13 modified/created production files for TODO/FIXME/placeholder patterns, empty return stubs, and hardcoded empty values. No blockers or warnings found.

One deliberate test-time bypass noted: `SSRFCheckEnabled` package variable in `tools/web.go` disables SSRF blocking when set to false in tests (to allow httptest.NewServer on localhost). This is a correct pattern -- the var defaults to true in production and is only used in test files. Not a stub.

### Human Verification Required

#### 1. MCP Streamable HTTP Protocol Handshake

**Test:** Start Docker Compose worker service (`docker compose -f docker/compose.dev.yaml up worker`) and send a POST to `http://localhost:3001/mcp` with Content-Type: application/json and a valid MCP initialize request body: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}`

**Expected:** HTTP 200 response with JSON body containing `protocolVersion`, `capabilities`, and `serverInfo.name = "sovra-worker"`.

**Why human:** The Streamable HTTP transport requires a live Go process. The unit test `TestHTTPHandler_MCPEndpointResponds` only verifies the endpoint returns non-404; it does not exercise the full MCP protocol handshake sequence.

#### 2. End-to-End Tool Execution Tracking

**Test:** With Docker Compose running (worker + web + supabase), open the chat UI, select an agent with `semantic_search` in its tools array, and send a message that triggers a search. After the response, query: `SELECT tool_name, tenant_id, status, cost_usd FROM tool_executions ORDER BY created_at DESC LIMIT 5`.

**Expected:** At least one row with `tool_name = 'semantic_search'`, a non-null UUID tenant_id, `status = 'success'` or `'error'`, and `cost_usd = 0.0001`.

**Why human:** Requires all three services running together (Go worker MCP server, Next.js chat route, Supabase database). Unit tests mock all three boundaries independently but do not test the integrated path.

#### 3. Document Embed and Hybrid Search Round-Trip

**Test:** With OPENAI_API_KEY set and Supabase migration applied, call `POST /api/documents/embed` with `{"content": "Sovra is an AI-native SaaS boilerplate for building multi-tenant applications"}`. Then call `POST /api/documents/search` with `{"query": "multi-tenant AI boilerplate", "mode": "hybrid"}`.

**Expected:** Embed returns 201 with an `id`. Search returns 200 with `results` array where the embedded document appears with `similarity > 0.7`.

**Why human:** Requires a live Supabase instance with the FTS migration applied (ALTER TABLE + CREATE FUNCTION statements), a valid OpenAI API key, and the RPC functions `match_documents` and `hybrid_search_documents` confirmed present in the database catalog.

### Gaps Summary

No gaps. All 9 roadmap success criteria are verified against the codebase. All 13 requirements (MCP-01 through MCP-08, VECT-01 through VECT-05) are satisfied with production-quality implementations.

Three items require human verification to confirm end-to-end integration with live infrastructure. All automated checks -- Go compilation, Go tests (20 passing), TypeScript compilation, Vitest tests (33 passing across 5 test files) -- pass cleanly.

---

_Verified: 2026-04-12T02:15:00Z_
_Verifier: Claude (gsd-verifier)_
