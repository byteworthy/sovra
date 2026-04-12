'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info } from 'lucide-react'
import { useWorkspaceStore, type ActivityEvent } from '@/lib/realtime/workspace-store'
import { VARIANTS } from '@/lib/motion'
import { ConflictResolutionCard } from './conflict-resolution-card'

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface ActivityFeedItemProps {
  event: ActivityEvent
  agentNames?: Map<string, string>
}

function ActivityFeedItem({ event, agentNames }: ActivityFeedItemProps) {
  const agentName = (id?: string) =>
    id ? (agentNames?.get(id) ?? id.slice(0, 8)) : 'System'

  if (event.type === 'system_event') {
    return (
      <motion.div
        className="flex items-start gap-2 py-3 px-4"
        {...VARIANTS.messageEnter}
      >
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <span className="text-sm text-muted-foreground">{event.content}</span>
        <span className="ml-auto text-xs text-muted-foreground/60 shrink-0">
          {formatTimestamp(event.timestamp)}
        </span>
      </motion.div>
    )
  }

  if (event.type === 'agent_message') {
    return (
      <motion.div
        className="py-3 px-4"
        {...VARIANTS.messageEnter}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs font-semibold text-muted-foreground">
            {agentName(event.agentId)}
          </span>
          {event.targetAgentId && (
            <>
              <span className="text-muted-foreground/40 text-xs">to</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {agentName(event.targetAgentId)}
              </span>
            </>
          )}
          <span className="ml-auto text-xs text-muted-foreground/60">
            {formatTimestamp(event.timestamp)}
          </span>
        </div>
        <p
          className="text-sm leading-6 text-foreground"
          style={{ background: '#131316', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}
        >
          {event.content}
        </p>
      </motion.div>
    )
  }

  if (event.type === 'conflict') {
    // Parse conflict data from content (JSON)
    let conflictData: Parameters<typeof ConflictResolutionCard>[0] | null = null
    try {
      conflictData = JSON.parse(event.content)
    } catch {
      // fallback to raw text
    }

    if (conflictData) {
      return (
        <div className="px-4">
          <ConflictResolutionCard {...conflictData} />
        </div>
      )
    }

    return (
      <motion.div className="py-3 px-4" {...VARIANTS.messageEnter}>
        <span className="text-sm text-amber-400">{event.content}</span>
      </motion.div>
    )
  }

  if (event.type === 'tool_call') {
    return (
      <motion.div className="py-3 px-4" {...VARIANTS.messageEnter}>
        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
          style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#93C5FD' }}
        >
          {event.content}
        </span>
      </motion.div>
    )
  }

  return null
}

interface StreamingItemProps {
  agentId: string
  agentName: string
  chunks: string
}

function StreamingItem({ agentName, chunks }: StreamingItemProps) {
  return (
    <div className="py-3 px-4">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-semibold text-muted-foreground">{agentName}</span>
        <span className="text-xs text-muted-foreground/60">streaming...</span>
      </div>
      <p
        className="text-sm leading-6 text-foreground"
        style={{ background: '#131316', borderRadius: '0.375rem', padding: '0.5rem 0.75rem' }}
      >
        {chunks}
        <span className="streaming-cursor ml-0.5 inline-block w-0.5 h-3.5 bg-current align-middle" />
      </p>
    </div>
  )
}

interface ActivityFeedProps {
  agentNames?: Map<string, string>
}

export function ActivityFeed({ agentNames }: ActivityFeedProps) {
  const activityFeed = useWorkspaceStore((s) => s.activityFeed)
  const streamingChunks = useWorkspaceStore((s) => s.streamingChunks)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolledUp, setUserScrolledUp] = useState(false)
  const lastFeedLength = useRef(0)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  // Detect user scrolling up
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 60
    setUserScrolledUp(!atBottom)
  }

  // Auto-scroll on new events unless user scrolled up
  useEffect(() => {
    if (activityFeed.length > lastFeedLength.current && !userScrolledUp) {
      scrollToBottom()
    }
    lastFeedLength.current = activityFeed.length
  }, [activityFeed, userScrolledUp, scrollToBottom])

  // Auto-scroll on new streaming content
  useEffect(() => {
    if (streamingChunks.size > 0 && !userScrolledUp) {
      scrollToBottom()
    }
  }, [streamingChunks, userScrolledUp, scrollToBottom])

  const hasContent = activityFeed.length > 0 || streamingChunks.size > 0

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-0 py-2"
        aria-label="Activity feed"
        role="log"
        aria-live="polite"
      >
        {!hasContent && (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-muted-foreground text-center px-8">
              No activity yet. Start collaboration to see agent messages here.
            </p>
          </div>
        )}

        {activityFeed.map((event) => (
          <ActivityFeedItem key={event.id} event={event} agentNames={agentNames} />
        ))}

        {Array.from(streamingChunks.entries()).map(([agentId, chunks]) => (
          <StreamingItem
            key={agentId}
            agentId={agentId}
            agentName={agentNames?.get(agentId) ?? agentId.slice(0, 8)}
            chunks={chunks}
          />
        ))}
      </div>

      {/* View latest pill */}
      <AnimatePresence>
        {userScrolledUp && hasContent && (
          <motion.button
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-lg"
            onClick={() => {
              setUserScrolledUp(false)
              scrollToBottom()
            }}
            {...VARIANTS.jumpToLatest}
          >
            View latest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
