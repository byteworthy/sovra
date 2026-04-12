/**
 * Typed event catalog for PostHog tracking.
 *
 * Properties listed in comments describe the shape callers should send.
 * PostHog accepts arbitrary properties — these are documentation only.
 */
export const EVENTS = {
  /** properties: agentId, model, durationMs, tokenCount */
  agent_execution: 'agent_execution',

  /** properties: toolName, agentId, durationMs, success */
  tool_usage: 'tool_usage',

  /** properties: workspaceId, mode, agentCount, durationMs */
  workspace_run: 'workspace_run',

  /** properties: keyPrefix, permissions */
  api_key_created: 'api_key_created',

  /** properties: keyPrefix */
  api_key_revoked: 'api_key_revoked',

  /** properties: plan, previousPlan, event */
  subscription_changed: 'subscription_changed',

  /** properties: plan */
  billing_portal_opened: 'billing_portal_opened',
} as const

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]
