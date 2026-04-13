'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VARIANTS } from '@/lib/motion'
import type { Workspace, CollaborationMode, MemoryStrategy } from '@/lib/workspace/types'

interface WorkspaceCardProps {
  workspace: Workspace
  agentCount: number
  tenantSlug: string
  staggerIndex?: number
}

const MODE_BADGE: Record<CollaborationMode, { className: string; label: string }> = {
  round_robin:  { className: 'mode-round-robin',   label: 'Round robin' },
  parallel:     { className: 'mode-parallel',      label: 'Parallel' },
  sequential:   { className: 'mode-sequential',    label: 'Sequential' },
  hierarchical: { className: 'mode-hierarchical',  label: 'Hierarchical' },
  democratic:   { className: 'mode-democratic',    label: 'Democratic' },
}

const MEMORY_TAG: Record<MemoryStrategy, { className: string; label: string }> = {
  conversation: { className: 'memory-conversation', label: 'Conversation' },
  summary:      { className: 'memory-summary',      label: 'Summary' },
  vector:       { className: 'memory-vector',       label: 'Vector' },
  hybrid:       { className: 'memory-hybrid',       label: 'Hybrid' },
}

export function WorkspaceCard({ workspace, agentCount, tenantSlug, staggerIndex = 0 }: WorkspaceCardProps) {
  const mode = MODE_BADGE[workspace.collaboration_mode]
  const memory = MEMORY_TAG[workspace.memory_strategy]

  return (
    <motion.div
      {...VARIANTS.listItem}
      whileHover={{ y: -2 }}
      transition={{ ...VARIANTS.listItem.transition, delay: staggerIndex * 0.04 }}
    >
      <Link
        href={`/t/${tenantSlug}/workspaces/${workspace.id}`}
        className={cn(
          'group block bg-card border border-border rounded-xl p-4',
          'hover:border-primary/20 hover:bg-surface-2 hover:shadow-glow-sm transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
      >
        {/* Top row: name + mode badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-sm font-semibold text-foreground leading-tight">
            {workspace.name}
          </span>
          <span
            className={cn(
              'shrink-0 px-2 py-1 rounded-full text-xs font-semibold',
              mode.className
            )}
          >
            {mode.label}
          </span>
        </div>

        {/* Middle row: agent count */}
        <div className="flex items-center gap-1 mb-3">
          <Users2 className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {agentCount} {agentCount === 1 ? 'agent' : 'agents'}
          </span>
        </div>

        {/* Bottom row: memory strategy tag */}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'px-2 py-1 rounded text-xs',
              memory.className
            )}
          >
            {memory.label}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
