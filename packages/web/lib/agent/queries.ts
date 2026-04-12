import type { SupabaseClient } from '@supabase/supabase-js'

export async function listAgents(supabase: SupabaseClient, tenantId: string) {
  return supabase
    .from('agents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
}

export async function getAgent(supabase: SupabaseClient, agentId: string) {
  return supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single()
}
