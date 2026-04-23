'use client'

import { useState, useTransition } from 'react'
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { createConversation, deleteConversation } from '@/lib/chat/actions'
import type { Tables } from '@sovra/shared/types/database'

type Conversation = Tables<'conversations'>

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId: string | null
  agentId: string
  tenantId: string
  tenantSlug: string
  onSelect: (id: string) => void
  onCreated: (conv: Conversation) => void
  onDeleted: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  agentId,
  tenantId,
  onSelect,
  onCreated,
  onDeleted,
}: ConversationSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleCreate() {
    startTransition(async () => {
      const { conversation, error } = await createConversation({
        tenantId,
        agentId,
        title: 'New conversation',
      })
      if (conversation && !error) {
        onCreated(conversation)
      }
    })
  }

  function handleDelete(conversationId: string) {
    startTransition(async () => {
      const { error } = await deleteConversation(conversationId)
      if (!error) {
        onDeleted(conversationId)
        setConfirmDeleteId(null)
        setMenuOpenId(null)
      }
    })
  }

  return (
    <div className="hidden md:flex w-[280px] bg-surface-2/50 border-r border-border h-full flex-col">
      <div className="p-3 border-b border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={handleCreate}
          disabled={isPending}
        >
          <Plus className="h-4 w-4" />
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className="group relative"
          >
            <button
              onClick={() => onSelect(conv.id)}
              className={cn(
                'relative w-full text-left px-3 py-2 rounded-lg cursor-pointer h-14 flex items-center transition-colors duration-100',
                conv.id === activeConversationId
                  ? 'bg-surface-3 text-foreground before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-primary'
                  : 'hover:bg-surface-3/50 text-muted-foreground'
              )}
            >
              <span className="text-sm font-semibold truncate pr-8">
                {conv.title || 'New conversation'}
              </span>
            </button>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              {confirmDeleteId === conv.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleDelete(conv.id)}
                    disabled={isPending}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (menuOpenId === conv.id) {
                      setMenuOpenId(null)
                    } else {
                      setMenuOpenId(conv.id)
                      setConfirmDeleteId(null)
                    }
                  }}
                  className="p-1 rounded hover:bg-surface-3 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {menuOpenId === conv.id && confirmDeleteId !== conv.id && (
              <div className="absolute right-2 top-full z-10 mt-1 bg-surface-2 border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={() => {
                    setConfirmDeleteId(conv.id)
                    setMenuOpenId(null)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-surface-3/50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
