import { createSupabaseServerClient } from '@/lib/auth/server'
import { getWorkspaces } from '@/lib/workspace/queries'
import { listAgents } from '@/lib/agent/queries'
import { WorkspacesListClient } from './workspaces-list-client'
import type { Workspace } from '@/lib/workspace/types'

interface WorkspacesPageProps {
  params: Promise<{ slug: string }>
}

export default async function WorkspacesPage({ params }: WorkspacesPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return <div className="p-6 text-sm text-muted-foreground">Tenant not found</div>
  }

  const [{ data: workspaces }, { data: agents }] = await Promise.all([
    getWorkspaces(),
    listAgents(supabase, tenant.id),
  ])

  return (
    <WorkspacesListClient
      workspaces={(workspaces ?? []) as Workspace[]}
      agents={agents ?? []}
      tenantId={tenant.id}
      tenantSlug={slug}
    />
  )
}
