'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/motion'
import { useWorkspaceSocket } from '@/lib/realtime/use-workspace-socket'
import { WorkspaceDetailHeader } from '@/components/workspace/workspace-detail-header'
import { ActivityFeed } from '@/components/workspace/activity-feed'
import { AgentPanel } from '@/components/workspace/agent-panel'
import { SharedMemoryPanel } from '@/components/workspace/shared-memory-panel'
import { WorkspaceSettingsSheet } from '@/components/workspace/workspace-settings-sheet'
import type { Workspace, WorkspaceAgent, SharedMemoryEntry } from '@/lib/workspace/types'

interface AgentDetail {
  id: string
  name: string
  model_provider: string
  model_name: string
}

interface WorkspaceAgentWithDetails extends WorkspaceAgent {
  agents: AgentDetail
}

interface WorkspaceDetailClientProps {
  workspace: Record<string, unknown>
  workspaceAgents: Record<string, unknown>[]
  memoryEntries: Record<string, unknown>[]
  allAgents: AgentDetail[]
  tenantId: string
  tenantSlug: string
}

export function WorkspaceDetailClient({
  workspace,
  workspaceAgents,
  memoryEntries,
  allAgents,
  tenantId,
  tenantSlug,
}: WorkspaceDetailClientProps) {
  const ws = workspace as unknown as Workspace
  const agents = workspaceAgents as unknown as WorkspaceAgentWithDetails[]
  const memory = memoryEntries as unknown as SharedMemoryEntry[]

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [agentSheetOpen, setAgentSheetOpen] = useState(false)

  // Connect Socket.IO and wire store
  useWorkspaceSocket(tenantId, ws.id)

  // Build agent name map for activity feed
  const agentNames = new Map<string, string>(
    agents.map((a) => [a.agent_id, a.agents?.name ?? a.agent_id])
  )

  const assignedAgentIds = agents.map((a) => a.agent_id)

  const handleStartCollaboration = async () => {
    try {
      await fetch(`/api/workspaces/${ws.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' }),
      })
    } catch {
      // Error handling: toast or inline error can be wired by parent
    }
  }

  const handleRemoveAgent = async (agentId: string) => {
    const { removeAgentFromWorkspace } = await import('@/lib/workspace/actions')
    await removeAgentFromWorkspace(ws.id, agentId)
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={TRANSITIONS.default}
      >
        <WorkspaceDetailHeader
          workspace={ws}
          tenantSlug={tenantSlug}
          onSettingsOpen={() => setSettingsOpen(true)}
          onStartCollaboration={handleStartCollaboration}
          onViewAgents={() => setAgentSheetOpen(true)}
        />
      </motion.div>

      {/* Main canvas */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Activity feed + shared memory */}
        <motion.div
          className="flex flex-col flex-1 min-w-0 min-h-0"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...TRANSITIONS.default, delay: 0.06 }}
        >
          <ActivityFeed agentNames={agentNames} />
          <SharedMemoryPanel workspace={ws} entries={memory} />
        </motion.div>

        {/* Right: Agent panel (desktop only) */}
        <motion.div
          className="contents"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...TRANSITIONS.default, delay: 0.12 }}
        >
          <AgentPanel
            workspaceId={ws.id}
            agents={agents}
            onStartCollaboration={handleStartCollaboration}
            onAddAgent={() => setSettingsOpen(true)}
            onRemoveAgent={handleRemoveAgent}
          />
        </motion.div>
      </div>

      {/* Mobile agent sheet */}
      {agentSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setAgentSheetOpen(false)}
          />
          <div className="relative w-[85vw] max-w-[320px] h-full bg-card border-l border-border flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">Agents</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AgentPanel
                workspaceId={ws.id}
                agents={agents}
                onStartCollaboration={() => {
                  setAgentSheetOpen(false)
                  handleStartCollaboration()
                }}
                onAddAgent={() => {
                  setAgentSheetOpen(false)
                  setSettingsOpen(true)
                }}
                onRemoveAgent={handleRemoveAgent}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settings sheet */}
      <WorkspaceSettingsSheet
        workspace={ws}
        availableAgents={allAgents}
        assignedAgentIds={assignedAgentIds}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
