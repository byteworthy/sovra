# Hugging Face Integration

Sovra supports Hugging Face Inference Providers as an optional third chat provider via the OpenAI-compatible router.

## What ships in OSS

- Provider adapter: `packages/web/lib/ai/huggingface-adapter.ts`
- Provider registry integration: `packages/web/lib/ai/registry.ts`
- Agent model catalog entries: `packages/web/lib/agent/types.ts`
- Coverage tests:
  - `packages/web/src/__tests__/ai/huggingface-adapter.test.ts`
  - `packages/web/src/__tests__/ai/registry.test.ts`
  - `packages/web/src/__tests__/agent/types.test.ts`

## Configuration

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `HUGGINGFACE_API_KEY` | Yes (if using HF provider) | - | Token used for Hugging Face Inference Providers |
| `HUGGINGFACE_BASE_URL` | No | `https://router.huggingface.co/v1` | OpenAI-compatible HF endpoint |
| `HUGGINGFACE_ROUTING_POLICY` | No | `fastest` | Model suffix policy for model IDs without explicit suffix |

## Routing behavior

Sovra appends `HUGGINGFACE_ROUTING_POLICY` only when the selected model name has no suffix.

Examples:

- `deepseek-ai/DeepSeek-R1` with `HUGGINGFACE_ROUTING_POLICY=cheapest` -> `deepseek-ai/DeepSeek-R1:cheapest`
- `openai/gpt-oss-120b:sambanova` -> unchanged

This allows teams to define a global routing default while still pinning critical agents to a specific provider suffix.

## Operational guidance

1. Keep at least one non-Hugging Face provider key configured (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) for fallback.
2. Start with `HUGGINGFACE_ROUTING_POLICY=fastest`, then tune based on latency/cost targets.
3. For strict latency/cost control, pin production-critical agents to explicit suffixes (for example `:sambanova`).

## References

- Hugging Face Inference Providers docs: <https://huggingface.co/docs/inference-providers/en/index>
- HF OpenAI-compatible changelog note: <https://huggingface.co/changelog/inference-providers-openai-compatible>
