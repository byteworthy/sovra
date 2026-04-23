'use client'

import { useState } from 'react'
import { Network, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorkspaceCard } from '@/components/workspace/workspace-card'
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog'
import type { Workspace } from '@/lib/workspace/types'

interface Agent {
  id: string
  name: string
  model_name: string
}

interface WorkspacesListClientProps {
  workspaces: Workspace[]
  agents: Agent[]
  tenantId: string
  tenantSlug: string
}

export function WorkspacesListClient({
  workspaces,
  agents,
  tenantId,
  tenantSlug,
}: WorkspacesListClientProps) {
  const [showCreate, setShowCreate] = useState(false)

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Workspaces</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create workspace
        </Button>
      </div>

      {/* Grid or empty state */}
      {workspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Network className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No workspaces yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Create a workspace to run multiple agents together on a shared goal.
          </p>
          <Button onClick={() => setShowCreate(true)}>Create workspace</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace, index) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              agentCount={0}
              tenantSlug={tenantSlug}
              staggerIndex={index}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateWorkspaceDialog
        tenantId={tenantId}
        agents={agents}
        open={showCreate}
        onOpenChange={setShowCreate}
      />
    </div>
  )
}
