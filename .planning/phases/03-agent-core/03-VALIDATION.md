---
phase: 3
slug: agent-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 3 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x + @testing-library/react 16.x |
| **Config file** | `packages/web/vitest.config.ts` |
| **Quick run command** | `cd packages/web && npm test` |
| **Full suite command** | `cd packages/web && npm test -- --reporter=verbose` |
| **Estimated runtime** | ~12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd packages/web && npm test`
- **After every plan wave:** Run `cd packages/web && npm test -- --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 0 | AGNT-01 | - | Agent CRUD with tenant-scoped queries | unit | `npm test -- agent/` | - W0 | pending |
| 03-01-02 | 01 | 0 | AGNT-02 | - | Model config validated (provider, temperature, max_tokens) | unit | `npm test -- agent/` | - W0 | pending |
| 03-01-03 | 01 | 0 | AGNT-03 | - | Tools assignment stored as JSONB | unit | `npm test -- agent/` | - W0 | pending |
| 03-01-04 | 01 | 0 | AGNT-04 | - | System prompt persisted per agent | unit | `npm test -- agent/` | - W0 | pending |
| 03-01-05 | 01 | 0 | AGNT-05 | - | Agent status tracked (idle/running/error) | unit | `npm test -- agent/` | - W0 | pending |
| 03-02-01 | 02 | 1 | CHAT-01 | - | Chat UI renders messages in real-time | unit | `npm test -- chat/` | - W0 | pending |
| 03-02-02 | 02 | 1 | CHAT-02 | - | Streaming via useChat + toDataStreamResponse | unit | `npm test -- chat/` | - W0 | pending |
| 03-02-03 | 02 | 1 | CHAT-03 | - | Messages persisted to Supabase on stream complete | unit | `npm test -- chat/` | - W0 | pending |
| 03-02-04 | 02 | 1 | CHAT-04 | - | Conversation CRUD with tenant scope | unit | `npm test -- chat/` | - W0 | pending |
| 03-02-05 | 02 | 1 | CHAT-05 | - | Chat input supports code blocks | unit | `npm test -- chat/` | - W0 | pending |

*Status: pending | green | red | flaky*

---

## Wave 0 Requirements

- [ ] `packages/web/src/__tests__/agent/crud.test.ts` - stubs for AGNT-01..05
- [ ] `packages/web/src/__tests__/chat/ui.test.ts` - stubs for CHAT-01
- [ ] `packages/web/src/__tests__/chat/streaming.test.ts` - stubs for CHAT-02
- [ ] `packages/web/src/__tests__/chat/persistence.test.ts` - stubs for CHAT-03..04
- [ ] `packages/web/src/__tests__/chat/input.test.ts` - stubs for CHAT-05
- [ ] `packages/web/src/__tests__/helpers/ai-mock.ts` - shared AI SDK mock

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
