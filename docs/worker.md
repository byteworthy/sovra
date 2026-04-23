# Go Worker

The Go worker (`packages/worker`) provides realtime collaboration, MCP tool execution, and inter-service APIs.

## Runtime ports

| Service | Default port | Purpose |
|---|---|---|
| HTTP health | `8080` | Health check endpoint (`/health`) |
| gRPC | `50051` | Internal service RPC + gRPC health service |
| MCP HTTP | `3001` | Model Context Protocol endpoint (`/mcp`) |
| Socket.IO | `3002` | Client realtime transport + `/internal/broadcast` |

## Startup and shutdown

Startup flow:

1. Load env config.
2. Validate production auth configuration.
3. Reject wildcard Socket.IO origins in production.
4. Connect to database (degraded mode if unavailable).
5. Start health, gRPC, MCP, and Socket.IO servers.

Shutdown flow:

- SIGINT/SIGTERM triggers graceful stop with a 30 second timeout.
- HTTP/MCP/Socket.IO drain in-flight requests.
- gRPC uses `GracefulStop()`.
- DB pool closes before process exit.

## Internal auth model

The worker protects internal routes via `INTERNAL_API_SECRET` bearer auth.

- `POST /internal/broadcast`
- `POST /mcp`

Behavior:

- `GO_ENV=production`: missing secret fails closed.
- non-production: missing secret is allowed for local development.

`SUPABASE_JWT_SECRET` is required in production for Socket.IO token verification.

## Socket.IO room isolation

Clients join composite rooms named `{tenantId}:{workspaceId}`.

- Prevents workspace collisions.
- Keeps broadcast scope tenant/workspace specific.
- Combines with DB checks in auth handler for membership validation.

## MCP tools shipped in OSS

Current worker tool registry includes:

- File operations (`file_read`, `file_write`, `file_list`) scoped to agent workspace path.
- Web utilities (`web_search`, `web_fetch`).
- Database/vector tooling (`semantic_search`).

Tools are implemented in `packages/worker/internal/mcp/tools` and tested with Go unit tests.

## Key env vars

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Worker database connection |
| `INTERNAL_API_SECRET` | Yes in production | Shared secret for `/mcp` and `/internal/broadcast` |
| `SUPABASE_JWT_SECRET` | Yes in production | Validates Socket.IO join tokens |
| `SOCKETIO_ALLOWED_ORIGINS` | Yes in production | Do not use `*` in production |
| `GO_ENV` | No | `development` or `production` |

See `docs/environment-variables.md` for complete details.

