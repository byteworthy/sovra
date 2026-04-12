---
phase: 05-multi-agent
plan: 01
subsystem: workspace-data-layer
tags: [database, migrations, types, server-actions, shared-memory, rls, tdd]
dependency_graph:
  requires: []
  provides:
    - workspace_agents join table (DB)
    - workspace types and zod schemas
    - workspace CRUD server actions
    - workspace server queries
    - shared memory read/write/upsert
  affects:
    - 05-02 (orchestrator consumes workspace types + actions)
    - 05-03 (UI consumes queries + actions)
    - 05-04 (real-time consumes shared memory)
tech_stack:
  added:
    - packages/web/lib/workspace/ (new module)
  patterns:
    - TDD (RED -> GREEN per task)
    - Server actions with 'use server' directive
    - Supabase RLS via user session client (never service role)
    - zod schema validation at action boundary
    - ON CONFLICT upsert for idempotent shared memory writes
key_files:
  created:
    - supabase/migrations/20260412200000_phase5_workspace_agents.sql
    - packages/web/lib/workspace/types.ts
    - packages/web/lib/workspace/actions.ts
    - packages/web/lib/workspace/queries.ts
    - packages/web/lib/workspace/shared-memory.ts
    - packages/web/lib/workspace/__tests__/types.test.ts
    - packages/web/lib/workspace/__tests__/actions.test.ts
    - packages/web/lib/workspace/__tests__/queries.test.ts
    - packages/web/lib/workspace/__tests__/shared-memory.test.ts
  modified: []
decisions:
  - "Used workspaceFormSchema.parse() at action boundary to validate all workspace input before any DB operation (T-05-01 mitigation)"
  - "All queries use createSupabaseServerClient (user session + RLS) — never service role key"
  - "64KB value cap on shared memory enforced in both writeSharedMemory and upsertSharedMemory"
  - "workspace_agents role constrained to ('leader', 'member') via DB CHECK + validated in types"
  - "DROP CONSTRAINT + ADD CONSTRAINT pattern used to extend collaboration_mode to include 'sequential'"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 0
  tests_added: 26
  tests_passing: 26
---

# Phase 5 Plan 01: Workspace Data Layer Summary

**One-liner:** workspace_agents join table with RLS + full TypeScript workspace module (types, CRUD actions, queries, shared memory) with 26 passing TDD tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Database migration + workspace types and zod schemas | 2ebf31a | migration SQL, types.ts, types.test.ts |
| 2 | Workspace CRUD actions + queries + shared memory + tests | cd025c3 | actions.ts, queries.ts, shared-memory.ts, 3 test files |

## What Was Built

### Database Migration (`20260412200000_phase5_workspace_agents.sql`)
- `workspace_agents` join table: `id, tenant_id, workspace_id, agent_id, role CHECK('leader','member'), position, created_at, UNIQUE(workspace_id, agent_id)`
- `workspaces` table extended: `memory_strategy CHECK('conversation','summary','vector','hybrid')`, `compression_enabled`, `compression_threshold`
- `collaboration_mode` constraint extended to include `'sequential'`
- RLS enabled on `workspace_agents` with 4 policies (SELECT/INSERT/UPDATE/DELETE), all tenant-scoped via `get_current_tenant_id()`
- Indexes: `idx_workspace_agents_workspace`, `idx_workspace_agents_tenant`, `idx_workspace_agents_agent`

### Types (`packages/web/lib/workspace/types.ts`)
- `COLLABORATION_MODES`: round_robin, parallel, sequential, hierarchical, democratic
- `MEMORY_STRATEGIES`: conversation, summary, vector, hybrid
- `CONFLICT_RESOLUTIONS`, `AGENT_ROLES`
- Interfaces: `Workspace`, `WorkspaceAgent`, `SharedMemoryEntry`
- `workspaceFormSchema` (zod): name, description, collaboration_mode, memory_strategy, conflict_resolution, compression_enabled, compression_threshold, agent_ids (uuid array)

### Actions (`packages/web/lib/workspace/actions.ts`)
- `createWorkspace(tenantId, formData)`: validates with schema, inserts workspace, bulk-inserts workspace_agents for agent_ids
- `updateWorkspace(id, data)`: updates workspace fields, re-syncs agent list if agent_ids provided
- `deleteWorkspace(id)`: deletes workspace (FK cascade handles workspace_agents)
- `addAgentToWorkspace(workspaceId, agentId, role?, position?)`: tenant-safe single agent insert
- `removeAgentFromWorkspace(workspaceId, agentId)`: removes by workspace_id + agent_id

### Queries (`packages/web/lib/workspace/queries.ts`)
- `getWorkspaces()`: all workspaces for tenant, ordered by created_at desc
- `getWorkspaceById(id)`: workspace with workspace_agents + agents joined
- `getWorkspaceAgents(workspaceId)`: agents ordered by position asc

### Shared Memory (`packages/web/lib/workspace/shared-memory.ts`)
- `readSharedMemory(workspaceId)`: all entries ordered by updated_at desc
- `writeSharedMemory(workspaceId, key, value, agentId?)`: insert with 64KB cap validation
- `upsertSharedMemory(workspaceId, key, value, agentId?)`: upsert with `onConflict: 'workspace_id,key'`, 64KB cap enforced

## Test Results

```
Test Files  4 passed (4)
     Tests  26 passed (26)
```

- `types.test.ts`: 13 tests — schema validation, CollaborationMode values, MemoryStrategy values
- `actions.test.ts`: 6 tests — createWorkspace, updateWorkspace, deleteWorkspace, addAgent, removeAgent
- `queries.test.ts`: 3 tests — getWorkspaces, getWorkspaceById, getWorkspaceAgents
- `shared-memory.test.ts`: 4 tests — readSharedMemory, writeSharedMemory (including 64KB rejection), upsertSharedMemory

## Deviations from Plan

None - plan executed exactly as written.

## Threat Model Mitigations Applied

| Threat | Mitigation |
|--------|-----------|
| T-05-01: workspace form input tampering | `workspaceFormSchema.parse()` called at action boundary before any DB op |
| T-05-02: cross-tenant workspace access | RLS on `workspace_agents`; all queries use user session client |
| T-05-03: shared_memory value injection | 64KB cap validated in both `writeSharedMemory` and `upsertSharedMemory` |
| T-05-04: workspace_agents role escalation | `role CHECK('leader','member')` in DB + `AGENT_ROLES` const in types |

## Self-Check: PASSED

- supabase/migrations/20260412200000_phase5_workspace_agents.sql: FOUND
- packages/web/lib/workspace/types.ts: FOUND
- packages/web/lib/workspace/actions.ts: FOUND
- packages/web/lib/workspace/queries.ts: FOUND
- packages/web/lib/workspace/shared-memory.ts: FOUND
- packages/web/lib/workspace/__tests__/types.test.ts: FOUND
- packages/web/lib/workspace/__tests__/actions.test.ts: FOUND
- packages/web/lib/workspace/__tests__/queries.test.ts: FOUND
- packages/web/lib/workspace/__tests__/shared-memory.test.ts: FOUND
- Commit 2ebf31a: FOUND
- Commit cd025c3: FOUND
