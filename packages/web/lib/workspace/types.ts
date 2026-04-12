import { z } from 'zod'

export const COLLABORATION_MODES = [
  'round_robin',
  'parallel',
  'sequential',
  'hierarchical',
  'democratic',
] as const

export type CollaborationMode = (typeof COLLABORATION_MODES)[number]

export const MEMORY_STRATEGIES = [
  'conversation',
  'summary',
  'vector',
  'hybrid',
] as const

export type MemoryStrategy = (typeof MEMORY_STRATEGIES)[number]

export const CONFLICT_RESOLUTIONS = ['vote', 'hierarchy', 'consensus'] as const

export type ConflictResolution = (typeof CONFLICT_RESOLUTIONS)[number]

export const AGENT_ROLES = ['leader', 'member'] as const

export type AgentRole = (typeof AGENT_ROLES)[number]

export interface Workspace {
  id: string
  tenant_id: string
  name: string
  description: string | null
  collaboration_mode: CollaborationMode
  conflict_resolution: ConflictResolution
  memory_strategy: MemoryStrategy
  compression_enabled: boolean
  compression_threshold: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceAgent {
  id: string
  tenant_id: string
  workspace_id: string
  agent_id: string
  role: AgentRole
  position: number
  created_at: string
}

export interface SharedMemoryEntry {
  id: string
  tenant_id: string
  workspace_id: string
  key: string
  value: unknown
  updated_by: string | null
  created_at: string
  updated_at: string
}

export const workspaceFormSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  collaboration_mode: z.enum(COLLABORATION_MODES),
  memory_strategy: z.enum(MEMORY_STRATEGIES).default('conversation'),
  conflict_resolution: z.enum(CONFLICT_RESOLUTIONS).default('vote'),
  compression_enabled: z.boolean().default(true),
  compression_threshold: z.number().int().min(0).max(100).default(80),
  agent_ids: z.array(z.string().uuid()).default([]),
})

export type WorkspaceFormData = z.infer<typeof workspaceFormSchema>
