import type { SupabaseClient } from '@supabase/supabase-js'
import type { PermissionChecker } from '@byteswarm/shared'

export class SupabasePermissionChecker implements PermissionChecker {
  constructor(private supabase: SupabaseClient) {}

  async hasPermission(userId: string, tenantId: string, action: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('tenant_users')
      .select(`
        role_id,
        roles!inner(
          role_permissions!inner(
            permissions!inner(action)
          )
        )
      `)
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('roles.role_permissions.permissions.action', action)
      .maybeSingle()

    if (error) return false
    return !!data
  }
}

export async function hasPermission(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  action: string
): Promise<boolean> {
  const checker = new SupabasePermissionChecker(supabase)
  return checker.hasPermission(userId, tenantId, action)
}
