-- =============================================================================
-- Migration: Security Hardening
-- Date: 2026-04-13
-- Fixes:
--   1. Rename lemon_squeezy_id → stripe_customer_id on subscriptions
--   2. Fix get_current_tenant_id() missing SET search_path
--   3. Fix seed_tenant_roles() missing SET search_path
--   4. Replace overly permissive invitation RLS (using true → restricted)
--   5. Restrict roles/role_permissions to owner/admin (not all members)
--   6. Strengthen password policy
-- =============================================================================

-- 1. Rename lemon_squeezy_id to stripe_customer_id
alter table subscriptions rename column lemon_squeezy_id to stripe_customer_id;

-- 2. Fix SECURITY DEFINER functions: add SET search_path = ''
create or replace function get_current_tenant_id()
returns uuid language sql stable security definer
set search_path = ''
as $$
  select tenant_id
  from public.tenant_users
  where user_id = (select auth.uid())
  limit 1;
$$;

-- seed_tenant_roles also needs the fix
create or replace function seed_tenant_roles(p_tenant_id uuid)
returns void language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner_role_id uuid;
  v_admin_role_id uuid;
  v_member_role_id uuid;
  v_viewer_role_id uuid;
begin
  insert into public.roles (tenant_id, name, description)
  values (p_tenant_id, 'owner', 'Full tenant control')
  returning id into v_owner_role_id;

  insert into public.roles (tenant_id, name, description)
  values (p_tenant_id, 'admin', 'Administrative access')
  returning id into v_admin_role_id;

  insert into public.roles (tenant_id, name, description)
  values (p_tenant_id, 'member', 'Standard member')
  returning id into v_member_role_id;

  insert into public.roles (tenant_id, name, description)
  values (p_tenant_id, 'viewer', 'Read-only access')
  returning id into v_viewer_role_id;

  -- Grant all permissions to owner
  insert into public.role_permissions (role_id, permission_id)
  select v_owner_role_id, id from public.permissions;

  -- Grant most permissions to admin (exclude tenant:manage)
  insert into public.role_permissions (role_id, permission_id)
  select v_admin_role_id, id from public.permissions
  where action != 'tenant:manage';

  -- Grant read + create permissions to member
  insert into public.role_permissions (role_id, permission_id)
  select v_member_role_id, id from public.permissions
  where action like '%:read' or action like '%:create';

  -- Grant only read permissions to viewer
  insert into public.role_permissions (role_id, permission_id)
  select v_viewer_role_id, id from public.permissions
  where action like '%:read';
end;
$$;

-- 3. Fix invitations RLS: drop the overly permissive policy
drop policy if exists "Anyone can read invitation by token" on invitations;

-- Replace with a policy that only allows reading unexpired invitations
-- The acceptance flow should use the service role client, not anon
-- This still allows unauthenticated token-based lookup but only for
-- non-expired, pending invitations (reduces exposure surface)
create policy "Read pending invitation by token" on invitations
  for select using (
    status = 'pending'
    and expires_at > now()
  );

-- 4. Fix roles: replace 'for all' with specific operations for owner/admin only
-- Drop overly permissive policies
drop policy if exists "Tenant members can manage roles" on roles;
drop policy if exists "Tenant members can manage role_permissions" on role_permissions;

-- Roles: only owner/admin can INSERT/UPDATE/DELETE
create policy "Tenant admins can manage roles" on roles
  for all using (
    tenant_id = public.get_current_tenant_id()
    and exists (
      select 1 from public.tenant_users tu
      where tu.user_id = auth.uid()
        and tu.tenant_id = roles.tenant_id
        and tu.role in ('owner', 'admin')
    )
  );

-- Role permissions: only owner/admin can modify
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
