---
phase: 4
slug: ai-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 4 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (TS)** | Vitest 2.x + @testing-library/react 16.x |
| **Framework (Go)** | go test |
| **Config file** | `packages/web/vitest.config.ts` |
| **Quick run command (TS)** | `cd packages/web && npm test` |
| **Quick run command (Go)** | `cd packages/worker && go test ./...` |
| **Full suite command** | `cd packages/web && npm test -- --reporter=verbose && cd ../worker && go test -v ./...` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run relevant test suite (TS or Go)
- **After every plan wave:** Run full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 04-01-01 | 01 | 0 | MCP-03 | unit | `npm test -- tools/` | pending |
| 04-01-02 | 01 | 0 | MCP-04,05,06 | unit | `npm test -- tools/` | pending |
| 04-01-03 | 01 | 0 | MCP-07,08 | unit | `npm test -- tools/` | pending |
| 04-02-01 | 02 | 1 | MCP-01 | unit | `npm test -- mcp/` | pending |
| 04-02-02 | 02 | 1 | MCP-02 | unit | `go test -v ./mcp/...` | pending |
| 04-03-01 | 03 | 1 | VECT-01,02 | unit | `npm test -- vector/` | pending |
| 04-03-02 | 03 | 1 | VECT-03,04,05 | unit | `npm test -- vector/` | pending |

*Status: pending | green | red | flaky*

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
