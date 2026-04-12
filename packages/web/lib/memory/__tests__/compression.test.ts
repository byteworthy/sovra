import { describe, it, expect, vi } from 'vitest'
import {
  estimateTokens,
  snipMessages,
  collapseMessages,
  microcompactMessages,
} from '../compression'
import type { CoreMessage } from '../types'

describe('estimateTokens', () => {
  it('returns rough token count at 4 chars per token', () => {
    // "hello world" = 11 chars / 4 = 2.75, ceil = 3
    expect(estimateTokens('hello world')).toBe(3)
  })

  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('handles longer text', () => {
    // 40 chars / 4 = 10
    expect(estimateTokens('a'.repeat(40))).toBe(10)
  })

  it('rounds up fractional tokens', () => {
    // 5 chars / 4 = 1.25, ceil = 2
    expect(estimateTokens('hello')).toBe(2)
  })
})

describe('snipMessages', () => {
  const systemMsg: CoreMessage = { role: 'system', content: 'You are a helper.' }
  const userMsg1: CoreMessage = { role: 'user', content: 'msg 1' }
  const assistantMsg1: CoreMessage = { role: 'assistant', content: 'reply 1' }
  const userMsg2: CoreMessage = { role: 'user', content: 'msg 2' }
  const assistantMsg2: CoreMessage = { role: 'assistant', content: 'reply 2' }
  const userMsg3: CoreMessage = { role: 'user', content: 'msg 3' }
  const assistantMsg3: CoreMessage = { role: 'assistant', content: 'reply 3' }
  const userMsg4: CoreMessage = { role: 'user', content: 'msg 4' }
  const assistantMsg4: CoreMessage = { role: 'assistant', content: 'reply 4' }
  const userMsg5: CoreMessage = { role: 'user', content: 'msg 5' }

  const allMessages: CoreMessage[] = [
    systemMsg,
    userMsg1,
    assistantMsg1,
    userMsg2,
    assistantMsg2,
    userMsg3,
    assistantMsg3,
    userMsg4,
    assistantMsg4,
    userMsg5,
  ]

  it('keeps system messages + last N conversational messages', () => {
    const result = snipMessages(allMessages, 3)
    // system message preserved, last 3 non-system messages
    expect(result[0]).toEqual(systemMsg)
    expect(result.length).toBe(4) // 1 system + 3 recent
    expect(result[result.length - 1]).toEqual(userMsg5)
  })

  it('preserves order of remaining messages', () => {
    // 9 non-system messages in order:
    // userMsg1, assistantMsg1, userMsg2, assistantMsg2, userMsg3, assistantMsg3, userMsg4, assistantMsg4, userMsg5
    // last 3: userMsg4, assistantMsg4, userMsg5
    const result = snipMessages(allMessages, 3)
    expect(result[1]).toEqual(userMsg4)
    expect(result[2]).toEqual(assistantMsg4)
    expect(result[3]).toEqual(userMsg5)
  })

  it('returns all messages if fewer than maxMessages exist', () => {
    const small = [systemMsg, userMsg1, assistantMsg1]
    const result = snipMessages(small, 10)
    expect(result).toEqual(small)
  })

  it('works without system messages', () => {
    const msgs: CoreMessage[] = [userMsg1, assistantMsg1, userMsg2]
    const result = snipMessages(msgs, 2)
    expect(result).toEqual([assistantMsg1, userMsg2])
  })
})

describe('collapseMessages', () => {
  const messages: CoreMessage[] = [
    { role: 'system', content: 'sys' },
    { role: 'user', content: 'u1' },
    { role: 'assistant', content: 'a1' },
    { role: 'user', content: 'u2' },
    { role: 'assistant', content: 'a2' },
    { role: 'user', content: 'u3' },
    { role: 'assistant', content: 'a3' },
    { role: 'user', content: 'u4' },
    { role: 'assistant', content: 'a4' },
    { role: 'user', content: 'u5' },
  ]

  it('keeps only the last N messages, discards all else', () => {
    const result = collapseMessages(messages, 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ role: 'assistant', content: 'a4' })
    expect(result[1]).toEqual({ role: 'user', content: 'u5' })
  })

  it('returns all messages if fewer than keepLast exist', () => {
    const result = collapseMessages(messages, 20)
    expect(result).toEqual(messages)
  })

  it('returns empty for keepLast 0', () => {
    const result = collapseMessages(messages, 0)
    expect(result).toHaveLength(0)
  })
})

describe('microcompactMessages', () => {
  it('calls generateText and summarizes older messages into a system message', async () => {
    const mockGenerateText = vi.fn().mockResolvedValue({ text: 'Summary of older messages.' })
    const messages: CoreMessage[] = [
      { role: 'user', content: 'old msg 1' },
      { role: 'assistant', content: 'old reply 1' },
      { role: 'user', content: 'old msg 2' },
      { role: 'assistant', content: 'old reply 2' },
      { role: 'user', content: 'recent msg 1' },
      { role: 'assistant', content: 'recent reply 1' },
    ]

    const fakeModel = {} as Parameters<typeof microcompactMessages>[2]
    const result = await microcompactMessages(fakeModel, messages, 2, mockGenerateText)

    expect(mockGenerateText).toHaveBeenCalledOnce()
    // Result: [summary system message, recent msg 1, recent reply 1]
    expect(result[0]).toMatchObject({ role: 'system', content: expect.stringContaining('Summary') })
    expect(result[1]).toEqual({ role: 'user', content: 'recent msg 1' })
    expect(result[2]).toEqual({ role: 'assistant', content: 'recent reply 1' })
  })

  it('returns messages as-is if no older messages to compact', async () => {
    const mockGenerateText = vi.fn()
    const messages: CoreMessage[] = [
      { role: 'user', content: 'recent' },
    ]
    const fakeModel = {} as Parameters<typeof microcompactMessages>[2]
    const result = await microcompactMessages(fakeModel, messages, 5, mockGenerateText)
    expect(mockGenerateText).not.toHaveBeenCalled()
    expect(result).toEqual(messages)
  })
})
