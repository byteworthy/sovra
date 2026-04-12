import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getWorkspaceById, getWorkspaceAgents } from '@/lib/workspace/queries'
import { readSharedMemory } from '@/lib/workspace/shared-memory'
import { WorkspaceDetailClient } from './workspace-detail-client'

interface WorkspaceDetailPageProps {
  params: Promise<{ slug: string; workspaceId: string }>
}

export default async function WorkspaceDetailPage({ params }: WorkspaceDetailPageProps) {
  const { slug, workspaceId } = await params

  const supabase = await createSupabaseServerClient()

  // Resolve tenant from slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) return notFound()

  // Fetch all available agents for settings sheet
  const { data: allAgents } = await supabase
    .from('agents')
    .select('id, name, model_provider, model_name')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  const [workspaceResult, agentsResult, memoryResult] = await Promise.all([
    getWorkspaceById(workspaceId),
    getWorkspaceAgents(workspaceId),
    readSharedMemory(workspaceId),
  ])

  if (workspaceResult.error || !workspaceResult.data) return notFound()

  const workspace = workspaceResult.data as Record<string, unknown>
  const workspaceAgents = (agentsResult.data ?? []) as Record<string, unknown>[]
  const memoryEntries = (memoryResult.data ?? []) as Record<string, unknown>[]

  return (
    <WorkspaceDetailClient
      workspace={workspace}
      workspaceAgents={workspaceAgents}
      memoryEntries={memoryEntries}
      allAgents={allAgents ?? []}
      tenantId={tenant.id}
      tenantSlug={slug}
    />
  )
}
