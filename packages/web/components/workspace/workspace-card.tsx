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

const MODE_BADGE: Record<CollaborationMode, { bg: string; text: string; label: string }> = {
  round_robin: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    label: 'Round robin',
  },
  parallel: {
    bg: 'bg-green-500/[0.12]',
    text: 'text-green-400',
    label: 'Parallel',
  },
  sequential: {
    bg: 'bg-amber-500/[0.12]',
    text: 'text-amber-400',
    label: 'Sequential',
  },
  hierarchical: {
    bg: 'bg-orange-500/[0.12]',
    text: 'text-orange-400',
    label: 'Hierarchical',
  },
  democratic: {
    bg: 'bg-blue-500/[0.12]',
    text: 'text-blue-400',
    label: 'Democratic',
  },
}

const MEMORY_TAG: Record<MemoryStrategy, { bg: string; text: string; label: string }> = {
  conversation: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-300',
    label: 'Conversation',
  },
  summary: {
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    label: 'Summary',
  },
  vector: {
    bg: 'bg-green-500/10',
    text: 'text-green-300',
    label: 'Vector',
  },
  hybrid: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    label: 'Hybrid',
  },
}

export function WorkspaceCard({ workspace, agentCount, tenantSlug, staggerIndex = 0 }: WorkspaceCardProps) {
  const mode = MODE_BADGE[workspace.collaboration_mode]
  const memory = MEMORY_TAG[workspace.memory_strategy]

  return (
    <motion.div
      {...VARIANTS.listItem}
      transition={{ ...VARIANTS.listItem.transition, delay: staggerIndex * 0.04 }}
    >
      <Link
        href={`/t/${tenantSlug}/workspaces/${workspace.id}`}
        className={cn(
          'group block bg-card border border-border rounded-xl p-4',
          'hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-150',
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
              mode.bg,
              mode.text
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
              memory.bg,
              memory.text
            )}
          >
            {memory.label}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
