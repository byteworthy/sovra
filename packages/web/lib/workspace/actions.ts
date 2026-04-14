'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { workspaceFormSchema, type WorkspaceFormData, type AgentRole } from './types'
import { hasPermission } from '@/lib/rbac/checker'

interface WorkspaceResult {
  data: Record<string, unknown> | null
  error: string | null
}

interface DeleteResult {
  error: string | null
}

interface AgentAssignResult {
  data: Record<string, unknown> | null
  error: string | null
}

export async function createWorkspace(
  tenantId: string,
  formData: unknown
): Promise<WorkspaceResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const allowed = await hasPermission(supabase, user.id, tenantId, 'workspace:create')
  if (!allowed) return { data: null, error: 'Forbidden' }

  const parsed = workspaceFormSchema.parse(formData)
  const { agent_ids, ...workspaceFields } = parsed

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      tenant_id: tenantId,
      name: workspaceFields.name,
      description: workspaceFields.description ?? null,
      collaboration_mode: workspaceFields.collaboration_mode,
      memory_strategy: workspaceFields.memory_strategy,
      conflict_resolution: workspaceFields.conflict_resolution,
      compression_enabled: workspaceFields.compression_enabled,
      compression_threshold: workspaceFields.compression_threshold,
    })
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }

  if (agent_ids.length > 0) {
    const wsId = (workspace as Record<string, unknown>).id as string
    const agentRows = agent_ids.map((agentId, index) => ({
      workspace_id: wsId,
      agent_id: agentId,
      tenant_id: tenantId,
      role: 'member' as AgentRole,
      position: index,
    }))

    const { error: agentError } = await supabase
      .from('workspace_agents')
      .insert(agentRows)

    if (agentError) return { data: null, error: agentError.message }
  }

  revalidatePath('/t/[slug]/workspaces')
  return { data: workspace as Record<string, unknown>, error: null }
}

export async function updateWorkspace(
  id: string,
  data: Partial<WorkspaceFormData>
): Promise<WorkspaceResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { agent_ids, ...workspaceFields } = data

  // Verify tenant membership before update
  const { data: existing } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!existing) return { data: null, error: 'Workspace not found' }

  const existingTenantId = (existing as Record<string, unknown>).tenant_id as string

  const { data: mem } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', existingTenantId)
    .single()

  if (!mem) return { data: null, error: 'Forbidden' }

  const canUpdate = await hasPermission(supabase, user.id, existingTenantId, 'workspace:update')
  if (!canUpdate) return { data: null, error: 'Forbidden: insufficient permissions' }

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .update(workspaceFields)
    .eq('id', id)
    .eq('tenant_id', (existing as Record<string, unknown>).tenant_id as string)
    .select('*')
    .single()

  if (error) return { data: null, error: error.message }

  if (agent_ids !== undefined) {
    await supabase
      .from('workspace_agents')
      .delete()
      .eq('workspace_id', id)

    if (agent_ids.length > 0) {
      const wsTenantId = (workspace as Record<string, unknown>).tenant_id as string
      const agentRows = agent_ids.map((agentId, index) => ({
        workspace_id: id,
        agent_id: agentId,
        tenant_id: wsTenantId,
        role: 'member' as AgentRole,
        position: index,
      }))

      const { error: agentError } = await supabase
        .from('workspace_agents')
        .insert(agentRows)

      if (agentError) return { data: null, error: agentError.message }
    }
  }

  revalidatePath('/t/[slug]/workspaces')
  return { data: workspace as Record<string, unknown>, error: null }
}

export async function deleteWorkspace(id: string): Promise<DeleteResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify tenant membership before delete
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', id)
    .single()

  if (!workspace) return { error: 'Workspace not found' }

  const wsTenantId = (workspace as Record<string, unknown>).tenant_id as string

  const { data: mem } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', wsTenantId)
    .single()

  if (!mem) return { error: 'Forbidden' }

  const canDelete = await hasPermission(supabase, user.id, wsTenantId, 'workspace:delete')
  if (!canDelete) return { error: 'Forbidden: insufficient permissions' }

  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)
    .eq('tenant_id', wsTenantId)

  if (error) return { error: error.message }

  revalidatePath('/t/[slug]/workspaces')
  return { error: null }
}

export async function addAgentToWorkspace(
  workspaceId: string,
  agentId: string,
  role: AgentRole = 'member',
  position = 0
): Promise<AgentAssignResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated' }

  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', workspaceId)
    .single()

  if (workspaceError || !workspace) return { data: null, error: 'Workspace not found' }

  const tenantId = (workspace as Record<string, unknown>).tenant_id as string

  // Verify tenant membership
  const { data: mem } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!mem) return { data: null, error: 'Forbidden' }

  const { data, error } = await supabase
    .from('workspace_agents')
    .insert({
      workspace_id: workspaceId,
      agent_id: agentId,
      tenant_id: tenantId,
      role,
      position,
    })

  if (error) return { data: null, error: error.message }

  return { data: (data ?? {}) as Record<string, unknown>, error: null }
}

export async function removeAgentFromWorkspace(
  workspaceId: string,
  agentId: string
): Promise<DeleteResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify tenant membership
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('tenant_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace) return { error: 'Workspace not found' }

  const { data: mem } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('user_id', user.id)
    .eq('tenant_id', (workspace as Record<string, unknown>).tenant_id as string)
    .single()

  if (!mem) return { error: 'Forbidden' }

  const { error } = await supabase
    .from('workspace_agents')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('agent_id', agentId)

  if (error) return { error: error.message }

  return { error: null }
}
