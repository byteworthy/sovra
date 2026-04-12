# Phase 6: Production Ready - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss)

<domain>
## Phase Boundary

Add billing, admin, deployment configs, and monitoring. This phase delivers:
- Subscription management via Lemon Squeezy (BILL-01 through BILL-05)
- Plan definitions (free, pro, enterprise) with usage limits
- Usage tracking per tenant
- Customer portal access
- Webhook handling for subscription events
- Admin dashboard UI (ADMIN-01 through ADMIN-05)
- Tenant management (CRUD) for admins
- User management for admins
- System analytics overview
- Audit logs viewer
- API key creation and authentication (APIK-01 through APIK-05)
- Rate limiting per API key
- API key usage tracking and expiration
- Railway deployment config (DEPL-01)
- AWS deployment config (DEPL-02)
- GCP deployment config (DEPL-03)
- GitHub Actions CI/CD (DEPL-04)
- Environment documentation (DEPL-05)
- Sentry integration (MON-01)
- PostHog integration (MON-02)
- Health check endpoints (MON-03)
- Custom metrics (MON-04)

Requirements: BILL-01 through BILL-05 (billing), ADMIN-01 through ADMIN-05 (admin), APIK-01 through APIK-05 (API keys), DEPL-01 through DEPL-05 (deployment), MON-01 through MON-04 (monitoring).

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion -- discuss phase was skipped per user setting. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from prior phases:
- Tenant-scoped everything via RLS -- admin must have super-admin role bypass
- Next.js App Router with Supabase auth
- Go worker for background processing
- Open-source flexibility -- billing provider must be swappable (Lemon Squeezy default, Stripe alternative)
- No em dashes in copywriting
- Premium UI for admin dashboard
- ai@3.4.33 SDK constraint
- Deployment configs should work for self-hosted deployments

</decisions>

<code_context>
## Existing Code Insights

Codebase context will be gathered during plan-phase research.

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- discuss phase skipped. Refer to ROADMAP phase description and success criteria.

</specifics>

<deferred>
## Deferred Ideas

None -- discuss phase skipped.

</deferred>
