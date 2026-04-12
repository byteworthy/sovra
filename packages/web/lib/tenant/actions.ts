'use server'

import { createSupabaseServerClient } from '@/lib/auth/server'

interface CreateTenantInput {
  name: string
  slug: string
}

interface CreateTenantResult {
  tenant: { id: string; slug: string; name: string } | null
  error: string | null
}

export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { tenant: null, error: 'Not authenticated' }

  // Insert tenant row
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({ name: input.name, slug: input.slug })
    .select('id, slug, name')
    .single()

  if (tenantError) {
    if (tenantError.code === '23505') return { tenant: null, error: 'Slug already taken' }
    return { tenant: null, error: tenantError.message }
  }

  // Provision default roles for this tenant
  const { error: seedError } = await supabase.rpc('seed_tenant_roles', { p_tenant_id: tenant.id })
  if (seedError) return { tenant: null, error: `Failed to seed roles: ${seedError.message}` }

  // Resolve the owner role ID for this tenant
  const { data: ownerRole } = await supabase
    .from('roles')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('name', 'owner')
    .single()

  // Add creator as owner member
  const { error: memberError } = await supabase.from('tenant_users').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
    role_id: ownerRole?.id ?? null,
  })

  if (memberError) return { tenant: null, error: memberError.message }

  return { tenant, error: null }
}
