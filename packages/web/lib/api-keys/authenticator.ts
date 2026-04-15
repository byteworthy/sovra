import { timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hashApiKey } from './hash'

export type ApiKeyAuthResult =
  | { valid: true; tenantId: string; permissions: string[] }
  | { valid: false }

export async function authenticateApiKey(
  supabase: Pick<SupabaseClient, 'from'>,
  rawKey: string
): Promise<ApiKeyAuthResult> {
  if (!rawKey.startsWith('bsk_')) {
    return { valid: false }
  }

  const prefix = rawKey.slice(0, 12)
  const hash = hashApiKey(rawKey)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, tenant_id, permissions, expires_at, revoked_at')
    .eq('key_prefix', prefix)
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single()

  if (error || !data) {
    return { valid: false }
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false }
  }

  if (data.revoked_at) {
    return { valid: false }
  }

  // Fire-and-forget last_used_at update - non-blocking
  void supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    valid: true,
    tenantId: data.tenant_id,
    permissions: data.permissions ?? [],
  }
}

// Re-export for convenience
export { timingSafeEqual }
