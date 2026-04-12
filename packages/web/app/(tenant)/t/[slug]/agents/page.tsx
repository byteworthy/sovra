import { createSupabaseServerClient } from '@/lib/auth/server'
import { listAgents } from '@/lib/agent/queries'
import { AgentListClient } from './agent-list-client'

interface AgentsPageProps {
  params: Promise<{ slug: string }>
}

export default async function AgentsPage({ params }: AgentsPageProps) {
  const { slug } = await params
  const supabase = await createSupabaseServerClient()

  // Resolve tenant ID from slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return <div className="p-6 text-sm text-muted-foreground">Tenant not found</div>
  }

  const { data: agents } = await listAgents(supabase, tenant.id)

  return <AgentListClient agents={agents ?? []} tenantId={tenant.id} tenantSlug={slug} />
}
