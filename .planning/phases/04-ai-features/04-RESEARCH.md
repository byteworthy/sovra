# Phase 4: AI Features - Research

**Researched:** 2026-04-12
**Domain:** MCP integration (TypeScript client + Go server), pgvector hybrid search, Vercel AI SDK tool calling
**Confidence:** HIGH

## Summary

Phase 4 adds the AI execution layer: an MCP server running in the Go worker that exposes built-in tools, an MCP client in Next.js that discovers and calls those tools during agent streaming, and pgvector-backed semantic and hybrid search for document retrieval.

The codebase from Phases 1-3 gives a solid foundation. The `agents.tools` column already stores tool names as JSONB (`['web_search', 'file_read', ...]`). The `tool_executions` table already tracks status, duration_ms, and cost_usd. The `vector_documents` table already has an HNSW index on `embedding extensions.vector(1536)`. The `chat/route.ts` already calls `streamText` -- tools plug in as the `tools` parameter. The Go worker has Gin and pgx wired up.

The main architecture decision is the MCP transport between Next.js and the Go worker. Given both run in the same Docker network (internal, no public exposure), Streamable HTTP over an internal port is the right choice. The official Go SDK (`github.com/modelcontextprotocol/go-sdk` v1.5.0) handles the server side. The `@modelcontextprotocol/sdk` v1.29.0 (already installed) handles the client side with `StreamableHTTPClientTransport`.

**Primary recommendation:** Run the MCP server on port 3001 inside the Go worker (separate from the existing health server on 8080 and gRPC on 50051). The Next.js chat route discovers and caches available tools from MCP on startup, then wires them into `streamText` with `execute` functions that forward calls through the MCP client. Tool results are written to `tool_executions` for cost tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion -- discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- AIProviderAdapter pattern (Phase 3) -- extend for tool execution context
- Tenant-scoped everything via RLS -- vector queries must be tenant-isolated
- Go worker already scaffolded (Phase 1) -- MCP server goes here
- Open-source flexibility -- MCP implementation should follow official SDK patterns
- No em dashes in copywriting
- Premium UI for any tool management interfaces

### Claude's Discretion
All implementation choices (transport type, tool execution location, embedding model, hybrid search SQL, cost estimation, etc.) are at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None -- discuss phase skipped.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MCP-01 | MCP Client in Next.js for tool discovery | StreamableHTTPClientTransport in @modelcontextprotocol/sdk v1.29.0; client.listTools() caches tool registry |
| MCP-02 | MCP Server in Go worker for tool execution | github.com/modelcontextprotocol/go-sdk v1.5.0; mcp.NewStreamableHTTPHandler() on port 3001 |
| MCP-03 | Tool registry system | Client-side: listTools() result mapped to ai `tool()` functions. Server-side: mcp.AddTool() per built-in tool |
| MCP-04 | Built-in tools: file read/write, directory list | Go handler reads/writes from a sandboxed workspace path; path traversal prevention required |
| MCP-05 | Built-in tools: web search, URL fetch | Go handler calls a configured search API (Brave/SerpAPI via env var) + net/http URL fetcher |
| MCP-06 | Built-in tools: database query, semantic search | Go handler calls pgvector via pgx pool; tenant_id passed as tool argument, enforced server-side |
| MCP-07 | Tool execution timeout and error handling | Go: context.WithTimeout(30s) per tool. Next.js: AbortSignal with 30s timeout |
| MCP-08 | Tool usage cost tracking | Insert into tool_executions with duration_ms and cost_usd after each execution |
| VECT-01 | Document embedding storage | New API route POST /api/documents/embed; calls OpenAI text-embedding-3-small, stores in vector_documents |
| VECT-02 | Semantic search with pgvector | SQL: ORDER BY embedding <=> $1 LIMIT $2 with tenant_id = $3 (HNSW index active) |
| VECT-03 | Hybrid search (keyword + semantic) | RRF fusion: ts_rank + cosine similarity combined; vector column for embeddings, tsvector for FTS |
| VECT-04 | Vector index configuration | HNSW already created in migration (m=16, ef_construction=64); add ef_search config for query time |
| VECT-05 | Tenant-scoped vector queries | All queries include AND tenant_id = $tenant filter; RLS policy also enforces |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @modelcontextprotocol/sdk | 1.29.0 (installed) | MCP client + TypeScript server types | Official SDK, already in package.json |
| github.com/modelcontextprotocol/go-sdk | v1.5.0 (2026-04-07) | MCP server in Go | Official SDK maintained by Anthropic + Google |
| ai (Vercel AI SDK) | 3.4.33 (resolves from ^3.2.0) | Tool calling via streamText | Already installed, `tool()` helper included |
| @ai-sdk/openai | 0.0.72 (installed) | OpenAI embeddings via embedMany() | Already installed, supports text-embedding-3-small |
| pgvector | extension (enabled) | Vector similarity search | Already enabled with HNSW index in Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^3.24.1 (installed) | Tool parameter schema (Vercel AI SDK requires it) | All tool definitions in Next.js |
| context (stdlib) | Go stdlib | Timeout enforcement per tool call | All Go tool handlers |
| net/http (stdlib) | Go stdlib | URL fetch tool + MCP HTTP handler | Web tool + MCP endpoint |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official Go SDK | mark3labs/mcp-go | mark3labs is more mature with more community examples but not official; official SDK v1.5.0 is now stable |
| text-embedding-3-small | text-embedding-3-large | 3-small is 1536 dimensions (matches schema), 8x cheaper; sufficient for RAG use cases |
| HNSW index (already set) | IVFFlat | HNSW works on empty tables; IVFFlat requires training data. HNSW already deployed |
| Streamable HTTP transport | SSE transport | Streamable HTTP is the newer spec (2025-03-26+); SSE is legacy |

**Installation (Go worker):**
```bash
cd packages/worker
go get github.com/modelcontextprotocol/go-sdk@v1.5.0
```

**Version verification:** [VERIFIED: npm registry] `@modelcontextprotocol/sdk@1.29.0` published 2026-04-07. [VERIFIED: GitHub releases] `go-sdk@v1.5.0` published 2026-04-07.

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── web/
│   ├── app/api/
│   │   ├── chat/route.ts          # MODIFY: add tools from MCP client
│   │   └── documents/
│   │       ├── embed/route.ts     # NEW: POST embed + store
│   │       └── search/route.ts    # NEW: hybrid search endpoint
│   └── lib/
│       ├── ai/
│       │   ├── adapter.ts         # EXISTING: no change
│   │   ├── mcp/
│   │   │   ├── client.ts          # NEW: singleton MCP client
│   │   │   └── tool-registry.ts   # NEW: maps MCP tools -> ai tool()
│   │   └── vector/
│   │       ├── embed.ts           # NEW: embedText() + embedMany()
│   │       └── search.ts          # NEW: semanticSearch() + hybridSearch()
└── worker/
    └── internal/
        ├── mcp/
        │   ├── server.go          # NEW: McpServer setup
        │   ├── tools/
        │   │   ├── file.go        # NEW: read/write/list
        │   │   ├── web.go         # NEW: search/fetch
        │   │   └── database.go    # NEW: query/semantic_search
        │   └── handler.go         # NEW: HTTP handler wiring
        └── http/
            └── health.go          # EXISTING: add MCP port alongside
```

### Pattern 1: MCP Server Registration in Go (Official SDK)

**What:** Register tools with typed input structs; the SDK auto-generates JSON Schema from struct tags.
**When to use:** Every built-in tool definition.

```go
// Source: pkg.go.dev/github.com/modelcontextprotocol/go-sdk/mcp
type FileReadArgs struct {
    Path string `json:"path" jsonschema:"path to read, relative to workspace root"`
}

mcp.AddTool(server, &mcp.Tool{
    Name:        "file_read",
    Description: "Read contents of a file",
}, func(ctx context.Context, req *mcp.CallToolRequest, args FileReadArgs) (*mcp.CallToolResult, any, error) {
    // enforce 30s via ctx (set upstream with context.WithTimeout)
    content, err := readSandboxed(args.Path)
    if err != nil {
        return &mcp.CallToolResult{IsError: true, Content: []mcp.Content{
            &mcp.TextContent{Text: err.Error()},
        }}, nil, nil
    }
    return &mcp.CallToolResult{Content: []mcp.Content{
        &mcp.TextContent{Text: content},
    }}, nil, nil
})
```

### Pattern 2: MCP HTTP Handler in Go (Streamable HTTP)

**What:** Expose MCP server via HTTP on a dedicated port.
**When to use:** Worker startup.

```go
// Source: pkg.go.dev/github.com/modelcontextprotocol/go-sdk/mcp
handler := mcp.NewStreamableHTTPHandler(func(req *http.Request) *mcp.Server {
    return server
}, nil)
mux := http.NewServeMux()
mux.Handle("/mcp", handler)
http.ListenAndServe(fmt.Sprintf(":%d", mcpPort), mux)
```

### Pattern 3: MCP Client in Next.js

**What:** Connect to Go worker MCP server, discover tools, expose as Vercel AI SDK tools.
**When to use:** On first chat request (lazy init with singleton pattern).

```typescript
// Source: installed @modelcontextprotocol/sdk v1.29.0
import { Client } from '@modelcontextprotocol/sdk/client'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp'
import { tool } from 'ai'
import { z } from 'zod'

let mcpClient: Client | null = null

export async function getMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient
  const client = new Client({ name: 'byteswarm-web', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.WORKER_MCP_URL ?? 'http://worker:3001/mcp')
  )
  await client.connect(transport)
  mcpClient = client
  return client
}

export async function buildAiToolsFromMcp(client: Client): Promise<Record<string, ReturnType<typeof tool>>> {
  const { tools } = await client.listTools()
  return Object.fromEntries(tools.map(t => [
    t.name,
    tool({
      description: t.description ?? '',
      parameters: z.object({}), // dynamically constructed from t.inputSchema
      execute: async (args) => {
        const result = await client.callTool({ name: t.name, arguments: args })
        return result.content
      },
    })
  ]))
}
```

### Pattern 4: Tool Calling in streamText

**What:** Pass MCP-backed tools to `streamText` alongside the agent's configured tool list.
**When to use:** In `app/api/chat/route.ts`.

```typescript
// Source: installed ai@3.4.33
const mcpClient = await getMcpClient()
const allTools = await buildAiToolsFromMcp(mcpClient)
// Filter to only the tools this agent has assigned
const agentTools = Object.fromEntries(
  (agent.tools as string[]).map(name => [name, allTools[name]]).filter(([, v]) => v)
)

const result = await streamText({
  model,
  system: agent.system_prompt ?? undefined,
  messages,
  tools: agentTools,
  maxSteps: 10,  // allow multi-step tool use
  temperature: Number(agent.temperature) || 0.7,
  maxTokens: agent.max_tokens ?? 4096,
  onFinish: async ({ usage, steps }) => {
    // write tool_executions rows for each step's tool calls
  },
})
```

### Pattern 5: Embedding + Semantic Search

**What:** Generate 1536-dim embeddings via OpenAI, store in `vector_documents`, query with cosine distance.
**When to use:** Document ingestion and `semantic_search` tool execution.

```typescript
// Source: installed @ai-sdk/openai v0.0.72 + ai@3.4.33
import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'

const { embeddings } = await embedMany({
  model: openai.embedding('text-embedding-3-small'),
  values: chunks,
})
```

```sql
-- Semantic search (pgvector cosine similarity, tenant-scoped)
-- Source: migration 20260412004330 + pgvector docs
SELECT id, content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM vector_documents
WHERE tenant_id = $2
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

### Pattern 6: Hybrid Search (RRF Fusion)

**What:** Combine BM25 full-text rank and cosine similarity rank using Reciprocal Rank Fusion.
**When to use:** `database_query` tool semantic search mode.

```sql
-- Source: VERIFIED pattern from pgvector community + DEV.to RRF article
WITH semantic AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
  FROM vector_documents
  WHERE tenant_id = $3
  LIMIT 60
),
keyword AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2)) DESC) AS rank
  FROM vector_documents
  WHERE tenant_id = $3
    AND to_tsvector('english', content) @@ plainto_tsquery('english', $2)
  LIMIT 60
),
rrf AS (
  SELECT
    COALESCE(s.id, k.id) AS id,
    COALESCE(1.0 / (60 + s.rank), 0) + COALESCE(1.0 / (60 + k.rank), 0) AS score
  FROM semantic s
  FULL OUTER JOIN keyword k ON s.id = k.id
)
SELECT vd.id, vd.content, vd.metadata, rrf.score
FROM rrf
JOIN vector_documents vd ON vd.id = rrf.id
ORDER BY rrf.score DESC
LIMIT $4;
```

### Anti-Patterns to Avoid
- **Spawning a new MCP client per request:** Creates connection overhead per chat message. Use a module-level singleton with reconnect logic.
- **Passing tenant_id only via RLS:** RLS is the safety net; pass tenant_id explicitly as a tool argument AND enforce in Go tool handler. Defense in depth.
- **Running MCP server on the same port as health (8080):** Will conflict with Gin. Use port 3001.
- **Using IVFFlat:** Requires data present at index creation time. HNSW (already deployed) works on empty tables.
- **Ignoring `maxSteps` in streamText:** Without `maxSteps`, tools only run once. Multi-step agents need `maxSteps >= 2`.
- **Path traversal in file tools:** Validate that resolved paths stay within the sandboxed workspace root. Use `filepath.Clean` + prefix check.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol framing (JSON-RPC 2.0) | Custom HTTP protocol | @modelcontextprotocol/sdk + go-sdk | Protocol has initialization handshake, capability negotiation, session management |
| Tool parameter validation | Manual JSON parsing | Zod schemas (TS) + struct tags (Go) | SDK auto-validates; mismatches return typed errors |
| Vector similarity operators | Raw array math | pgvector `<=>` operator | Highly optimized C extension with HNSW index |
| Embedding generation | Local model inference | OpenAI text-embedding-3-small via @ai-sdk/openai | Consistent 1536-dim output matching schema; no GPU needed |
| Tool execution timeout | Manual goroutine kill | context.WithTimeout(30s) | Go context propagation is the idiomatic pattern; cancels I/O automatically |
| RRF scoring | Custom ranking algorithm | Standard RRF SQL with k=60 | k=60 is the well-benchmarked default from the original RRF paper |

**Key insight:** The MCP protocol has a non-trivial initialization flow (capabilities exchange, method validation). Building it from JSON-RPC primitives takes days and is bug-prone. The official SDKs handle all of this.

## Common Pitfalls

### Pitfall 1: MCP Client Connection in Next.js Edge vs Node Runtime
**What goes wrong:** `StreamableHTTPClientTransport` uses Node.js `fetch` and may not be available in edge runtime.
**Why it happens:** Next.js chat API route might be configured as edge runtime.
**How to avoid:** Ensure `app/api/chat/route.ts` runs as Node.js runtime (default in App Router). Do not add `export const runtime = 'edge'` to this route.
**Warning signs:** `fetch is not defined` or `module not found` errors at runtime.

### Pitfall 2: Tool Execute is Synchronous in the Streaming Loop
**What goes wrong:** A slow tool call (network fetch, file I/O) blocks the entire streaming response.
**Why it happens:** `streamText` awaits the `execute` function before continuing.
**How to avoid:** All tool execute functions must be async and respect the `abortSignal` from the options argument. The 30s timeout must be set at the MCP client level using `AbortSignal.timeout(30000)`.
**Warning signs:** Chat responses hang for 30+ seconds on tool calls.

### Pitfall 3: Vector Dimension Mismatch
**What goes wrong:** Inserting an embedding of wrong dimensions silently fails or throws a pgvector type error.
**Why it happens:** `text-embedding-3-small` returns 1536 dimensions; schema defines `extensions.vector(1536)`. Using a different model returns different dimensions.
**How to avoid:** Only use `text-embedding-3-small` for embeddings. Assert `embedding.length === 1536` before insert.
**Warning signs:** `ERROR: different vector dimensions 3072 and 1536` from pgvector.

### Pitfall 4: Go SDK HTTP Handler Session State
**What goes wrong:** Stateless mode drops session between requests; stateful mode leaks memory if sessions are never cleaned up.
**Why it happens:** `NewStreamableHTTPHandler` defaults to stateless. Stateful mode requires a session ID generator.
**How to avoid:** Use stateless mode (no session ID) for the internal worker MCP server since each chat request creates a new connection. Pass `sessionIdGenerator: nil` explicitly.
**Warning signs:** Tool calls return 400 "missing session ID" or memory grows unboundedly.

### Pitfall 5: tool_executions Missing tenant_id
**What goes wrong:** RLS blocks INSERT into `tool_executions` because the row lacks a valid tenant_id.
**Why it happens:** The chat API route has the tenant context but it must be explicitly passed to the `onFinish` callback when recording executions.
**How to avoid:** Extract tenant_id from the agent record (already fetched in chat route) and include it in every `tool_executions` insert.
**Warning signs:** `new row violates row-level security policy` errors in production logs.

### Pitfall 6: HNSW ef_search Default Too Low
**What goes wrong:** Semantic search returns low-quality results even though relevant documents exist.
**Why it happens:** Default `hnsw.ef_search = 40` limits candidate set during ANN search.
**How to avoid:** Set `SET hnsw.ef_search = 100` at session level for search queries (or as a migration default). This is a query-time setting, not an index rebuild.
**Warning signs:** Semantic search precision notably worse than expected; adding `ef_search = 100` improves it.

## Code Examples

### MCP Server Startup in Go Worker

```go
// Source: pkg.go.dev/github.com/modelcontextprotocol/go-sdk/mcp (verified v1.5.0)
func StartMCPServer(port int, pool *pgxpool.Pool) {
    server := mcp.NewServer(&mcp.Implementation{
        Name:    "byteswarm-worker",
        Version: "1.0.0",
    }, nil)

    registerFileTools(server)
    registerWebTools(server)
    registerDatabaseTools(server, pool)

    handler := mcp.NewStreamableHTTPHandler(func(req *http.Request) *mcp.Server {
        return server
    }, nil)

    mux := http.NewServeMux()
    mux.Handle("/mcp", handler)

    log.Printf("mcp server listening on :%d", port)
    if err := http.ListenAndServe(fmt.Sprintf(":%d", port), mux); err != nil {
        log.Fatalf("mcp server failed: %v", err)
    }
}
```

### Tool Timeout Pattern in Go

```go
// Source: Go stdlib context package (verified)
func handleFileRead(ctx context.Context, req *mcp.CallToolRequest, args FileReadArgs) (*mcp.CallToolResult, any, error) {
    tctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    content, err := readWithContext(tctx, args.Path)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return &mcp.CallToolResult{IsError: true, Content: []mcp.Content{
                &mcp.TextContent{Text: "tool execution timed out after 30s"},
            }}, nil, nil
        }
        return &mcp.CallToolResult{IsError: true, Content: []mcp.Content{
            &mcp.TextContent{Text: err.Error()},
        }}, nil, nil
    }
    // ...
}
```

### Tool Execution Tracking (Next.js onFinish)

```typescript
// Source: ai@3.4.33 streamText onFinish callback
onFinish: async ({ steps }) => {
  await supabase.from('agents').update({ status: 'idle' }).eq('id', agentId)

  for (const step of steps) {
    for (const toolCall of step.toolCalls ?? []) {
      const toolResult = step.toolResults?.find(r => r.toolCallId === toolCall.toolCallId)
      await supabase.from('tool_executions').insert({
        tenant_id: agent.tenant_id,
        agent_id: agentId,
        conversation_id: conversationId,
        tool_name: toolCall.toolName,
        input: toolCall.args,
        output: toolResult?.result ?? null,
        status: toolResult ? 'success' : 'error',
        // cost_usd: estimated per tool type (web_search ~$0.001, others ~$0)
      })
    }
  }
}
```

### Hybrid Search SQL (migration)

```sql
-- Source: RRF pattern from pgvector community, verified against pgvector docs
-- Add tsvector column for keyword search (new migration required)
ALTER TABLE vector_documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_vector_documents_fts
  ON vector_documents USING gin(fts);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE-only MCP transport | Streamable HTTP (bidirectional) | MCP spec 2025-03-26 | Better for request/response tool calls; SSE still supported for legacy |
| `Server` class directly | `McpServer` high-level API | @modelcontextprotocol/sdk v0.6+ | Simpler tool registration; `Server` still available for advanced cases |
| IVFFlat vector index | HNSW | pgvector 0.5.0 | HNSW works on empty tables, better recall, no retraining needed |
| text-embedding-ada-002 | text-embedding-3-small | OpenAI Dec 2023 | 5x cheaper, better performance, same 1536 dimensions |

**Deprecated/outdated:**
- `SSEClientTransport` from `@modelcontextprotocol/sdk/client/sse`: Deprecated in favor of `StreamableHTTPClientTransport`.
- `Server` (low-level) for new servers: Use `McpServer` instead per SDK docs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Web search tool will use Brave Search API or SerpAPI via env var (SEARCH_API_KEY) | Architecture Patterns / MCP-05 | If neither is configured, web_search tool returns error; plan must include fallback/mock |
| A2 | File tools operate on a sandboxed workspace volume mounted in Docker | Architecture Patterns / MCP-04 | If no shared volume, file tools will be no-ops; Docker Compose needs a workspace volume |
| A3 | Go worker MCP server runs on port 3001 (new, not conflicting with 8080 health or 50051 gRPC) | Architecture Patterns | Port 3001 is available in Docker network; config.go must be updated |
| A4 | `onFinish` in streamText v3.4.33 provides `steps` with `toolCalls` and `toolResults` arrays | Code Examples | If API differs slightly, tool tracking code needs adjustment |

## Open Questions

1. **Web search API provider**
   - What we know: The `web_search` tool needs a real API. Common choices: Brave Search ($3/1000 queries), SerpAPI ($50/5000), DuckDuckGo (unofficial, unstable).
   - What's unclear: Which API key is expected in the environment.
   - Recommendation: Default to Brave Search API (`BRAVE_SEARCH_API_KEY`). The tool returns an error with a helpful message if the key is not set.

2. **File tool sandbox path**
   - What we know: File tools must be sandboxed to prevent path traversal to container root.
   - What's unclear: Whether there's a Docker volume for agent workspaces.
   - Recommendation: Introduce `AGENT_WORKSPACE_PATH` env var (default `/tmp/agent-workspace`). Add to docker-compose volumes.

3. **Cost estimation for tool_executions**
   - What we know: `cost_usd` column exists. Web search has a per-query cost; file and database tools have near-zero cost.
   - What's unclear: Whether to track actual API costs or estimated costs.
   - Recommendation: Use estimated cost constants per tool type (web_search = $0.001, others = $0.000) defined in a Go config struct.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go 1.26.2 | Worker MCP server | Verify at build time | go.mod declares 1.26.2 | N/A (Docker builds Go) |
| pgvector extension | VECT-01 through VECT-05 | Enabled (migration verified) | As per Supabase PostgreSQL 15 | N/A |
| OpenAI API key | VECT-01 (embeddings) | Checked at runtime via env | N/A | Return 503 with clear error if missing |
| Brave/SerpAPI key | MCP-05 (web search) | Unknown - env var | N/A | Tool returns error "web search API not configured" |
| Node.js 22+ | Next.js | Available in Docker | 22.x (docker image) | N/A |

**Missing dependencies with no fallback:**
- None that block the core architecture.

**Missing dependencies with fallback:**
- Search API key: web_search tool degrades gracefully if not configured.
- OpenAI API key: embed endpoint returns 503 with clear message.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.4 (web), go test (worker) |
| Config file | packages/web/package.json "test": "vitest run" |
| Quick run command | `cd packages/web && npm test` + `cd packages/worker && go test ./...` |
| Full suite command | `cd packages/web && npm test && cd ../worker && go test ./...` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-01 | MCP client connects to worker | integration | `npm test -- lib/mcp/client.test.ts` | Wave 0 |
| MCP-02 | MCP server starts, health check | unit (Go) | `go test ./internal/mcp/...` | Wave 0 |
| MCP-03 | listTools returns built-in tools | unit | `npm test -- lib/mcp/tool-registry.test.ts` | Wave 0 |
| MCP-04 | file_read returns file content | unit (Go) | `go test ./internal/mcp/tools/...` | Wave 0 |
| MCP-05 | web_search returns results (mocked) | unit (Go) | `go test ./internal/mcp/tools/...` | Wave 0 |
| MCP-06 | semantic_search returns ranked docs | integration | `go test ./internal/mcp/tools/...` | Wave 0 |
| MCP-07 | tool times out after 30s | unit (Go) | `go test ./internal/mcp/tools/...` | Wave 0 |
| MCP-08 | tool_executions row inserted after call | integration | `npm test -- app/api/chat/route.test.ts` | Wave 0 |
| VECT-01 | embed endpoint stores vector_document | integration | `npm test -- app/api/documents/embed.test.ts` | Wave 0 |
| VECT-02 | semantic search returns ranked results | integration | `npm test -- lib/vector/search.test.ts` | Wave 0 |
| VECT-03 | hybrid search returns better recall than pure semantic | unit | `npm test -- lib/vector/search.test.ts` | Wave 0 |
| VECT-04 | HNSW index exists on vector_documents | smoke (SQL) | manual via supabase dashboard | N/A |
| VECT-05 | vector queries filtered by tenant_id | unit | `npm test -- lib/vector/search.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/web && npm test && cd ../worker && go test ./...`
- **Per wave merge:** Full suite above
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/web/lib/mcp/client.test.ts` - MCP client connection + tool discovery
- [ ] `packages/web/lib/vector/search.test.ts` - semantic and hybrid search
- [ ] `packages/web/app/api/documents/embed.test.ts` - embedding endpoint
- [ ] `packages/worker/internal/mcp/server_test.go` - MCP server starts + tools registered
- [ ] `packages/worker/internal/mcp/tools/file_test.go` - file tool unit tests
- [ ] `packages/worker/internal/mcp/tools/web_test.go` - web tool with mocked HTTP
- [ ] `packages/worker/internal/mcp/tools/database_test.go` - semantic search against test DB

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A (internal Docker network only) |
| V3 Session Management | no | Stateless MCP transport (no sessions) |
| V4 Access Control | yes | tenant_id enforced in every tool handler + RLS |
| V5 Input Validation | yes | Go struct tag validation + zod schema validation |
| V6 Cryptography | no | No keys in tool transport (internal network) |

### Known Threat Patterns for MCP + Go Tool Server

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in file tools | Tampering | `filepath.Clean()` + prefix check against workspace root |
| Prompt injection via tool results | Spoofing | Tool output is returned as tool_result message, not injected into system prompt |
| SSRF via URL fetch tool | Information Disclosure | Blocklist private IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x) in web fetch handler |
| Cross-tenant vector query | Information Disclosure | tenant_id filter in every SQL query; RLS as defense-in-depth |
| Tool cost abuse | Denial of Service | Rate limit tool_executions per tenant per hour (tracked in table) |

## Sources

### Primary (HIGH confidence)
- `@modelcontextprotocol/sdk@1.29.0` installed - verified via `packages/web/node_modules/@modelcontextprotocol/sdk/package.json`; exports: `./client`, `./server`, `./client/streamableHttp`
- `github.com/modelcontextprotocol/go-sdk@v1.5.0` - verified via GitHub releases API (2026-04-07); `mcp.NewServer`, `mcp.AddTool`, `mcp.NewStreamableHTTPHandler` confirmed via pkg.go.dev
- `ai@3.4.33` installed - `tool()` function, `streamText` with `tools` + `maxSteps` params confirmed via `packages/web/node_modules/ai/dist/index.d.ts`
- Supabase migration `20260412004330_initial_schema.sql` - `vector_documents` table with `embedding extensions.vector(1536)`, HNSW index `(m=16, ef_construction=64)` confirmed
- `tool_executions` schema - `status`, `duration_ms`, `cost_usd`, `tenant_id` columns confirmed from migration + database.ts types

### Secondary (MEDIUM confidence)
- Hybrid RRF search pattern - verified via DEV.to article + pgvector GitHub docs; k=60 is standard RRF constant
- `hnsw.ef_search = 100` recommendation - pgvector docs (via WebSearch + GitHub README)

### Tertiary (LOW confidence)
- A4 (onFinish steps shape) - based on ai@3.4.33 type signatures; exact field names need runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all packages inspected from installed node_modules and verified releases
- Architecture: HIGH - based on existing codebase patterns + verified SDK APIs
- Pitfalls: HIGH - sourced from SDK docs, pgvector docs, and common Go patterns
- Tool cost estimation: LOW - constants are guesses; real costs depend on chosen search provider

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable SDKs; MCP spec stable at 2025-03-26)
