import type { SupabaseClient } from '@supabase/supabase-js'

export async function listConversations(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string
) {
  return supabase
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .order('updated_at', { ascending: false })
}

export async function getMessages(
  supabase: SupabaseClient,
  conversationId: string
) {
  return supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
}
