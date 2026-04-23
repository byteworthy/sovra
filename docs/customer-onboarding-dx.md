# Customer Onboarding DX

This guide standardizes onboarding for teams adopting Sovra in production.

## Outcomes

- A new team can run Sovra locally in under 30 minutes.
- A production-ready environment can be staged in under 2 business days.
- Security, tenancy, and observability baselines are validated before go-live.

## Onboarding tracks

| Track | Target user | Goal |
|---|---|---|
| Builder Quickstart | Developer evaluating Sovra | Local app + worker + Supabase up and running |
| Production Bootstrapping | Engineering team | Staging deployment with secure env config and health checks |
| Upgrade Planning | Teams growing beyond core OSS | Clear path to Klienta or Clynova without re-platforming |

## 30-minute builder quickstart

1. Clone and install:
   ```bash
   git clone https://github.com/ByteWorthyLLC/sovra.git
   cd sovra
   pnpm install
   ```
2. Start local Supabase:
   ```bash
   supabase start
   ```
3. Configure environment:
   ```bash
   cp .env.example .env.local
   cp packages/web/.env.example packages/web/.env.local
   ```
4. Run web:
   ```bash
   cd packages/web
   pnpm dev
   ```
5. Run worker (optional but recommended for full agent flows):
   ```bash
   cd ../../packages/worker
   go run ./cmd/worker
   ```

## Production bootstrapping checklist

Use this sequence for first customer environments:

1. Create isolated infra per environment (`dev`, `staging`, `prod`).
2. Configure required secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `INTERNAL_API_SECRET`
   - provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `HUGGINGFACE_API_KEY`) as needed
3. Configure tenant-safe worker settings:
   - `SOCKETIO_ALLOWED_ORIGINS` must not be wildcard in production
   - `WORKER_INTERNAL_URL` must be private/internal
4. Deploy web and worker separately.
5. Validate:
   - web health: `/api/health`
   - worker health: `/health`
   - authenticated request path
   - tenant isolation behavior
6. Run release gate:
   ```bash
   ./scripts/ci/release-readiness-checks.sh
   ```

## MCP production guidance (Context7-aligned)

Sovra follows current MCP SDK guidance for production:

- Prefer explicit MCP registration APIs (`registerTool`, `registerPrompt`, `registerResource`) over legacy helpers.
- Use strict schemas (`z.object(...)`) for tool inputs and outputs.
- Use Streamable HTTP transport for remote MCP communication where applicable.
- Protect HTTP MCP endpoints with auth and host validation.

Reference:
- `docs/architecture.md`
- `docs/worker.md`
- `docs/migration-guides.md` (MCP API migration section)

## Reusable templates

Use templates in this repository when onboarding customers:

- `templates/onboarding/customer-launch-plan-template.md`
- `templates/migrations/cutover-checklist-template.md`
- `templates/upgrade/boilerplate-evaluation-template.md`

## Exit criteria

Onboarding is complete only when:

1. CI, Security, and Release Readiness workflows are green on target commit.
2. Production readiness checklist is complete (`docs/production-readiness.md`).
3. Incident escalation owner is named and runbook links are shared with operators.
