'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { MoreHorizontal, MessageSquare, Pencil, Copy, Trash2 } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { VARIANTS } from '@/lib/motion'
import { AgentStatusBadge } from './agent-status-badge'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description: string | null
  model_provider: string
  model_name: string
  status?: 'idle' | 'running' | 'error'
}

interface AgentCardProps {
  agent: Agent
  tenantSlug: string
  onEdit: (agent: Agent) => void
  onDelete: (agentId: string) => void
}

export function AgentCard({ agent, tenantSlug, onEdit, onDelete }: AgentCardProps) {
  const chatHref = `/t/${tenantSlug}/agents/${agent.id}/chat`
  const status = agent.status ?? 'idle'

  return (
    <motion.div {...VARIANTS.listItem}>
      <Link
        href={chatHref}
        className={cn(
          'block min-h-[88px] bg-card border border-border rounded-xl p-4 cursor-pointer',
          'hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-150',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'group relative'
        )}
      >
        {/* Top row: name + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold truncate">{agent.name}</span>
          <AgentStatusBadge status={status} />
        </div>

        {/* Bottom row: model info + menu */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground truncate">
            {agent.model_provider}/{agent.model_name}
          </span>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                onClick={(e) => e.preventDefault()}
                className="h-7 w-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800"
                aria-label="Agent actions"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
                onClick={(e) => e.preventDefault()}
              >
                <DropdownMenu.Item
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/10 outline-none"
                  onSelect={() => {}}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Open chat
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/10 outline-none"
                  onSelect={() => onEdit(agent)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/10 outline-none opacity-50"
                  disabled
                >
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </DropdownMenu.Item>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Item
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-red-500/10 text-red-400 outline-none"
                  onSelect={() => onDelete(agent.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </Link>
    </motion.div>
  )
}
