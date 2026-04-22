#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "Running release-readiness documentation and trust checks..."

required_files=(
  "README.md"
  "CHANGELOG.md"
  "SECURITY.md"
  "SUPPORT.md"
  "docs/architecture.md"
  "docs/auth-framework.md"
  "docs/deployment.md"
  "docs/environment-variables.md"
  "docs/huggingface-integration.md"
  "docs/premium-benchmark.md"
  "docs/operations-runbook.md"
  "docs/production-readiness.md"
  "docs/release-process.md"
  "docs/testing.md"
  "docs/worker.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
done

check_contains() {
  local file="$1"
  local pattern="$2"

  if command -v rg >/dev/null 2>&1; then
    rg -q --fixed-strings "$pattern" "$file" || {
      echo "Expected pattern not found in $file: $pattern"
      exit 1
    }
    return 0
  fi

  if ! grep -Fq "$pattern" "$file"; then
    echo "Expected pattern not found in $file: $pattern"
    exit 1
  fi
}

# Trust docs must remain discoverable from README.
check_contains "README.md" "docs/release-process.md"
check_contains "README.md" "docs/auth-framework.md"
check_contains "README.md" "docs/huggingface-integration.md"
check_contains "README.md" "docs/premium-benchmark.md"
check_contains "README.md" "docs/operations-runbook.md"
check_contains "README.md" "docs/production-readiness.md"
check_contains "README.md" "SECURITY.md"
check_contains "README.md" "SUPPORT.md"

# Security/support docs must preserve response expectations.
check_contains "SECURITY.md" "security@byteworthy.io"
check_contains "SECURITY.md" "INTERNAL_API_SECRET"
check_contains "SUPPORT.md" "support@byteworthy.io"
check_contains "SUPPORT.md" "P1"

# Changelog hygiene.
check_contains "CHANGELOG.md" "## [Unreleased]"

# Worker routing/auth env parity across templates and docs.
check_contains ".env.example" "WORKER_INTERNAL_URL"
check_contains ".env.example" "SUPABASE_JWT_SECRET"
check_contains ".env.example" "HUGGINGFACE_BASE_URL"
check_contains ".env.example" "HUGGINGFACE_ROUTING_POLICY"
check_contains "packages/web/.env.example" "WORKER_INTERNAL_URL"
check_contains "packages/web/.env.example" "HUGGINGFACE_BASE_URL"
check_contains "packages/web/.env.example" "HUGGINGFACE_ROUTING_POLICY"
check_contains "docs/environment-variables.md" "WORKER_INTERNAL_URL"
check_contains "docs/environment-variables.md" "SUPABASE_JWT_SECRET"
check_contains "docs/environment-variables.md" "HUGGINGFACE_BASE_URL"
check_contains "docs/environment-variables.md" "HUGGINGFACE_ROUTING_POLICY"

# Governance/supply-chain baseline.
check_contains ".github/dependabot.yml" "cooldown:"
check_contains ".github/workflows/scorecard.yml" "ossf/scorecard-action"
check_contains ".github/workflows/scorecard.yml" "upload-sarif"
check_contains ".github/workflows/ci.yml" "actionlint"

echo "Release-readiness checks passed."
