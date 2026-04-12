'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VARIANTS } from '@/lib/motion'
import type { Message } from 'ai'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

interface CodeBlock {
  language: string
  code: string
}

function parseContent(content: string): Array<{ type: 'text'; value: string } | { type: 'code'; value: CodeBlock }> {
  const parts: Array<{ type: 'text'; value: string } | { type: 'code'; value: CodeBlock }> = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    parts.push({
      type: 'code',
      value: { language: match[1] || 'text', code: match[2].trimEnd() },
    })
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return parts
}

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-zinc-800 rounded px-2 py-1 font-mono text-sm text-foreground/90">
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function CodeBlockRenderer({ language, code }: CodeBlock) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="relative bg-[#0D0D0F] border border-border rounded-lg my-2 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-xs text-muted-foreground/60 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-zinc-800 transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      <pre className="px-4 py-3 overflow-x-auto">
        <code className="font-mono text-sm text-foreground">{code}</code>
      </pre>
    </div>
  )
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const parts = parseContent(message.content)

  return (
    <motion.div
      {...VARIANTS.messageEnter}
      className={cn('group flex', isUser ? 'justify-end' : 'justify-start')}
    >
      {isUser ? (
        <div className="bg-[#1E3A5F] text-foreground rounded-2xl rounded-br-sm px-4 py-2 text-sm max-w-[80%]">
          {renderInlineCode(message.content)}
        </div>
      ) : (
        <div className="text-sm leading-7 text-foreground max-w-[80%]">
          {parts.map((part, i) =>
            part.type === 'code' ? (
              <CodeBlockRenderer key={i} {...part.value} />
            ) : (
              <span key={i}>{renderInlineCode(part.value)}</span>
            )
          )}
          {isStreaming && (
            <span className="streaming-cursor inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle" />
          )}
        </div>
      )}
    </motion.div>
  )
}
