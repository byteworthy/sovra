import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UIMessage } from 'ai'
import { MessageBubble } from '@/components/chat/message-bubble'

function makeMessage(role: 'user' | 'assistant', text: string): UIMessage {
  return {
    id: `msg-${role}`,
    role,
    parts: [{ type: 'text', text }],
  } as unknown as UIMessage
}

describe('MessageBubble', () => {
  it('renders fenced code blocks for assistant messages', () => {
    render(
      <MessageBubble
        message={makeMessage(
          'assistant',
          'Use this:\n```ts\nconst answer = 42\n```'
        )}
      />
    )

    expect(screen.getByText('ts')).toBeDefined()
    expect(screen.getByText('const answer = 42')).toBeDefined()
  })

  it('renders inline code for user messages', () => {
    render(<MessageBubble message={makeMessage('user', 'Run `pnpm test` before shipping')} />)

    const inlineCode = screen.getByText('pnpm test')
    expect(inlineCode.tagName).toBe('CODE')
  })

  it('shows streaming cursor while assistant response is in progress', () => {
    const { container } = render(
      <MessageBubble
        message={makeMessage('assistant', 'Working on it...')}
        isStreaming
      />
    )

    expect(container.querySelector('.streaming-cursor')).not.toBeNull()
  })
})
