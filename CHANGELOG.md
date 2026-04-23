# Changelog

All notable changes to Sovra will be documented in this file.

The format is based on Keep a Changelog and this project follows Semantic Versioning.

## [Unreleased]

### Added
- GitHub Pages marketing site with SEO metadata, structured data, robots, and sitemap (`site/*`, `.github/workflows/pages.yml`).
- LLM/GEO index file for discoverability (`llms.txt`) and README discovery references.
- Local bootstrap script and npm shortcuts for simpler first-run onboarding (`scripts/setup/bootstrap-local.sh`, `setup:local`, `setup:local:start`).
- First-run onboarding checklist template (`templates/onboarding/first-run-checklist-template.md`).
- Dedicated fuzzing workflow (`.github/workflows/fuzz.yml`) and worker fuzz tests for config/auth validation invariants.
- Customer onboarding DX guide and reusable launch/cutover/upgrade templates (`docs/customer-onboarding-dx.md`, `templates/*`).
- Migration and upgrade path documentation for Sovra -> Klienta/Clynova (`docs/migration-guides.md`, `docs/upgrade-paths.md`).
- Open-source packaging/licensing boundary and compatibility contract documentation (`docs/open-source-packaging.md`).
- SEO/AEO/GEO publishing playbook and marketing templates for launch content operations (`docs/seo-aeo-geo-guidelines.md`, `templates/marketing/*`).
- Commercial checkout and billing security policy doc for paid product routing and Stripe key handling (`docs/commercial-checkout-and-billing.md`).
- Premium visual assets for GitHub Pages marketing surface (`site/assets/*`).
- Multi-page SEO marketing surface for quickstart, MCP-specific intent, and build-vs-buy comparison (`site/quickstart.html`, `site/mcp-boilerplate.html`, `site/compare.html`).
- Launch foundation execution guide and production launch scorecard template (`docs/launch-foundation.md`, `templates/onboarding/production-launch-scorecard-template.md`).
- Dedicated launch foundation page for onboarding and release gating discoverability (`site/foundation.html`).
- Growth operations toolkit (`templates/growth/*`), editorial style guide (`docs/marketing-editorial-guidelines.md`), and growth experiment issue template (`.github/ISSUE_TEMPLATE/growth_experiment.yml`).
- PNG social preview asset for broader unfurl compatibility (`site/assets/sovra-social-card.png`).
- Release-readiness gate workflow with docs/trust integrity checks.
- Enterprise operations documentation set (`architecture`, `worker`, `testing`, `operations-runbook`, `production-readiness`, `release-process`).
- Broadcast client tests for private worker URL routing and failure handling.
- Worker config tests for production auth validation behavior.
- Auth redirect helper framework to sanitize and propagate safe `next` paths across middleware, login/signup UI, and callback flows.
- Auth/middleware framework doc (`docs/auth-framework.md`).
- Hugging Face chat provider adapter with routing-policy support (`docs/huggingface-integration.md`, `HUGGINGFACE_BASE_URL`, `HUGGINGFACE_ROUTING_POLICY`).
- Hugging Face provider test coverage (`packages/web/src/__tests__/ai/huggingface-adapter.test.ts`) and provider/model registry expansion.
- Premium benchmark framework doc (`docs/premium-benchmark.md`) capturing external OSS/security baselines and final-pass gate criteria.
- OpenSSF Scorecard workflow (`.github/workflows/scorecard.yml`) with SARIF upload to code scanning.
- AI provider configuration tests (`packages/web/src/__tests__/ai/provider-config.test.ts`) for deterministic missing-key behavior.
- Structured `/api/health` response with readiness checks for Supabase, worker config, and AI provider configuration.
- Environment validation tests for worker/Hugging Face config schemas (`packages/web/lib/env.test.ts`).

### Changed
- Security workflow now pins `govulncheck` to an explicit version and runs Semgrep via a digest-pinned container image.
- CI actionlint invocation now pins tool version (`v1.7.12`) instead of floating `latest`.
- Workflow token permissions are scoped more tightly (top-level read defaults, job-level write only where required).
- Dockerfiles now pin base images by digest for reproducible and safer supply-chain builds.
- README expanded with onboarding DX, migration, upgrade-path, and packaging references.
- README and `llms.txt` now point to canonical `master` branch docs and include SEO/AEO/GEO plus checkout policy references.
- GitHub Pages site redesigned with richer product-line storytelling, structured FAQ data, and launch-focused resource routing.
- GitHub Pages metadata now points to PNG social preview URLs for Open Graph and Twitter cards.
- README hero branding now uses a local repo asset to avoid broken external logo references.
- Sitemap expanded to include multi-page marketing routes for stronger crawl coverage.
- README, llms index, and Pages navigation now route to the launch foundation path.
- Branch reference hygiene updated to use `master` consistently in release process docs and maintenance/release-readiness workflows.
- Contributing guide now references `master` as release branch and includes growth experiment template usage.
- Worker startup now validates auth secrets in production and rejects wildcard Socket.IO origins.
- Worker servers (health, gRPC, MCP, Socket.IO) now support graceful shutdown with a 30 second drain window.
- Internal worker routes (`/internal/broadcast`, `/mcp`) now fail closed in production when `INTERNAL_API_SECRET` is missing.
- Web broadcast client now prefers `WORKER_INTERNAL_URL`, checks non-2xx responses, and surfaces transport errors.
- CI and security workflows upgraded to stricter quality/security gates.
- Environment variable templates and docs aligned to current runtime behavior (`WORKER_INTERNAL_URL`, `WORKER_HEALTH_URL`, `SUPABASE_JWT_SECRET`).
- Middleware now returns JSON 401 for unauthenticated API requests (instead of redirecting APIs to HTML login routes).
- Login/signup and OAuth/magic-link flows now preserve sanitized `next` return paths.
- Agent provider surface now includes OpenAI, Anthropic, and Hugging Face model catalogs in the same form/runtime path.
- AI adapters now fail fast on missing provider API keys, and chat route maps known provider-resolution failures to sanitized `503` responses.
- Dependabot now uses cooldown policies to reduce noisy update churn while preserving security cadence.
- Operations/deployment docs now require `status: "ok"` health verification (not only endpoint reachability).
- CI now runs GitHub Actions workflow linting (`actionlint`) to catch workflow regressions earlier.

### Fixed
- Removed worker URL confusion by separating Socket.IO/broadcast, internal, and health endpoint configuration.
- Fixed auth UI links that previously pointed to non-existent routes (`/forgot-password`, `/signup`).

## [1.0.0] - 2026-04-15

### Added
- Initial OSS release of Sovra.
- Multi-tenant SaaS foundation with Supabase auth and RLS.
- Go worker with MCP server, Socket.IO collaboration, and gRPC health service.
- Admin dashboard, API keys, Stripe billing hooks, and deployment scaffolding.
