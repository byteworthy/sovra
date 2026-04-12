'use client'

import { type FormEvent } from 'react'
import { useChat } from 'ai/react'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saveMessage } from '@/lib/chat/actions'
import { MessageList } from './message-list'
import { ChatInput } from './chat-input'
import type { Message } from 'ai'

interface ChatContainerProps {
  agentId: string
  conversationId: string
  agentName: string
  agentStatus: string
  initialMessages: Message[]
  tenantId: string
}

function AgentStatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'running' && 'bg-primary agent-status-running',
          status === 'error' && 'bg-destructive',
          status === 'idle' && 'bg-muted-foreground/50'
        )}
      />
      {status}
    </span>
  )
}

export function ChatContainer({
  agentId,
  conversationId,
  agentName,
  agentStatus,
  initialMessages,
  tenantId,
}: ChatContainerProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop } =
    useChat({
      api: '/api/chat',
      id: conversationId,
      initialMessages,
      body: { agentId, conversationId },
      onFinish: async (message) => {
        await saveMessage({
          conversationId,
          tenantId,
          role: 'assistant',
          content: message.content,
        })
      },
    })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    await saveMessage({
      conversationId,
      tenantId,
      role: 'user',
      content: input,
    })
    handleSubmit(e)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-border px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{agentName}</h1>
          <AgentStatusBadge status={isLoading ? 'running' : agentStatus} />
        </div>
        <button
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-muted-foreground"
          aria-label="Agent settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <MessageList messages={messages} isLoading={isLoading} />

      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={onSubmit}
        onStop={stop}
        agentName={agentName}
      />
    </div>
  )
}
