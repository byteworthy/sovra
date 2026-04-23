# Migration Guides

This document covers the most common migrations into and beyond Sovra.

## Migration tracks

| Track | Source | Destination |
|---|---|---|
| A | Existing Next.js SaaS app | Sovra OSS foundation |
| B | Single-tenant app | Multi-tenant Sovra deployment |
| C | Sovra OSS | Klienta (agency vertical) |
| D | Sovra OSS | Clynova (healthcare vertical) |

## Track A: Existing SaaS to Sovra

1. Stand up Sovra in parallel (do not cut over in-place first).
2. Map your current auth model to Sovra auth + tenant membership.
3. Port domain entities into tenant-scoped tables.
4. Move AI routes/tool execution to Sovra agent/runtime boundaries.
5. Migrate observability and run release checks.

Recommended sequence:

1. Identity and tenant model
2. Core entities and RLS policies
3. Billing and metering
4. AI/chat and tool execution
5. Admin/reporting

## Track B: Single-tenant to multi-tenant

1. Add tenant identifier columns.
2. Backfill tenant IDs for existing rows.
3. Add and validate RLS policies.
4. Add tenant context to API requests and background jobs.
5. Re-run integration tests with cross-tenant negative cases.

Minimum test gate:

- user A cannot read/write tenant B resources
- API key scope is tenant-bound
- worker broadcast and MCP operations enforce tenant boundaries

## Track C and D: Sovra to paid vertical boilerplates

Sovra remains your core platform contract. Klienta and Clynova add vertical modules.

- Klienta adds: client portal patterns, multi-brand/agency workflows, white-label operational packaging.
- Clynova adds: healthcare-specific interoperability and compliance scaffolding.

Upgrade policy:

- Preserve existing Sovra tenant IDs and user IDs.
- Preserve existing auth/session boundaries.
- Add vertical modules incrementally by feature flag where possible.
- Keep data export path available during every migration phase.

## MCP SDK migration (legacy to current API)

If internal extensions still use old MCP registration helpers, migrate to explicit registration calls:

- `tool(...)` -> `registerTool(...)`
- `prompt(...)` -> `registerPrompt(...)`
- `resource(...)` -> `registerResource(...)`

And enforce schema-wrapped inputs:

- legacy raw object schemas -> `z.object(...)`

This aligns with current MCP TypeScript SDK migration guidance.

## Cutover plan template

Use `templates/migrations/cutover-checklist-template.md` and run a staged cutover:

1. Dry run migration in staging with production-like data volume.
2. Freeze writes for final sync window.
3. Execute migration and verification checks.
4. Shift traffic gradually.
5. Keep rollback window and snapshot ready.

## Rollback rules

Always define rollback before production cutover:

- point-in-time snapshot before schema/data move
- reversible config toggles for traffic routing
- defined owner and escalation path
