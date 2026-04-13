import type { Json } from '@byteswarm/shared/types/database'
import { createSupabaseServerClient } from '@/lib/auth/server'

const MAX_VALUE_BYTES = 65536 // 64KB

function validateValueSize(value: unknown): string | null {
  const serialized = JSON.stringify(value)
  if (serialized.length > MAX_VALUE_BYTES) {
    return `Shared memory value exceeds 64KB limit (${serialized.length} bytes)`
  }
  return null
}

interface MemoryResult {
  data: unknown
  error: string | null
}

export async function readSharedMemory(workspaceId: string): Promise<MemoryResult> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('shared_memory')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function writeSharedMemory(
  workspaceId: string,
  key: string,
  value: unknown,
  agentId?: string
): Promise<MemoryResult> {
  const sizeError = validateValueSize(value)
  if (sizeError) return { data: null, error: sizeError }

  const supabase = await createSupabaseServerClient()

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError) return { data: null, error: workspaceError.message }

  const tenantId = (workspace as Record<string, unknown>).tenant_id as string

  const { data, error } = await supabase
    .from('shared_memory')
    .insert({
      tenant_id: tenantId,
      workspace_id: workspaceId,
      key,
      value: value as Json,
      updated_by: agentId ?? null,
    })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function upsertSharedMemory(
  workspaceId: string,
  key: string,
  value: unknown,
  agentId?: string
): Promise<MemoryResult> {
  const sizeError = validateValueSize(value)
  if (sizeError) return { data: null, error: sizeError }

  const supabase = await createSupabaseServerClient()

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError) return { data: null, error: workspaceError.message }

  const tenantId = (workspace as Record<string, unknown>).tenant_id as string

  const { data, error } = await supabase
    .from('shared_memory')
    .upsert(
      {
        tenant_id: tenantId,
        workspace_id: workspaceId,
        key,
        value: value as Json,
        updated_by: agentId ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,key' }
    )

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
