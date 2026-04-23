import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@sovra/shared'

export async function listAgents(supabase: SupabaseClient<Database>, tenantId: string) {
  return supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
}

export async function getAgent(supabase: SupabaseClient<Database>, agentId: string) {
  return supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
}
