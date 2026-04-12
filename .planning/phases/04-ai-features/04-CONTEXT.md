# Phase 4: AI Features - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Implement MCP integration, built-in tools, and vector storage. This phase delivers:
- MCP Client in Next.js for tool discovery and execution
- MCP Server in Go worker exposing tools via the Model Context Protocol
- Tool registry system for managing available tools per agent
- Built-in tools: file operations (read/write/list), web tools (search/fetch), database tools (query/semantic search)
- Tool execution timeout (30s) and error handling
- Tool usage cost tracking per tenant
- Document embedding storage via pgvector
- Semantic search and hybrid search (keyword + semantic)
- Vector index configuration
- Tenant-scoped vector queries

Requirements: MCP-01 through MCP-08 (MCP integration), VECT-01 through VECT-05 (vector storage).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion -- discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- AIProviderAdapter pattern (Phase 3) -- extend for tool execution context
- Tenant-scoped everything via RLS -- vector queries must be tenant-isolated
- Go worker already scaffolded (Phase 1) -- MCP server goes here
- Open-source flexibility -- MCP implementation should follow official SDK patterns
- No em dashes in copywriting
- Premium UI for any tool management interfaces

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None -- discuss phase skipped.

</deferred>
