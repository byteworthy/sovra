'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { hasPermission } from '@/lib/rbac/checker'
import { agentFormSchema } from '@/lib/agent/types'

interface AgentResult {
  agent: Record<string, unknown> | null
  error: string | null
}

interface DeleteResult {
  error: string | null
}

export async function createAgent(
  tenantId: string,
  formData: unknown
): Promise<AgentResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { agent: null, error: 'Not authenticated' }

  const allowed = await hasPermission(supabase, user.id, tenantId, 'agent:create')
  if (!allowed) return { agent: null, error: 'Forbidden' }

  const parsed = agentFormSchema.parse(formData)

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      tenant_id: tenantId,
      created_by: user.id,
      name: parsed.name,
      description: parsed.description ?? null,
      system_prompt: parsed.system_prompt ?? null,
      model_provider: parsed.model_provider,
      model_name: parsed.model_name,
      temperature: parsed.temperature,
      max_tokens: parsed.max_tokens,
      tools: parsed.tools,
    })
    .select('*')
    .single()

  if (error) return { agent: null, error: error.message }

  revalidatePath('/t/[slug]/agents')
  return { agent, error: null }
}

export async function updateAgent(
  tenantId: string,
  agentId: string,
  formData: unknown
): Promise<AgentResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { agent: null, error: 'Not authenticated' }

  const allowed = await hasPermission(supabase, user.id, tenantId, 'agent:update')
  if (!allowed) return { agent: null, error: 'Forbidden' }

  const parsed = agentFormSchema.parse(formData)

  const { data: agent, error } = await supabase
    .from('agents')
    .update({
      name: parsed.name,
      description: parsed.description ?? null,
      system_prompt: parsed.system_prompt ?? null,
      model_provider: parsed.model_provider,
      model_name: parsed.model_name,
      temperature: parsed.temperature,
      max_tokens: parsed.max_tokens,
      tools: parsed.tools,
    })
    .eq('id', agentId)
    .select('*')
    .single()

  if (error) return { agent: null, error: error.message }

  revalidatePath('/t/[slug]/agents')
  return { agent, error: null }
}

export async function deleteAgent(
  tenantId: string,
  agentId: string
): Promise<DeleteResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const allowed = await hasPermission(supabase, user.id, tenantId, 'agent:delete')
  if (!allowed) return { error: 'Forbidden' }

  const { error } = await supabase
    .from('agents')
    .delete()
    .eq('id', agentId)
    .eq('tenant_id', tenantId)

  if (error) return { error: error.message }

  revalidatePath('/t/[slug]/agents')
  return { error: null }
}
