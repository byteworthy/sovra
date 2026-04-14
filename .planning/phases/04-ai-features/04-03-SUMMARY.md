---
phase: 04-ai-features
plan: 03
subsystem: vector-search
tags: [pgvector, embeddings, hybrid-search, rrf, openai]
dependency_graph:
  requires: [01-foundation, 04-RESEARCH]
  provides: [embed-api, search-api, vector-rpc-functions, fts-migration]
  affects: [packages/web/lib/vector, packages/web/app/api/documents, supabase/migrations]
tech_stack:
  added: [text-embedding-3-small, pgvector-rrf]
  patterns: [supabase-rpc, tenant-scoped-vector-queries, zod-validation]
key_files:
  created:
    - packages/web/lib/vector/embed.ts
    - packages/web/lib/vector/search.ts
    - packages/web/lib/vector/embed.test.ts
    - packages/web/lib/vector/search.test.ts
    - packages/web/app/api/documents/embed/route.ts
    - packages/web/app/api/documents/search/route.ts
    - supabase/migrations/20260412100000_vector_fts.sql
  modified:
    - packages/web/lib/agent/types.ts
decisions:
  - Used Supabase RPC functions for vector queries since PostgREST cannot use pgvector operators
  - RRF fusion with k=60 (standard constant from original RRF paper)
  - SECURITY DEFINER with empty search_path on RPC functions for search_path injection prevention
  - metadata field cast through Json type to satisfy Supabase generated types
metrics:
  duration: 375s
  completed: "2026-04-12T06:54:00Z"
  tasks_completed: 2
  tasks_total: 2
  tests_added: 14
  tests_passing: 14
---

# Phase 04 Plan 03: Vector Search and Document Embedding Summary

**One-liner:** pgvector semantic and hybrid (RRF) search with OpenAI text-embedding-3-small, tenant-scoped RPC functions, and document embed/search API endpoints.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Embedding utilities + semantic search + API endpoints + tests | 4e41114 | embed.ts, search.ts, embed/route.ts, search/route.ts, 2 test files |
| 2 | FTS migration + RPC functions + AVAILABLE_TOOLS update | 9d07bcb | 20260412100000_vector_fts.sql, types.ts |

## What Was Built

### Embedding Utilities (packages/web/lib/vector/embed.ts)
- `embedText(text)` -- generates 1536-dim vector via OpenAI text-embedding-3-small
- `embedMany(texts)` -- batch embedding with per-vector dimension validation

### Search Functions (packages/web/lib/vector/search.ts)
- `semanticSearch()` -- calls `match_documents` RPC with cosine similarity ranking
- `hybridSearch()` -- calls `hybrid_search_documents` RPC with RRF fusion (semantic + keyword)
- Both enforce tenant_id filtering via RPC parameters

### API Endpoints
- `POST /api/documents/embed` -- auth-gated, zod-validated (content 1-50000 chars), stores embedding in vector_documents
- `POST /api/documents/search` -- auth-gated, supports `semantic` and `hybrid` modes (default: hybrid)

### Migration (supabase/migrations/20260412100000_vector_fts.sql)
- FTS tsvector generated column on vector_documents with GIN index
- `match_documents` RPC -- semantic search with cosine similarity, SECURITY DEFINER
- `hybrid_search_documents` RPC -- RRF fusion (k=60) combining semantic and keyword rank, SECURITY DEFINER
- `hnsw.ef_search = 100` for better recall

### AVAILABLE_TOOLS Update
- Added: `web_fetch`, `file_list`
- Removed: `database_query` (replaced by `semantic_search`)
- Now matches the 6 tools registered in the Go MCP server

## Decisions Made

1. **Supabase RPC for vector queries** -- PostgREST cannot use pgvector `<=>` operator directly; RPC functions are the standard pattern
2. **RRF k=60** -- Standard constant from the original Reciprocal Rank Fusion paper
3. **SECURITY DEFINER + SET search_path = ''** -- Prevents search_path injection (T-04-16 mitigation)
4. **Tenant resolution via tenant_users** -- Consistent with RLS pattern; user's tenant_id resolved from tenant_users table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed metadata type mismatch in embed route**
- **Found during:** Task 1 (caught by tsc --noEmit)
- **Issue:** `Record<string, unknown>` from zod schema not assignable to Supabase `Json` type
- **Fix:** Import `Json` type from `@sovra/shared/types/database` and cast metadata through it
- **Files modified:** packages/web/app/api/documents/embed/route.ts
- **Commit:** 9d07bcb (included in Task 2 commit)

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| lib/vector/embed.test.ts | 5 | All passing |
| lib/vector/search.test.ts | 9 | All passing |
| **Total** | **14** | **All passing** |

## Known Stubs

None -- all functions are fully wired to real APIs (OpenAI for embeddings, Supabase RPC for search).

## Threat Mitigations Applied

| Threat ID | Mitigation | Status |
|-----------|-----------|--------|
| T-04-13 | All RPC functions require filter_tenant_id parameter | Applied |
| T-04-14 | Content validated via zod (max 50000 chars); embedding dimension asserted as 1536 | Applied |
| T-04-15 | Content size capped at 50000 chars | Applied |
| T-04-16 | SECURITY DEFINER + SET search_path = '' on both RPC functions | Applied |
| T-04-17 | Auth check (getUser) on both embed and search endpoints | Applied |

## Self-Check: PASSED

All 8 files verified present. Both commit hashes (4e41114, 9d07bcb) found in git log.
