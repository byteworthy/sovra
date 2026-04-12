'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import { useWorkspaceStore } from '@/lib/realtime/workspace-store'

interface WorkspaceAgentWithDetails {
  id: string
  agent_id: string
  role: string
  position: number
  agents: {
    id: string
    name: string
    model_provider: string
    model_name: string
  }
}

interface AgentPanelProps {
  workspaceId: string
  agents: WorkspaceAgentWithDetails[]
  onStartCollaboration: () => void
  onAddAgent: () => void
  onRemoveAgent: (agentId: string) => void
}

function AgentStatusDot({ agentId }: { agentId: string }) {
  const status = useWorkspaceStore((s) => s.agentStatuses.get(agentId) ?? 'idle')

  const dotColor =
    status === 'running'
      ? 'bg-blue-500'
      : status === 'error'
      ? 'bg-red-500'
      : 'bg-zinc-500'

  return (
    <span
      className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} ${status === 'running' ? 'agent-status-running' : ''}`}
      aria-label={`Agent status: ${status}`}
    />
  )
}

function WorkspaceAgentCard({
  agent,
  onRemove,
}: {
  agent: WorkspaceAgentWithDetails
  onRemove: () => void
}) {
  const status = useWorkspaceStore((s) => s.agentStatuses.get(agent.agent_id) ?? 'idle')
  const prevStatus = useRef(status)
  const [flashing, setFlashing] = useState(false)

  useEffect(() => {
    if (prevStatus.current !== status) {
      setFlashing(true)
      const timer = setTimeout(() => setFlashing(false), 600)
      prevStatus.current = status
      return () => clearTimeout(timer)
    }
  }, [status])

  const isActive = status === 'running'

  return (
    <div
      className={`group relative h-[72px] px-4 py-3 border-b border-border last:border-b-0 flex items-center gap-3 hover:bg-zinc-800/30 transition-colors duration-100 ${flashing ? 'status-flash' : ''}`}
      style={isActive ? { borderLeft: '2px solid #3B82F6' } : undefined}
    >
      <AgentStatusDot agentId={agent.agent_id} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-foreground' : ''}`}>
          {agent.agents.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{agent.agents.model_provider}/{agent.agents.model_name}</p>
      </div>

      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded hover:bg-zinc-700 transition-all text-muted-foreground hover:text-foreground shrink-0"
        aria-label={`Remove ${agent.agents.name} from workspace`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function AgentPanel({
  agents,
  onStartCollaboration,
  onAddAgent,
  onRemoveAgent,
}: AgentPanelProps) {
  return (
    <aside className="hidden md:flex w-[320px] shrink-0 border-l border-border flex-col bg-card/40">
      <div className="px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold">Agents</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No agents assigned</p>
            <p className="text-xs text-muted-foreground">
              Add agents to this workspace to begin collaboration.
            </p>
          </div>
        ) : (
          agents.map((agent) => (
            <WorkspaceAgentCard
              key={agent.id}
              agent={agent}
              onRemove={() => onRemoveAgent(agent.agent_id)}
            />
          ))
        )}

        <div className="p-4">
          <button
            onClick={onAddAgent}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Add agent to workspace"
          >
            <Plus className="w-4 h-4" />
            Add agent
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <button
          onClick={onStartCollaboration}
          className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          aria-label="Start collaboration"
        >
          Start collaboration
        </button>
      </div>
    </aside>
  )
}
