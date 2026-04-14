-- =============================================================================
-- Migration: Security Audit Fixes
-- Date: 2026-04-14
-- Fixes:
--   C-1: get_current_tenant_id() only returns one tenant — breaks multi-tenant
--   H-4: Invitation race condition on max_uses
-- =============================================================================

-- C-1: Replace get_current_tenant_id() with a set-returning function
-- The old LIMIT 1 version breaks RLS for users who belong to multiple tenants.
-- New approach: RLS policies use IN (SELECT ...) instead of = get_current_tenant_id()

-- Keep the function for backwards compatibility but make it return all tenant IDs
create or replace function get_user_tenant_ids()
returns setof uuid language sql stable security definer
set search_path = ''
as $$
  select tenant_id
  from public.tenant_users
  where user_id = (select auth.uid());
$$;

-- Update ALL RLS policies that used get_current_tenant_id() to use the set-returning function
-- This ensures users in multiple tenants see data for ALL their tenants

-- tenants
drop policy if exists "Tenant members can read own tenant" on tenants;
create policy "Tenant members can read own tenant" on tenants
  for select using (id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can update own tenant" on tenants;
create policy "Tenant members can update own tenant" on tenants
  for update using (id in (select public.get_user_tenant_ids()));

-- agents
drop policy if exists "Tenant members can read agents" on agents;
create policy "Tenant members can read agents" on agents
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert agents" on agents;
create policy "Tenant members can insert agents" on agents
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can update agents" on agents;
create policy "Tenant members can update agents" on agents
  for update using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can delete agents" on agents;
create policy "Tenant members can delete agents" on agents
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- conversations
drop policy if exists "Tenant members can read conversations" on conversations;
create policy "Tenant members can read conversations" on conversations
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert conversations" on conversations;
create policy "Tenant members can insert conversations" on conversations
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can delete conversations" on conversations;
create policy "Tenant members can delete conversations" on conversations
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- messages
drop policy if exists "Tenant members can read messages" on messages;
create policy "Tenant members can read messages" on messages
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert messages" on messages;
create policy "Tenant members can insert messages" on messages
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

-- workspaces
drop policy if exists "Tenant members can read workspaces" on workspaces;
create policy "Tenant members can read workspaces" on workspaces
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert workspaces" on workspaces;
create policy "Tenant members can insert workspaces" on workspaces
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can update workspaces" on workspaces;
create policy "Tenant members can update workspaces" on workspaces
  for update using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can delete workspaces" on workspaces;
create policy "Tenant members can delete workspaces" on workspaces
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- workspace_agents
drop policy if exists "Tenant members can read workspace_agents" on workspace_agents;
create policy "Tenant members can read workspace_agents" on workspace_agents
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert workspace_agents" on workspace_agents;
create policy "Tenant members can insert workspace_agents" on workspace_agents
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can delete workspace_agents" on workspace_agents;
create policy "Tenant members can delete workspace_agents" on workspace_agents
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- shared_memory
drop policy if exists "Tenant members can read shared_memory" on shared_memory;
create policy "Tenant members can read shared_memory" on shared_memory
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert shared_memory" on shared_memory;
create policy "Tenant members can insert shared_memory" on shared_memory
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can update shared_memory" on shared_memory;
create policy "Tenant members can update shared_memory" on shared_memory
  for update using (tenant_id in (select public.get_user_tenant_ids()));

-- tool_executions
drop policy if exists "Tenant members can read tool_executions" on tool_executions;
create policy "Tenant members can read tool_executions" on tool_executions
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert tool_executions" on tool_executions;
create policy "Tenant members can insert tool_executions" on tool_executions
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

-- vector_documents
drop policy if exists "Tenant members can read vector_documents" on vector_documents;
create policy "Tenant members can read vector_documents" on vector_documents
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert vector_documents" on vector_documents;
create policy "Tenant members can insert vector_documents" on vector_documents
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

-- audit_logs
drop policy if exists "Tenant members can read audit_logs" on audit_logs;
create policy "Tenant members can read audit_logs" on audit_logs
  for select using (
    tenant_id is null  -- platform-level logs visible to admins via service role
    or tenant_id in (select public.get_user_tenant_ids())
  );

drop policy if exists "Tenant members can insert audit_logs" on audit_logs;
create policy "Tenant members can insert audit_logs" on audit_logs
  for insert with check (
    tenant_id is null
    or tenant_id in (select public.get_user_tenant_ids())
  );

-- subscriptions
drop policy if exists "Tenant members can read subscriptions" on subscriptions;
create policy "Tenant members can read subscriptions" on subscriptions
  for select using (tenant_id in (select public.get_user_tenant_ids()));

-- api_keys
drop policy if exists "Tenant members can read api_keys" on api_keys;
create policy "Tenant members can read api_keys" on api_keys
  for select using (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can insert api_keys" on api_keys;
create policy "Tenant members can insert api_keys" on api_keys
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

drop policy if exists "Tenant members can delete api_keys" on api_keys;
create policy "Tenant members can delete api_keys" on api_keys
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- roles (keep the admin-only policy from security_hardening but update function)
drop policy if exists "Tenant admins can manage roles" on roles;
create policy "Tenant admins can manage roles" on roles
  for all using (
    tenant_id in (select public.get_user_tenant_ids())
    and exists (
      select 1 from public.tenant_users tu
      where tu.user_id = auth.uid()
        and tu.tenant_id = roles.tenant_id
        and tu.role in ('owner', 'admin')
    )
  );

-- Also allow all members to READ roles (needed for UI)
drop policy if exists "Tenant members can read roles" on roles;
create policy "Tenant members can read roles" on roles
  for select using (tenant_id in (select public.get_user_tenant_ids()));

-- tenant_users: members can read their own tenant's members
drop policy if exists "Tenant members can read tenant_users" on tenant_users;
create policy "Tenant members can read tenant_users" on tenant_users
  for select using (tenant_id in (select public.get_user_tenant_ids()));

-- H-4: Atomic invitation acceptance to prevent race condition
create or replace function accept_invitation_atomic(p_invitation_id uuid)
returns boolean language plpgsql security definer
set search_path = ''
as $$
declare
  v_updated boolean;
begin
  update public.invitations
  set use_count = use_count + 1
  where id = p_invitation_id
    and status = 'pending'
    and (max_uses is null or use_count < max_uses)
    and expires_at > now();

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;
