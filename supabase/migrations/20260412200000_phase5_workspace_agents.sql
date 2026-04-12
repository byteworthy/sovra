-- ============================================================
-- Phase 5 Migration: workspace_agents join table + workspace enhancements
-- ============================================================

-- Add memory_strategy column to workspaces
alter table workspaces
  add column memory_strategy text not null default 'conversation'
  check (memory_strategy in ('conversation', 'summary', 'vector', 'hybrid'));

-- Add compression settings to workspaces
alter table workspaces
  add column compression_enabled boolean not null default true;

alter table workspaces
  add column compression_threshold integer not null default 80;

-- Update collaboration_mode check to include 'sequential'
alter table workspaces
  drop constraint if exists workspaces_collaboration_mode_check;

alter table workspaces
  add constraint workspaces_collaboration_mode_check
  check (collaboration_mode in ('round_robin', 'hierarchical', 'democratic', 'parallel', 'sequential'));

-- Table: workspace_agents (join table for agent assignment)
create table workspace_agents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  agent_id      uuid not null references agents(id) on delete cascade,
  role          text not null default 'member'
                check (role in ('leader', 'member')),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique(workspace_id, agent_id)
);

-- Indexes for workspace_agents
create index idx_workspace_agents_workspace on workspace_agents(workspace_id);
create index idx_workspace_agents_tenant on workspace_agents(tenant_id);
create index idx_workspace_agents_agent on workspace_agents(agent_id);

-- RLS for workspace_agents
alter table workspace_agents enable row level security;

create policy "workspace_agents_select" on workspace_agents
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "workspace_agents_insert" on workspace_agents
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "workspace_agents_update" on workspace_agents
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "workspace_agents_delete" on workspace_agents
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));
