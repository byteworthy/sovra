'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { VARIANTS } from '@/lib/motion'
import { MessageBubble } from './message-bubble'
import type { Message } from 'ai'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const autoScrollEnabled = useRef(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
    autoScrollEnabled.current = true
    setShowJumpToLatest(false)
  }, [])

  useEffect(() => {
    if (autoScrollEnabled.current) {
      scrollToBottom('smooth')
    }
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    function handleScroll() {
      if (!container) return
      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      const isNearBottom = distanceFromBottom < 100

      if (isNearBottom) {
        autoScrollEnabled.current = true
        setShowJumpToLatest(false)
      } else {
        autoScrollEnabled.current = false
        if (messages.length > 0) {
          setShowJumpToLatest(true)
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Start a conversation</p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 relative">
      <div className="max-w-[720px] mx-auto flex flex-col gap-4">
        {messages.map((message, index) => {
          const isLastAssistant =
            message.role === 'assistant' && index === messages.length - 1
          return (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={isLastAssistant && isLoading}
            />
          )
        })}
        <div ref={bottomRef} />
      </div>

      <AnimatePresence>
        {showJumpToLatest && (
          <motion.button
            {...VARIANTS.jumpToLatest}
            onClick={() => scrollToBottom('smooth')}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm cursor-pointer shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors z-20"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Jump to latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
