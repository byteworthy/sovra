import { generateText } from 'ai'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { getProvider, initProviders } from '@/lib/ai/registry'
import { buildContextMessages } from '@/lib/memory/types'
import {
  broadcastAgentStatus,
  broadcastAgentMessage,
} from './broadcast'
import { upsertSharedMemory } from './shared-memory'
import type { Workspace } from './types'
import type { resolveConflict } from './conflict'
import type { AgentResponse } from './conflict'

const MAX_PARALLEL_AGENTS = 20

interface AgentRow {
  id: string
  agent_id: string
  role: 'leader' | 'member'
  position: number
  model_provider: string
  model_name: string
  system_prompt: string | null
  tenant_id?: string
}

export interface AgentRunResult {
  agentId: string
  text: string
  role: 'leader' | 'member'
}

async function runSingleAgent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agent: AgentRow,
  prompt: string,
  workspace: Workspace,
  tenantId: string
): Promise<AgentRunResult> {
  await broadcastAgentStatus(tenantId, workspace.id, agent.agent_id, 'running')

  const messages = await buildContextMessages({
    workspaceId: workspace.id,
    agentId: agent.agent_id,
    prompt,
    strategy: workspace.memory_strategy,
  })

  initProviders()
  const adapter = getProvider(agent.model_provider)
  const model = adapter.getModel(agent.model_name)

  const result = await generateText({
    model,
    system: agent.system_prompt ?? undefined,
    messages,
  })

  await broadcastAgentMessage(
    tenantId,
    workspace.id,
    agent.agent_id,
    result.text
  )

  await supabase
    .from('agents')
    .update({ status: 'idle' })
    .eq('id', agent.agent_id)

  await broadcastAgentStatus(tenantId, workspace.id, agent.agent_id, 'idle')

  return { agentId: agent.agent_id, text: result.text, role: agent.role }
}

export async function runRoundRobin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agents: AgentRow[],
  prompt: string,
  workspace: Workspace,
  tenantId: string
): Promise<AgentRunResult> {
  let context = prompt
  let lastResult: AgentRunResult = { agentId: '', text: '', role: 'member' }

  for (const agent of agents) {
    lastResult = await runSingleAgent(supabase, agent, context, workspace, tenantId)
    context = lastResult.text
  }

  return lastResult
}

export async function runParallel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agents: AgentRow[],
  prompt: string,
  workspace: Workspace,
  tenantId: string
): Promise<AgentRunResult[]> {
  const limited = agents.slice(0, MAX_PARALLEL_AGENTS)
  return Promise.all(
    limited.map((agent) =>
      runSingleAgent(supabase, agent, prompt, workspace, tenantId)
    )
  )
}

export async function runSequential(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agents: AgentRow[],
  prompt: string,
  workspace: Workspace,
  tenantId: string
): Promise<AgentRunResult> {
  const sorted = [...agents].sort((a, b) => a.position - b.position)
  return runRoundRobin(supabase, sorted, prompt, workspace, tenantId)
}

export async function runHierarchical(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agents: AgentRow[],
  prompt: string,
  workspace: Workspace,
  tenantId: string
): Promise<AgentRunResult> {
  const leader = agents.find((a) => a.role === 'leader') ?? agents[0]
  const members = agents.filter((a) => a.role !== 'leader' || a === leader)

  // Leader runs first, then members receive leader output
  const leaderResult = await runSingleAgent(
    supabase,
    leader,
    prompt,
    workspace,
    tenantId
  )

  if (members.length <= 1) return leaderResult

  const memberAgents = agents.filter((a) => a.role === 'member')
  for (const member of memberAgents) {
    await runSingleAgent(supabase, member, leaderResult.text, workspace, tenantId)
  }

  return leaderResult
}

export async function runDemocratic(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  agents: AgentRow[],
  prompt: string,
  workspace: Workspace,
  tenantId: string,
  conflictResolver: typeof resolveConflict
): Promise<AgentRunResult> {
  const results = await runParallel(supabase, agents, prompt, workspace, tenantId)
  const responses: AgentResponse[] = results.map((r) => ({
    agentId: r.agentId,
    text: r.text,
    role: r.role,
  }))
  return conflictResolver(workspace.conflict_resolution, responses)
}

export async function runWorkspace(
  workspaceId: string,
  prompt: string
): Promise<AgentRunResult | AgentRunResult[]> {
  const supabase = await createSupabaseServerClient()

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single()

  if (wsError || !workspace) {
    throw new Error(`Workspace not found: ${workspaceId}`)
  }

  const { data: workspaceAgents, error: agentsError } = await supabase
    .from('workspace_agents')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })

  if (agentsError || !workspaceAgents?.length) {
    throw new Error('No agents configured for workspace')
  }

  const tenantId = workspace.tenant_id as string
  const ws = workspace as Workspace

  let result: AgentRunResult | AgentRunResult[]

  switch (ws.collaboration_mode) {
    case 'round_robin':
      result = await runRoundRobin(supabase, workspaceAgents, prompt, ws, tenantId)
      break
    case 'parallel': {
      const parallelResults = await runParallel(supabase, workspaceAgents, prompt, ws, tenantId)
      if (ws.conflict_resolution) {
        const { resolveConflict: resolver } = await import('./conflict')
        const responses: AgentResponse[] = parallelResults.map((r) => ({
          agentId: r.agentId,
          text: r.text,
          role: r.role,
        }))
        result = resolver(ws.conflict_resolution, responses)
      } else {
        result = parallelResults
      }
      break
    }
    case 'sequential':
      result = await runSequential(supabase, workspaceAgents, prompt, ws, tenantId)
      break
    case 'hierarchical':
      result = await runHierarchical(supabase, workspaceAgents, prompt, ws, tenantId)
      break
    case 'democratic': {
      const { resolveConflict: resolver } = await import('./conflict')
      result = await runDemocratic(supabase, workspaceAgents, prompt, ws, tenantId, resolver)
      break
    }
    default:
      result = await runRoundRobin(supabase, workspaceAgents, prompt, ws, tenantId)
  }

  // Store final result in shared memory
  const finalResult = Array.isArray(result) ? result[0] : result
  await upsertSharedMemory(workspaceId, 'last_result', finalResult)

  return result
}
