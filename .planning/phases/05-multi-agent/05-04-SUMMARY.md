---
phase: 05-multi-agent
plan: 04
subsystem: workspace-orchestrator
tags: [orchestrator, multi-agent, broadcast, conflict-resolution, api-route]
dependency_graph:
  requires:
    - "05-01: workspace types, shared memory"
    - "05-02: Go worker /internal/broadcast endpoint"
  provides:
    - "runWorkspace: drives all 5 collaboration modes"
    - "broadcastToWorkspace: HTTP client to Go worker Socket.IO"
    - "resolveConflict: vote / hierarchy / consensus strategies"
    - "POST /api/workspaces/[id]/run: authenticated orchestration trigger"
  affects:
    - "05-05: UI components will call /api/workspaces/[id]/run"
    - "05-03: memory/types.ts stub will be replaced by full implementation"
tech_stack:
  added:
    - "ai.generateText: non-streaming agent turns in orchestrator"
  patterns:
    - "TDD: tests written before implementation, all green"
    - "Dynamic import: conflict.ts lazy-loaded in parallel/democratic modes"
    - "Promise.all with MAX_PARALLEL_AGENTS=20 cap for DoS mitigation"
key_files:
  created:
    - packages/web/lib/workspace/broadcast.ts
    - packages/web/lib/workspace/orchestrator.ts
    - packages/web/lib/workspace/conflict.ts
    - packages/web/lib/memory/types.ts
    - packages/web/app/api/workspaces/[id]/run/route.ts
    - packages/web/lib/workspace/__tests__/orchestrator.test.ts
    - packages/web/lib/workspace/__tests__/conflict.test.ts
  modified: []
decisions:
  - "Used generateText (not streamText) for agent-to-agent turns — streaming is for client-facing responses, not internal orchestration"
  - "Lazy import of conflict.ts in parallel/democratic modes — avoids circular dependency in test environment"
  - "Created packages/web/lib/memory/types.ts stub — 05-03 not yet executed, needed to unblock orchestrator"
  - "runSequential delegates to runRoundRobin after sorting — avoids code duplication"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-04-12"
  tasks: 2
  files: 7
---

# Phase 05 Plan 04: Workspace Orchestrator Summary

**One-liner:** Multi-agent workspace orchestrator with 5 collaboration modes, broadcast HTTP client to Go worker, and conflict resolution via vote/hierarchy/consensus.

## What Was Built

### broadcast.ts
HTTP client posting to Go worker `/internal/broadcast` endpoint. Exports `broadcastToWorkspace`, `broadcastAgentStatus`, `broadcastAgentMessage`, `broadcastAgentChunk`, `broadcastAgentDone`. Agent status transitions (`running` → `idle`) broadcast in real-time around each agent turn.

### orchestrator.ts
Core orchestration engine. `runSingleAgent` handles one agent turn: broadcasts `running`, builds context via `buildContextMessages`, calls `generateText`, broadcasts the output message, updates DB status, broadcasts `idle`. Five modes:
- `runRoundRobin`: chains output of each agent as input to next
- `runParallel`: concurrent `Promise.all` (capped at 20 agents)
- `runSequential`: sorts by position, delegates to round-robin
- `runHierarchical`: leader runs first, members receive leader output
- `runDemocratic`: parallel then applies conflict resolution
`runWorkspace` is the public entry — fetches workspace + agents, routes to correct mode, stores `last_result` in shared memory.

### conflict.ts
Three resolution strategies:
- `resolveByVote`: exact-match grouping, majority wins, first-occurrence tie-break
- `resolveByHierarchy`: finds `role === 'leader'`, falls back to first response
- `resolveByConsensus`: unanimous check, falls back to vote if disagreement
`resolveConflict` dispatches by `ConflictResolutionMode`.

### packages/web/app/api/workspaces/[id]/run/route.ts
POST endpoint. Auth via Supabase session (returns 401 if no user). Validates prompt is non-empty string (400 on failure). Calls `runWorkspace`. Returns JSON `{ result }` on success, `{ error: message }` on 500.

### packages/web/lib/memory/types.ts (stub)
Minimal `buildContextMessages` returning `[{ role: 'user', content: prompt }]`. This unblocks the orchestrator until plan 05-03 (full memory strategies) executes. Will be replaced by 05-03's full implementation.

## Test Results

| Test Suite | Tests | Result |
|------------|-------|--------|
| orchestrator.test.ts | 8 | PASS |
| conflict.test.ts | 11 | PASS |
| shared-memory.test.ts | (pre-existing) | PASS |
| actions.test.ts | (pre-existing) | PASS |
| queries.test.ts | (pre-existing) | PASS |
| types.test.ts | (pre-existing) | PASS |
| **Total** | **45** | **ALL PASS** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing packages/web/lib/memory/types.ts (05-03 not yet executed)**
- **Found during:** Task 1 — orchestrator imports `buildContextMessages` from `@/lib/memory/types`
- **Issue:** Plan 05-03 (memory strategies) was not executed before this plan. The import was required for orchestrator tests to run.
- **Fix:** Created minimal stub at `packages/web/lib/memory/types.ts` that returns `[{ role: 'user', content: prompt }]`. Stub will be replaced when 05-03 executes.
- **Files modified:** `packages/web/lib/memory/types.ts` (new file)
- **Commit:** 702aecc

**2. [Rule 3 - Blocking] conflict.ts needed before orchestrator tests could run**
- **Found during:** Task 1 — orchestrator imports `./conflict` dynamically; vitest resolved the import at test time causing a load error
- **Fix:** Created `conflict.ts` during Task 1 before running orchestrator tests. This was planned for Task 2 anyway — just executed slightly earlier.
- **Files modified:** `packages/web/lib/workspace/conflict.ts` (new file)
- **Commit:** 702aecc

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `buildContextMessages` returns minimal `[user: prompt]` | `packages/web/lib/memory/types.ts` | 05-03 not yet executed. Full conversation/summary/vector/hybrid strategies are out of scope for this plan. |

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|-----------|
| T-05-12 | Auth check in API route — 401 if no Supabase session |
| T-05-14 | `MAX_PARALLEL_AGENTS = 20` cap in `runParallel` |
| T-05-15 | RLS enforced by Supabase — workspace fetch fails for non-tenant members |

## Self-Check: PASSED

Files exist:
- packages/web/lib/workspace/broadcast.ts: FOUND
- packages/web/lib/workspace/orchestrator.ts: FOUND
- packages/web/lib/workspace/conflict.ts: FOUND
- packages/web/lib/memory/types.ts: FOUND
- packages/web/app/api/workspaces/[id]/run/route.ts: FOUND
- packages/web/lib/workspace/__tests__/orchestrator.test.ts: FOUND
- packages/web/lib/workspace/__tests__/conflict.test.ts: FOUND

Commits exist:
- 702aecc: feat(05-04): broadcast client, workspace orchestrator, and memory stub
- b80ed66: feat(05-04): conflict resolution strategies and workspace run API route
