'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ConversationSidebar } from '@/components/chat/conversation-sidebar'
import { ChatContainer } from '@/components/chat/chat-container'
import type { Message } from 'ai'

interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

interface ChatPageClientProps {
  agent: Record<string, unknown>
  agentId: string
  tenantId: string
  tenantSlug: string
  conversations: Conversation[]
  activeConversationId: string
  initialMessages: Message[]
}

export function ChatPageClient({
  agent,
  agentId,
  tenantId,
  tenantSlug,
  conversations: initialConversations,
  activeConversationId: initialActiveId,
  initialMessages,
}: ChatPageClientProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConversationId, setActiveConversationId] = useState(initialActiveId)
  const [messages, setMessages] = useState(initialMessages)

  const handleSelect = useCallback(
    (id: string) => {
      if (id === activeConversationId) return
      setActiveConversationId(id)
      setMessages([])
      router.refresh()
    },
    [activeConversationId, router]
  )

  const handleCreated = useCallback(
    (conv: Conversation) => {
      setConversations((prev) => [conv, ...prev])
      setActiveConversationId(conv.id)
      setMessages([])
    },
    []
  )

  const handleDeleted = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)
        if (id === activeConversationId && filtered.length > 0) {
          setActiveConversationId(filtered[0].id)
          setMessages([])
          router.refresh()
        }
        return filtered
      })
    },
    [activeConversationId, router]
  )

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        agentId={agentId}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        onSelect={handleSelect}
        onCreated={handleCreated}
        onDeleted={handleDeleted}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ChatContainer
          agentId={agentId}
          conversationId={activeConversationId}
          agentName={(agent.name as string) ?? 'Agent'}
          agentStatus={(agent.status as string) ?? 'idle'}
          initialMessages={messages}
          tenantId={tenantId}
        />
      </div>
    </div>
  )
}
