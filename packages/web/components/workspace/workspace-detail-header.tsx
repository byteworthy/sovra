'use client'

import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'
import { SocketStatusIndicator } from './socket-status-indicator'
import type { Workspace } from '@/lib/workspace/types'

const COLLAB_MODE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  round_robin: { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'Round robin' },
  parallel: { bg: 'bg-green-500/12', text: 'text-green-400', label: 'Parallel' },
  sequential: { bg: 'bg-amber-500/12', text: 'text-amber-400', label: 'Sequential' },
  hierarchical: { bg: 'bg-orange-500/12', text: 'text-orange-400', label: 'Hierarchical' },
  democratic: { bg: 'bg-blue-500/12', text: 'text-blue-400', label: 'Democratic' },
}

interface WorkspaceDetailHeaderProps {
  workspace: Workspace
  tenantSlug: string
  onSettingsOpen: () => void
  onStartCollaboration?: () => void
  onViewAgents?: () => void
}

export function WorkspaceDetailHeader({
  workspace,
  tenantSlug,
  onSettingsOpen,
  onStartCollaboration,
  onViewAgents,
}: WorkspaceDetailHeaderProps) {
  const modeStyle = COLLAB_MODE_STYLES[workspace.collaboration_mode]

  return (
    <header className="h-14 border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-sm flex items-center px-4 gap-3">
      <Link
        href={`/t/${tenantSlug}/workspaces`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Back to workspaces"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back</span>
      </Link>

      <div className="w-px h-5 bg-border" />

      <h1 className="text-2xl font-semibold tracking-tight truncate flex-1 min-w-0">
        {workspace.name}
      </h1>

      {modeStyle && (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${modeStyle.bg} ${modeStyle.text}`}
        >
          {modeStyle.label}
        </span>
      )}

      <div className="flex items-center gap-2 shrink-0">
        <SocketStatusIndicator />

        {/* Mobile: view agents button */}
        {onViewAgents && (
          <button
            onClick={onViewAgents}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="View agents"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}

        <button
          onClick={onSettingsOpen}
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-zinc-800 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Workspace settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {onStartCollaboration && (
          <button
            onClick={onStartCollaboration}
            className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Start collaboration
          </button>
        )}
      </div>
    </header>
  )
}
