---
phase: 06-production-ready
plan: "06"
subsystem: deployment
tags: [deployment, railway, aws-ecs, gcp-cloud-run, github-actions, ci-cd, docker]
dependency_graph:
  requires: ["06-01", "06-05"]
  provides: ["platform-configs", "ci-cd-workflows", "env-documentation"]
  affects: ["deployment", "onboarding"]
tech_stack:
  added: []
  patterns:
    - Railway TOML deployment config
    - AWS ECS Fargate task definitions with Secrets Manager ARN refs
    - GCP Cloud Run Knative service specs with Secret Manager
    - GitHub Actions with pnpm/action-setup and docker/build-push-action@v6
    - GHA layer caching (type=gha) scoped per service
key_files:
  created:
    - platform/railway/railway.web.toml
    - platform/railway/railway.worker.toml
    - platform/aws/task-definition.web.json
    - platform/aws/task-definition.worker.json
    - platform/aws/ecs-service.json
    - platform/gcp/service.web.yaml
    - platform/gcp/service.worker.yaml
    - platform/gcp/cloudbuild.yaml
    - .github/workflows/ci.yml
    - .github/workflows/deploy.yml
    - docs/deployment.md
    - docs/environment-variables.md
  modified:
    - .env.example
decisions:
  - Stripe used for billing env vars (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_ENTERPRISE) per project constraints, not Lemon Squeezy as written in plan
  - GCP Cloud Run services set ingress internal for worker, all for web
  - runAsNonRoot securityContext added to GCP service specs (Rule 2 - security)
  - pnpm --filter @sovra/web test used (monorepo pattern) rather than bare pnpm test
metrics:
  duration_minutes: 18
  completed_date: "2026-04-12T16:18:51Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 12
  files_modified: 1
requirements:
  - DEPL-01
  - DEPL-02
  - DEPL-03
  - DEPL-04
  - DEPL-05
---

# Phase 06 Plan 06: Deployment Infrastructure Summary

Railway, AWS ECS Fargate, and GCP Cloud Run configs plus GitHub Actions CI/CD and comprehensive environment documentation covering all required/optional vars with graceful degradation.

## Tasks Completed

| Task | Name | Commit | Files |
|---|---|---|---|
| 1 | Platform deployment configs | b506c08 | platform/railway/\*, platform/aws/\*, platform/gcp/\* (8 files) |
| 2 | GitHub Actions CI/CD + environment documentation | 945a976 | .github/workflows/\*, .env.example, docs/deployment.md, docs/environment-variables.md |

## What Was Built

### Platform Configs (Task 1)

**Railway** (`platform/railway/`):
- `railway.web.toml` - Next.js web service with healthcheckPath `/api/health`, watchPaths for packages/web and packages/shared
- `railway.worker.toml` - Go worker service with healthcheckPath `/health`, watchPaths for packages/worker and packages/shared

**AWS ECS Fargate** (`platform/aws/`):
- `task-definition.web.json` - family sovra-web, 512 CPU/1024 MB, port 3000, health check `curl -f http://localhost:3000/api/health`, secrets via Secrets Manager ARNs
- `task-definition.worker.json` - family sovra-worker, 512 CPU/1024 MB, ports 8080+50051, health check via wget
- `ecs-service.json` - service definitions for both services with deployment circuit breaker and rollback enabled

**GCP Cloud Run** (`platform/gcp/`):
- `service.web.yaml` - Knative v1 service sovra-web, 1 CPU/1Gi memory, port 3000, `runAsNonRoot: true`, secrets from Secret Manager
- `service.worker.yaml` - Knative v1 service sovra-worker, internal ingress only, 1 CPU/1Gi memory, port 8080
- `cloudbuild.yaml` - 6-step pipeline: build web, build worker, push web, push worker, deploy web, deploy worker; `E2_HIGHCPU_8` machine

### CI/CD Workflows (Task 2)

**`.github/workflows/ci.yml`**:
- Triggers on pull_request with path filters: packages/web/\*\*, packages/shared/\*\*, packages/worker/\*\*
- Jobs: test-web (pnpm --filter @sovra/web test + typecheck), lint (pnpm --filter @sovra/web lint), test-worker (go test ./...)
- pnpm 9, Node 20, Go version from go.mod, concurrency cancel-in-progress

**`.github/workflows/deploy.yml`**:
- Triggers on push to main (same path filters)
- Builds web and worker images using docker/build-push-action@v6
- Pushes to GHCR (ghcr.io) with SHA + latest tags
- GHA layer cache scoped per service (type=gha,scope=web / type=gha,scope=worker)

### Environment Documentation (Task 2)

**`.env.example`** (86 lines):
- Expanded from 17-line dev-only file to full reference with grouped sections
- Supabase, Database, Go Worker, AI Providers, App, Stripe, Upstash, Sentry, PostHog, Brave Search
- Dev defaults preserved for local development vars

**`docs/deployment.md`** (333 lines):
- Step-by-step guides for all 4 deployment options: Docker Compose, Railway, GCP Cloud Run, AWS ECS
- Health check reference table, CI/CD section, env vars cross-reference
- No em dashes in copy per project constraints

**`docs/environment-variables.md`**:
- Full reference table: Name | Required | Default | Description
- Each category with required/optional flags
- Graceful degradation noted for Stripe, Upstash, Sentry, PostHog

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added runAsNonRoot to GCP service specs**
- Found during: Task 1 (semgrep post-tool scan)
- Issue: GCP Cloud Run service YAMLs lacked `securityContext.runAsNonRoot: true`
- Fix: Added `securityContext: runAsNonRoot: true` to both service.web.yaml and service.worker.yaml spec sections
- Files modified: platform/gcp/service.web.yaml, platform/gcp/service.worker.yaml
- Commit: b506c08

### Plan Deviations (non-bug)

**Stripe instead of Lemon Squeezy for billing vars**
- Plan text listed LEMONSQUEEZY_\* vars in .env.example
- Project `important_constraints` explicitly require Stripe (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_PRO, STRIPE_PRICE_ID_ENTERPRISE)
- CLAUDE.md constraints take precedence - used Stripe vars throughout
- package.json also has `stripe` dependency confirming Stripe is the billing provider

## Known Stubs

None. All files are configuration/documentation only - no runtime stubs.

## Threat Flags

No new network endpoints, auth paths, or schema changes introduced. All secrets are referenced via cloud secret manager ARNs or env var placeholders (no plaintext values). .env.example contains only empty placeholders per T-06-20 mitigation.

## Self-Check: PASSED

Files verified:
- platform/railway/railway.web.toml: FOUND
- platform/railway/railway.worker.toml: FOUND
- platform/aws/task-definition.web.json: FOUND
- platform/aws/task-definition.worker.json: FOUND
- platform/aws/ecs-service.json: FOUND
- platform/gcp/service.web.yaml: FOUND
- platform/gcp/service.worker.yaml: FOUND
- platform/gcp/cloudbuild.yaml: FOUND
- .github/workflows/ci.yml: FOUND
- .github/workflows/deploy.yml: FOUND
- .env.example: FOUND (86 lines)
- docs/deployment.md: FOUND (333 lines)
- docs/environment-variables.md: FOUND

Commits verified:
- b506c08: chore(06-06): add platform deployment configs
- 945a976: chore(06-06): add CI/CD workflows, .env.example, and deployment docs
