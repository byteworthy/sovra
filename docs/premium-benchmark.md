# Premium Benchmark Framework

This document defines the quality bar used to keep Sovra "paid-grade" while remaining open source.

## External baseline references

- Vercel Platforms Starter Kit: multi-tenant App Router reference architecture.
  - <https://github.com/vercel/platforms>
- Wasp OpenSaaS template: expected SaaS foundation surface (auth, billing, email, cron, docs).
  - <https://wasp.sh/docs/project/starter-templates>
- Hugging Face Inference Providers: OpenAI-compatible endpoint and provider routing suffix model.
  - <https://huggingface.co/docs/inference-providers/en/index>
  - <https://huggingface.co/changelog/inference-providers-openai-compatible>
- GitHub operational governance standards:
  - CODEOWNERS: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners>
  - PR templates: <https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository>
  - Dependabot cooldown controls: <https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference>
- OpenSSF Scorecard action baseline:
  - <https://github.com/ossf/scorecard-action>

## Sovra quality pillars

1. Product completeness
   - Multi-tenant SaaS core: auth, tenant isolation, RBAC, billing, auditability.
   - AI core: agent runtime, MCP client/server, vector search, multi-agent collaboration.
2. Production operations
   - Explicit runbooks, release process, production-readiness checklists.
   - Health endpoints and graceful shutdown coverage for web + worker.
3. Security and governance
   - Secret scanning, dependency scanning, SAST, CodeQL, go vuln checks.
   - CODEOWNERS, PR templates, Dependabot policy, security disclosure policy.
4. Provider strategy
   - OpenAI + Anthropic + Hugging Face provider adapters in one runtime contract.
   - Clear environment-variable and routing policy documentation.

## Current pass outcomes

- Added Hugging Face provider support to the same registry and agent form path as OpenAI/Anthropic.
- Added routing policy controls (`HUGGINGFACE_ROUTING_POLICY`) with explicit-suffix override behavior.
- Added adapter and registry tests for provider parity and regressions.
- Added operator docs for Hugging Face integration and production usage patterns.
- Updated release-readiness checks to enforce HF doc and env-var parity.
- Added OpenSSF Scorecard workflow with SARIF upload for continuous supply-chain scoring.
- Added Dependabot cooldown policy across npm/go/actions/docker ecosystems.
- Added provider fail-fast behavior so missing API keys return deterministic `503` responses instead of latent runtime failures.

## Final-pass gate

A polishing pass is considered complete when all conditions below are true on the target commit:

1. `pnpm --filter @sovra/web test`, `lint`, `typecheck`, and `build` are green.
2. `pnpm go:test` is green.
3. `./scripts/ci/release-readiness-checks.sh` passes.
4. README and docs tables link all operator-critical docs (`architecture`, `auth`, `worker`, `env`, `runbook`, `production-readiness`, `release-process`, `huggingface-integration`).
