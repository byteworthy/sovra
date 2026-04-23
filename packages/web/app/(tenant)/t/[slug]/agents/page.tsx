import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { listAgents } from '@/lib/agent/queries'
import { AgentListClient } from './agent-list-client'

export const metadata: Metadata = {
  title: 'Agents | Sovra',
  description: 'Manage and configure your AI agents, tools, and MCP connections.',
}

interface AgentsPageProps {
  params: Promise<{ slug: string }>
}

type AgentStatus = 'idle' | 'running' | 'error'

function normalizeAgentStatus(status: string): AgentStatus {
  if (status === 'running' || status === 'error') return status
  return 'idle'
}

function normalizeAgentTools(tools: unknown): string[] {
  return Array.isArray(tools) ? tools.filter((tool): tool is string => typeof tool === 'string') : []
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
  const normalizedAgents = (agents ?? []).map((agent) => ({
    ...agent,
    status: normalizeAgentStatus(agent.status),
    tools: normalizeAgentTools(agent.tools),
  }))

  return <AgentListClient agents={normalizedAgents} tenantId={tenant.id} tenantSlug={slug} />
}
