-- =============================================================================
-- Migration: Security Sweep 3 Fixes
-- Date: 2026-04-14
-- Fixes:
--   F1: Invitation token SELECT policy too broad (any user can enumerate tokens)
--   F2: tenant_users INSERT allows self-escalation to owner
--   F5: feature_flags RLS not updated to multi-tenant function
--   F9: subscriptions policies use old single-tenant function
--   F10: role_permissions SELECT still uses old function
--   F11: audit_logs INSERT too permissive (restrict to service role)
--   F15: Drop ALL stale initial-schema RLS policies that used old function
-- =============================================================================

-- =============================================
-- F1: Fix invitation token enumeration
-- The old policy lets ANY authenticated user read ALL pending invitations.
-- Replace with a policy that requires knowing the token (via RPC) or service role.
-- =============================================
drop policy if exists "Read pending invitation by token" on invitations;

-- Only the invitation creator (via tenant membership) can list invitations
create policy "Tenant members can read own invitations" on invitations
  for select using (
    tenant_id in (select public.get_user_tenant_ids())
  );

-- Token-based lookup is done via service role in acceptInvitation, not via RLS

-- =============================================
-- F2: Fix tenant_users self-escalation
-- Drop the INSERT policy that lets any member insert with any role.
-- Insertions should ONLY happen via service role (tenant creation + invite acceptance).
-- =============================================
drop policy if exists "tenant_users_insert" on tenant_users;
drop policy if exists "tenant_users_delete" on tenant_users;

-- Only owners/admins can remove members (not self-delete to bypass and re-insert as owner)
create policy "Tenant admins can delete members" on tenant_users
  for delete using (
    tenant_id in (select public.get_user_tenant_ids())
    and exists (
      select 1 from public.tenant_users tu
      where tu.user_id = auth.uid()
        and tu.tenant_id = tenant_users.tenant_id
        and tu.role in ('owner', 'admin')
    )
  );

-- Explicit UPDATE policy: only owners can change roles, never your own
create policy "Tenant owners can update member roles" on tenant_users
  for update using (
    tenant_id in (select public.get_user_tenant_ids())
    and exists (
      select 1 from public.tenant_users tu
      where tu.user_id = auth.uid()
        and tu.tenant_id = tenant_users.tenant_id
        and tu.role = 'owner'
    )
    and user_id != auth.uid()  -- cannot change your own role
  );

-- =============================================
-- F5: Fix feature_flags RLS to use multi-tenant function
-- =============================================
drop policy if exists "feature_flags_select" on feature_flags;
drop policy if exists "feature_flags_insert" on feature_flags;
drop policy if exists "feature_flags_update" on feature_flags;
drop policy if exists "feature_flags_delete" on feature_flags;

create policy "feature_flags_select" on feature_flags
  for select using (
    tenant_id is null or tenant_id in (select public.get_user_tenant_ids())
  );

create policy "feature_flags_insert" on feature_flags
  for insert with check (tenant_id in (select public.get_user_tenant_ids()));

create policy "feature_flags_update" on feature_flags
  for update using (tenant_id in (select public.get_user_tenant_ids()));

create policy "feature_flags_delete" on feature_flags
  for delete using (tenant_id in (select public.get_user_tenant_ids()));

-- =============================================
-- F9: Fix subscriptions policies
-- =============================================
drop policy if exists "subscriptions_select" on subscriptions;
drop policy if exists "subscriptions_insert" on subscriptions;
drop policy if exists "subscriptions_update" on subscriptions;
drop policy if exists "subscriptions_delete" on subscriptions;
-- Also drop the one from security_audit_fixes if it exists
drop policy if exists "Tenant members can read subscriptions" on subscriptions;

create policy "Tenant members can read subscriptions" on subscriptions
  for select using (tenant_id in (select public.get_user_tenant_ids()));

-- INSERT/UPDATE/DELETE on subscriptions should only be via service role (Stripe webhooks)
-- No authenticated user policies for writes

-- =============================================
-- F10: Fix role_permissions SELECT policy
-- =============================================
drop policy if exists "role_permissions_select" on role_permissions;
drop policy if exists "Tenant admins can manage role_permissions" on role_permissions;

create policy "Tenant members can read role_permissions" on role_permissions
  for select using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and r.tenant_id in (select public.get_user_tenant_ids())
    )
  );

create policy "Tenant admins can manage role_permissions" on role_permissions
  for all using (
    exists (
      select 1 from public.roles r
      join public.tenant_users tu on tu.tenant_id = r.tenant_id
      where r.id = role_permissions.role_id
        and tu.user_id = auth.uid()
        and tu.role in ('owner', 'admin')
    )
  );

-- =============================================
-- F11: Remove INSERT policy on audit_logs for authenticated users
-- Audit log writes should only happen via service role
-- =============================================
drop policy if exists "audit_logs_insert" on audit_logs;
drop policy if exists "Tenant members can insert audit_logs" on audit_logs;

-- =============================================
-- F15: Drop ALL stale initial-schema policies that used old function
-- These have names like "tablename_operation" from the initial migration
-- =============================================
drop policy if exists "tenants_select" on tenants;
drop policy if exists "tenants_update" on tenants;
drop policy if exists "agents_select" on agents;
drop policy if exists "agents_insert" on agents;
drop policy if exists "agents_update" on agents;
drop policy if exists "agents_delete" on agents;
drop policy if exists "conversations_select" on conversations;
drop policy if exists "conversations_insert" on conversations;
drop policy if exists "conversations_delete" on conversations;
drop policy if exists "messages_select" on messages;
drop policy if exists "messages_insert" on messages;
drop policy if exists "workspaces_select" on workspaces;
drop policy if exists "workspaces_insert" on workspaces;
drop policy if exists "workspaces_update" on workspaces;
drop policy if exists "workspaces_delete" on workspaces;
drop policy if exists "workspace_agents_select" on workspace_agents;
drop policy if exists "workspace_agents_insert" on workspace_agents;
drop policy if exists "workspace_agents_delete" on workspace_agents;
drop policy if exists "shared_memory_select" on shared_memory;
drop policy if exists "shared_memory_insert" on shared_memory;
drop policy if exists "shared_memory_update" on shared_memory;
drop policy if exists "tool_executions_select" on tool_executions;
drop policy if exists "tool_executions_insert" on tool_executions;
drop policy if exists "vector_documents_select" on vector_documents;
drop policy if exists "vector_documents_insert" on vector_documents;
drop policy if exists "api_keys_select" on api_keys;
drop policy if exists "api_keys_insert" on api_keys;
drop policy if exists "api_keys_delete" on api_keys;
drop policy if exists "audit_logs_select" on audit_logs;

-- =============================================
-- F6: Add tenant creation limit (max 10 per user)
-- Enforced via check function
-- =============================================
create or replace function check_tenant_limit()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.tenant_users
  where user_id = new.user_id;

  if v_count >= 10 then
    raise exception 'User has reached the maximum number of tenants (10)';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_tenant_limit on tenant_users;
create trigger enforce_tenant_limit
  before insert on tenant_users
  for each row execute function check_tenant_limit();
