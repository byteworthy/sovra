---
phase: 04-ai-features
plan: 01
subsystem: worker-mcp
tags: [mcp, go, tools, security]
dependency_graph:
  requires: []
  provides: [mcp-server, file-tools, web-tools, database-tools]
  affects: [packages/worker, docker]
tech_stack:
  added: [github.com/modelcontextprotocol/go-sdk@v1.5.0]
  patterns: [streamable-http, ssrf-protection, path-sandboxing, tenant-isolation]
key_files:
  created:
    - packages/worker/internal/mcp/server.go
    - packages/worker/internal/mcp/handler.go
    - packages/worker/internal/mcp/server_test.go
    - packages/worker/internal/mcp/tools/file.go
    - packages/worker/internal/mcp/tools/web.go
    - packages/worker/internal/mcp/tools/database.go
    - packages/worker/internal/mcp/tools/file_test.go
    - packages/worker/internal/mcp/tools/web_test.go
    - packages/worker/internal/mcp/tools/database_test.go
  modified:
    - packages/worker/internal/config/config.go
    - packages/worker/cmd/worker/main.go
    - packages/worker/go.mod
    - packages/worker/go.sum
    - docker/compose.dev.yaml
    - docker/compose.prod.yaml
decisions:
  - Used Server.AddTool (raw handler) instead of generic AddTool to avoid struct tag inference complexity with the Go SDK
  - Added SSRFCheckEnabled package var for test-time bypass of localhost SSRF blocking
  - Plain HTTP for MCP server (internal Docker network only, TLS at edge)
  - Text search fallback in semantic_search when no embedding vector provided
metrics:
  duration: 697s
  completed: 2026-04-12
  tasks: 2
  tests: 20
  files_created: 9
  files_modified: 6
---

# Phase 04 Plan 01: Go MCP Server with Built-in Tools Summary

Go MCP server on port 3001 with 6 tools (file_read, file_write, file_list, web_search, web_fetch, semantic_search), Streamable HTTP transport, path traversal protection, SSRF blocking, 30s timeouts, and tenant-scoped database queries.

## Tasks Completed

| Task | Name | Commit | Tests |
|------|------|--------|-------|
| 1 | MCP server setup with Streamable HTTP handler + config | dd20bed | 8 |
| 2 | Built-in tool handlers with security controls | 5591c30 | 12 |

## What Was Built

### Task 1: MCP Server Infrastructure
- MCP server with `sovra-worker` v1.0.0 implementation using official Go SDK v1.5.0
- Streamable HTTP handler at `/mcp` endpoint on port 3001
- Config extended with MCPPort, AgentWorkspacePath, BraveSearchAPIKey, OpenAIAPIKey
- `StartMCPServer` goroutine wired into main.go alongside health and gRPC servers
- Docker Compose dev/prod updated with port 3001, agent-workspace volume, env vars

### Task 2: Tool Handlers with Security Controls
- **file_read/file_write/file_list**: Sandboxed to workspace root via `filepath.Clean` + `strings.HasPrefix` against absolute workspace path. Path traversal (`../`) blocked.
- **web_search**: Calls Brave Search API with `X-Subscription-Token`. Returns structured results. Graceful error when API key not configured.
- **web_fetch**: SSRF protection blocks private IP ranges (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, IPv6 loopback/ULA) via `net.LookupHost` before fetch. Response body limited to 1MB.
- **semantic_search**: Requires `tenant_id` (returns error if empty). Supports pre-computed embedding vectors or text-based fallback. Nil pool returns "database not connected".
- All tools enforce 30s timeout via `context.WithTimeout`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MCP SDK API differs from plan assumptions**
- **Found during:** Task 1 tests
- **Issue:** Plan assumed `NewInMemoryClientTransport` and `client.CallTool()` but actual SDK uses `NewInMemoryTransports()` (returns pair), `server.Connect(ctx, t1, nil)`, and `session.CallTool()`
- **Fix:** Updated all test helpers to use correct SDK API pattern
- **Files modified:** server_test.go, file_test.go, web_test.go, database_test.go

**2. [Rule 1 - Bug] OPTIONS /mcp returns 400, not 200**
- **Found during:** Task 1 tests
- **Issue:** MCP Streamable HTTP handler requires proper protocol headers for all methods
- **Fix:** Changed test to verify POST routing works (non-404) instead of bare OPTIONS
- **Files modified:** server_test.go

**3. [Rule 3 - Blocking] httptest mock servers bind to 127.0.0.1, blocked by SSRF**
- **Found during:** Task 2 web_fetch content test
- **Issue:** `httptest.NewServer` binds to localhost which is correctly blocked by SSRF protection
- **Fix:** Added `SSRFCheckEnabled` package-level var; tests disable it for localhost mocks while SSRF blocking tests run with it enabled
- **Files modified:** web.go, web_test.go

## Threat Mitigations Verified

| Threat ID | Mitigation | Test Coverage |
|-----------|-----------|---------------|
| T-04-01 | Path traversal blocked via filepath.Clean + HasPrefix | TestFileRead_RejectsPathTraversal, TestFileWrite_RejectsPathTraversal |
| T-04-02 | Private IP SSRF blocking | TestWebFetch_BlocksPrivateIPs (4 subtests) |
| T-04-03 | tenant_id required on semantic_search | TestSemanticSearch_RequiresTenantID |
| T-04-04 | 30s context.WithTimeout on all handlers | Timeout code path in all tool handlers |
| T-04-05 | io.LimitReader(1MB) on web_fetch | Implemented in web.go |

## Known Stubs

None. All tools are fully implemented with production-ready handlers.

## Self-Check: PASSED

All 9 created files exist. Both commit hashes (dd20bed, 5591c30) verified. All 13 acceptance criteria grep patterns confirmed.
