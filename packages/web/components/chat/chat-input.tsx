'use client'

import { useRef, useEffect, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  onSubmit: (e: FormEvent) => void
  onStop: () => void
  agentName: string
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
  onStop,
  agentName,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }, [input])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isLoading) return
      if (!input.trim()) return
      onSubmit(e as unknown as FormEvent)
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (isLoading) return
      if (!input.trim()) return
      onSubmit(e as unknown as FormEvent)
    }
  }

  const isDisabled = !input.trim() && !isLoading

  return (
    <div className="border-t border-border bg-background p-4">
      <form onSubmit={onSubmit} className="relative max-w-[720px] mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agentName}...`}
          rows={1}
          className="min-h-[56px] max-h-[200px] w-full resize-none rounded-xl bg-[#0D0D0F] border border-input px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none transition-colors"
        />
        <button
          type={isLoading ? 'button' : 'submit'}
          onClick={isLoading ? onStop : undefined}
          disabled={isDisabled}
          className={cn(
            'absolute bottom-6 right-6 h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-opacity',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={isLoading ? 'Stop generation' : 'Send message'}
        >
          {isLoading ? (
            <Square className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>
      </form>
    </div>
  )
}
