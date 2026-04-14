-- ============================================================
-- Sovra Initial Schema
-- Phase 1 Plan 3 — 14 tables, pgvector, HNSW, RLS
-- ============================================================

-- ==========================
-- Part A: Extensions
-- ==========================

-- Enable pgvector for vector similarity search
create extension if not exists vector with schema extensions;

-- ==========================
-- Part C: Foundation tables
-- (Helper function defined after tables — it references tenant_users)
-- ==========================

-- Table 1: tenants
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  plan        text not null default 'free',
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Table 2: users
create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Table 3: tenant_users
create table tenant_users (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        text not null default 'member'
              check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at  timestamptz not null default now(),
  unique(tenant_id, user_id)
);

-- Helper function: get current user's tenant_id from JWT context
-- Defined here (after tenant_users) — references that table
-- Uses (select ...) wrapper for query-level caching (performance)
create or replace function get_current_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id
  from tenant_users
  where user_id = (select auth.uid())
  limit 1;
$$;

-- Table 4: subscriptions
create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  lemon_squeezy_id      text unique,
  plan                  text not null default 'free',
  status                text not null default 'active'
                        check (status in ('active', 'cancelled', 'past_due', 'paused')),
  current_period_end    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Table 5: agents
create table agents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  name            text not null,
  description     text,
  system_prompt   text,
  model_provider  text not null default 'openai',
  model_name      text not null default 'gpt-4o',
  temperature     numeric(3,2) not null default 0.7
                  check (temperature >= 0 and temperature <= 2),
  max_tokens      integer not null default 4096
                  check (max_tokens > 0 and max_tokens <= 128000),
  tools           jsonb not null default '[]',
  status          text not null default 'idle'
                  check (status in ('idle', 'running', 'error')),
  created_by      uuid references users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Table 6: workspaces
create table workspaces (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  name                text not null,
  description         text,
  collaboration_mode  text not null default 'round_robin'
                      check (collaboration_mode in ('round_robin', 'hierarchical', 'democratic', 'parallel')),
  conflict_resolution text not null default 'vote'
                      check (conflict_resolution in ('vote', 'hierarchy', 'consensus')),
  created_by          uuid references users(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Table 7: conversations
create table conversations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  workspace_id  uuid references workspaces(id) on delete set null,
  agent_id      uuid references agents(id) on delete set null,
  user_id       uuid references users(id) on delete set null,
  title         text,
  memory_type   text not null default 'conversation'
                check (memory_type in ('conversation', 'summary', 'vector', 'hybrid')),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Table 8: messages
create table messages (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  agent_id        uuid references agents(id) on delete set null,
  role            text not null
                  check (role in ('user', 'assistant', 'system', 'tool')),
  content         text not null,
  tool_calls      jsonb,
  tokens_used     integer,
  created_at      timestamptz not null default now()
);

-- Table 9: shared_memory
create table shared_memory (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  key           text not null,
  value         jsonb not null,
  updated_by    uuid references agents(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(workspace_id, key)
);

-- Table 10: vector_documents
create table vector_documents (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  agent_id    uuid references agents(id) on delete set null,
  content     text not null,
  metadata    jsonb not null default '{}',
  embedding   extensions.vector(1536),
  created_at  timestamptz not null default now()
);

-- Table 11: tool_executions
create table tool_executions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  agent_id        uuid references agents(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  tool_name       text not null,
  input           jsonb not null default '{}',
  output          jsonb,
  status          text not null default 'pending'
                  check (status in ('pending', 'running', 'success', 'error', 'timeout')),
  error_message   text,
  duration_ms     integer,
  cost_usd        numeric(10, 6),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- Table 12: audit_logs
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  resource    text not null,
  resource_id uuid,
  metadata    jsonb not null default '{}',
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Table 13: api_keys
create table api_keys (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  created_by      uuid references users(id),
  name            text not null,
  key_hash        text unique not null,
  key_prefix      text not null,
  permissions     jsonb not null default '[]',
  last_used_at    timestamptz,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

-- Table 14: feature_flags
create table feature_flags (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  flag_name   text not null,
  enabled     boolean not null default false,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  unique(tenant_id, flag_name)
);

-- ==========================
-- Part D: Indexes
-- ==========================

-- Tenant isolation indexes (used in every RLS policy)
create index idx_agents_tenant on agents(tenant_id);
create index idx_conversations_tenant on conversations(tenant_id);
create index idx_messages_tenant on messages(tenant_id);
create index idx_vector_documents_tenant on vector_documents(tenant_id);
create index idx_tool_executions_tenant on tool_executions(tenant_id);
create index idx_audit_logs_tenant on audit_logs(tenant_id);
create index idx_api_keys_tenant on api_keys(tenant_id);
create index idx_subscriptions_tenant on subscriptions(tenant_id);
create index idx_workspaces_tenant on workspaces(tenant_id);
create index idx_shared_memory_tenant on shared_memory(tenant_id);

-- Foreign key lookups
create index idx_messages_conversation on messages(conversation_id);
create index idx_conversations_agent on conversations(agent_id);
create index idx_tenant_users_user on tenant_users(user_id);
create index idx_tool_executions_agent on tool_executions(agent_id);
create index idx_shared_memory_workspace on shared_memory(workspace_id);

-- Time-series queries (descending for recent-first)
create index idx_messages_created_at on messages(created_at desc);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_conversations_created_at on conversations(created_at desc);

-- Vector similarity search (HNSW — works on empty tables, unlike IVFFlat)
create index idx_vector_documents_embedding on vector_documents
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ==========================
-- Part E: RLS — Enable on all tables
-- ==========================

alter table tenants enable row level security;
alter table users enable row level security;
alter table tenant_users enable row level security;
alter table subscriptions enable row level security;
alter table agents enable row level security;
alter table workspaces enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table shared_memory enable row level security;
alter table vector_documents enable row level security;
alter table tool_executions enable row level security;
alter table audit_logs enable row level security;
alter table api_keys enable row level security;
alter table feature_flags enable row level security;

-- ==========================
-- Part E: RLS Policies
-- ==========================

-- users: own profile only
create policy "users_select_own" on users
  for select to authenticated
  using (id = (select auth.uid()));

create policy "users_insert_own" on users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "users_update_own" on users
  for update to authenticated
  using (id = (select auth.uid()));

-- tenants: members can view their tenant
create policy "tenants_select_member" on tenants
  for select to authenticated
  using (id = (select get_current_tenant_id()));

create policy "tenants_insert_authenticated" on tenants
  for insert to authenticated
  with check (true);

create policy "tenants_update_owner" on tenants
  for update to authenticated
  using (id = (select get_current_tenant_id()));

-- tenant_users: members can see other members in their tenant
create policy "tenant_users_select" on tenant_users
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "tenant_users_insert" on tenant_users
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "tenant_users_delete" on tenant_users
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- subscriptions: standard tenant isolation
create policy "subscriptions_select" on subscriptions
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "subscriptions_insert" on subscriptions
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "subscriptions_update" on subscriptions
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "subscriptions_delete" on subscriptions
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- agents: standard tenant isolation
create policy "agents_select" on agents
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "agents_insert" on agents
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "agents_update" on agents
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "agents_delete" on agents
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- workspaces: standard tenant isolation
create policy "workspaces_select" on workspaces
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "workspaces_insert" on workspaces
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "workspaces_update" on workspaces
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "workspaces_delete" on workspaces
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- conversations: standard tenant isolation
create policy "conversations_select" on conversations
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "conversations_insert" on conversations
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "conversations_update" on conversations
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "conversations_delete" on conversations
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- messages: standard tenant isolation
create policy "messages_select" on messages
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "messages_insert" on messages
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "messages_update" on messages
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "messages_delete" on messages
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- shared_memory: standard tenant isolation
create policy "shared_memory_select" on shared_memory
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "shared_memory_insert" on shared_memory
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "shared_memory_update" on shared_memory
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "shared_memory_delete" on shared_memory
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- vector_documents: standard tenant isolation
create policy "vector_documents_select" on vector_documents
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "vector_documents_insert" on vector_documents
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "vector_documents_update" on vector_documents
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "vector_documents_delete" on vector_documents
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- tool_executions: standard tenant isolation
create policy "tool_executions_select" on tool_executions
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "tool_executions_insert" on tool_executions
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "tool_executions_update" on tool_executions
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "tool_executions_delete" on tool_executions
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- audit_logs: append-only (SELECT + INSERT only — no UPDATE or DELETE)
create policy "audit_logs_select" on audit_logs
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "audit_logs_insert" on audit_logs
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

-- api_keys: standard tenant isolation
create policy "api_keys_select" on api_keys
  for select to authenticated
  using (tenant_id = (select get_current_tenant_id()));

create policy "api_keys_insert" on api_keys
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "api_keys_update" on api_keys
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "api_keys_delete" on api_keys
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));

-- feature_flags: allow global flags (null tenant_id) to be read by anyone authenticated
create policy "feature_flags_select" on feature_flags
  for select to authenticated
  using (
    tenant_id is null
    or tenant_id = (select get_current_tenant_id())
  );

create policy "feature_flags_insert" on feature_flags
  for insert to authenticated
  with check (tenant_id = (select get_current_tenant_id()));

create policy "feature_flags_update" on feature_flags
  for update to authenticated
  using (tenant_id = (select get_current_tenant_id()))
  with check (tenant_id = (select get_current_tenant_id()));

create policy "feature_flags_delete" on feature_flags
  for delete to authenticated
  using (tenant_id = (select get_current_tenant_id()));
