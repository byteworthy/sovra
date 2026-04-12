---
phase: 03-agent-core
plan: 03
subsystem: chat-interface
tags: [streaming, useChat, ai-sdk, chat-ui, conversation-management, framer-motion]
dependency_graph:
  requires: [ai/adapter, ai/registry, agent/queries, chat/actions, chat/queries, auth/server, tenant/context]
  provides: [chat/route, chat/container, chat/message-list, chat/message-bubble, chat/input, chat/sidebar, chat/page]
  affects: [agent-status, conversation-persistence, streaming-ui]
tech_stack:
  added: []
  patterns: [useChat-hook, streamText-streaming, server-component-data-loading, client-state-management, framer-motion-variants]
key_files:
  created:
    - packages/web/app/api/chat/route.ts
    - packages/web/components/chat/chat-container.tsx
    - packages/web/components/chat/message-list.tsx
    - packages/web/components/chat/message-bubble.tsx
    - packages/web/components/chat/chat-input.tsx
    - packages/web/components/chat/conversation-sidebar.tsx
    - packages/web/app/(tenant)/t/[slug]/agents/[agentId]/chat/page.tsx
    - packages/web/app/(tenant)/t/[slug]/agents/[agentId]/chat/chat-page-client.tsx
    - packages/web/app/(tenant)/t/[slug]/agents/[agentId]/chat/loading.tsx
  modified:
    - packages/web/lib/motion.ts
    - packages/web/app/globals.css
    - packages/web/src/__tests__/ai/registry.test.ts
decisions:
  - "Used await streamText() since ai@3.4.33 returns Promise<StreamTextResult>"
  - "Created chat-page-client.tsx wrapper to manage conversation switching state between server page and client sidebar"
  - "Added messageEnter/slideInRight/jumpToLatest variants to motion.ts since Plan 02 runs in parallel"
metrics:
  duration: 382s
  completed: "2026-04-12T06:17:38Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 3
---

# Phase 03 Plan 03: Streaming Chat Interface Summary

Streaming chat POST route with auth and agent status tracking, real-time chat UI using useChat from ai@3.4.33, message persistence (user before stream, assistant onFinish), conversation sidebar with create/delete, code block rendering with copy, and auto-scroll with jump-to-latest pill.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Chat route handler + conversation sidebar + chat page | a2da7c6 | Done |
| 2 | Chat UI components (message-list, message-bubble, chat-input, chat-container) | c180533 | Done |

## What Was Built

### Chat Route Handler (1 file)
- `POST /api/chat` with Supabase auth check (401 on unauthenticated)
- Validates agentId, messages, conversationId in request body
- Loads agent via Supabase RLS-enforced query (tenant isolation)
- Sets agent status to `running` before stream, `idle` onFinish, `error` on failure
- Uses `await streamText()` with `toDataStreamResponse()` (ai@3.4.33 API)
- System prompt, temperature, maxTokens from agent config

### Chat Container (1 file)
- Orchestrates `useChat` from `ai/react` with `api: '/api/chat'`
- Passes `agentId` and `conversationId` in request body
- User messages saved via `saveMessage` before `handleSubmit`
- Assistant messages saved in `onFinish` callback
- Chat header with agent name and status badge (idle/running/error)
- Settings button placeholder for agent config sheet

### Message List (1 file)
- Scrollable message feed with `max-w-[720px]` centered layout
- Auto-scroll to bottom on new messages via `scrollIntoView`
- Manual scroll detection disables auto-scroll
- "Jump to latest" pill with AnimatePresence and jumpToLatest variant
- Empty state: "Start a conversation" centered text

### Message Bubble (1 file)
- User messages: right-aligned, `bg-[#1E3A5F]` blue bubble, `rounded-2xl rounded-br-sm`
- Assistant messages: left-aligned prose rendering, no background bubble
- Code block parsing via regex, rendered with `bg-[#0D0D0F]` container
- Copy button (Copy icon to Check icon for 2s) and language label on code blocks
- Inline code detection with backtick parsing
- Streaming cursor: blinking blue `w-[2px]` bar on last assistant message
- Framer Motion `messageEnter` variant on each bubble

### Chat Input (1 file)
- Auto-resizing textarea: `min-h-[56px]` to `max-h-[200px]`
- `bg-[#0D0D0F]` darker background, rounded-xl
- Placeholder: "Message {agentName}..."
- Enter submits (without Shift), Shift+Enter inserts newline, Cmd/Ctrl+Enter submits
- Send button: ArrowUp icon, becomes Square (stop) icon during streaming
- Disabled state with opacity-50 when input empty and not loading
- Autofocus on mount

### Conversation Sidebar (1 file)
- 280px left panel (`w-[280px]`), `bg-zinc-900/50`
- "New conversation" button calls `createConversation` server action
- Conversation list items: 56px tall, truncated title, active state with left blue border
- More menu with delete option and inline confirmation pattern
- Hidden on mobile (`hidden md:flex`)

### Chat Page (3 files)
- Server component: fetches agent, conversations, initial messages
- Auto-creates first conversation if none exist
- Client wrapper manages conversation switching state
- Loading skeleton with sidebar and message area placeholders

## Threat Mitigations Applied

| Threat ID | Mitigation | Verified |
|-----------|-----------|----------|
| T-03-09 (Spoofing) | `getUser()` check returns 401 before any DB or LLM calls | Yes |
| T-03-10 (Elevation) | Agent fetched via Supabase RLS; tenant_id enforced by policy | Yes |
| T-03-12 (DoS) | maxTokens from agent config (validated by Zod max 128000) | Yes |
| T-03-13 (Info Disclosure) | API keys from server env vars only; never in response | Yes |
| T-03-14 (Tampering) | Code blocks rendered as text nodes in pre/code elements | Yes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing animation variants to motion.ts**
- **Found during:** Task 1
- **Issue:** Plan 02 (wave 2 parallel) adds messageEnter, slideInRight, jumpToLatest variants but has not executed yet
- **Fix:** Added all three variants directly to motion.ts
- **Files modified:** packages/web/lib/motion.ts

**2. [Rule 3 - Blocking] Added missing CSS animations to globals.css**
- **Found during:** Task 1
- **Issue:** streaming-cursor and agent-status-running CSS classes referenced by Plan 02 not yet present
- **Fix:** Added @keyframes blink and pulse-dot animations with utility classes
- **Files modified:** packages/web/app/globals.css

**3. [Rule 3 - Blocking] Fixed pre-existing vi import in registry test**
- **Found during:** Task 1 type-check
- **Issue:** `vi.resetModules()` used but `vi` not imported from vitest
- **Fix:** Added `vi` to vitest import destructuring
- **Files modified:** packages/web/src/__tests__/ai/registry.test.ts

**4. [Rule 1 - Bug] Used await with streamText()**
- **Found during:** Task 1 type-check
- **Issue:** ai@3.4.33 streamText returns Promise<StreamTextResult>, not direct result
- **Fix:** Added await before streamText() call
- **Files modified:** packages/web/app/api/chat/route.ts

**5. [Rule 2 - Missing] Created chat-page-client.tsx wrapper**
- **Found during:** Task 1
- **Issue:** Server component page cannot manage client-side conversation switching state
- **Fix:** Created ChatPageClient component to bridge server data loading and client state
- **Files modified:** packages/web/app/(tenant)/t/[slug]/agents/[agentId]/chat/chat-page-client.tsx

## Known Stubs

None. All exports are fully wired implementations. The Settings button in the chat header is intentionally a placeholder (links to agent config sheet from a future plan).

## Self-Check: PASSED

- All 9 created files exist on disk
- Commit a2da7c6 found in git log
- Commit c180533 found in git log
- TypeScript type-check passes clean
