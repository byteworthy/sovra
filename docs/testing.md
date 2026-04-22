# Testing Guide

Sovra uses Vitest for the web app and Go's `testing` package for the worker.

## Quick commands

From repo root:

```bash
pnpm install
pnpm lint
pnpm test
pnpm typecheck
pnpm --filter @sovra/web build
pnpm go:test
pnpm go:build
```

Targeted commands:

```bash
# Web only
pnpm --filter @sovra/web test
pnpm --filter @sovra/web lint
pnpm --filter @sovra/web typecheck

# Worker only
cd packages/worker
go test ./...
go vet ./...
go test -run TestInternalAuthMiddleware ./internal/socketio/...
```

## Web testing conventions

- Test files are colocated or in `__tests__/` directories.
- Use module mocks for auth, external providers, and server adapters.
- Validate both happy-path and failure-path behavior.
- Prefer deterministic unit tests for orchestration logic.

## Worker testing conventions

- Keep tests adjacent to source (`*_test.go`).
- Use `httptest` for HTTP handlers/middleware.
- Cover auth behavior for internal endpoints and Socket.IO join paths.
- Add config validation tests for production-only constraints.

## Required quality gates before merge

1. Web lint + typecheck + test + build all pass.
2. Worker `go vet`, `go test`, and `go build` pass.
3. Security workflow has no blocking failures.
4. Release-readiness workflow passes docs/trust checks.

## Adding tests for new code

When adding a feature:

1. Add unit tests for core logic.
2. Add auth/permission tests for any route/action changes.
3. Add regression tests for bug fixes.
4. Update `CHANGELOG.md` and docs if behavior changed.

