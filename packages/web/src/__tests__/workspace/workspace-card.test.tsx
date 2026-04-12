import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkspaceCard } from '@/components/workspace/workspace-card'
import type { Workspace } from '@/lib/workspace/types'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/t/test-tenant/workspaces',
}))

const baseWorkspace: Workspace = {
  id: 'ws-1',
  tenant_id: 'tenant-1',
  name: 'My Workspace',
  description: 'Test workspace',
  collaboration_mode: 'round_robin',
  conflict_resolution: 'vote',
  memory_strategy: 'conversation',
  compression_enabled: true,
  compression_threshold: 80,
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('WorkspaceCard', () => {
  it('renders workspace name', () => {
    render(
      <WorkspaceCard
        workspace={baseWorkspace}
        agentCount={3}
        tenantSlug="test-tenant"
      />
    )
    expect(screen.getByText('My Workspace')).toBeDefined()
  })

  it('renders agent count', () => {
    render(
      <WorkspaceCard
        workspace={baseWorkspace}
        agentCount={3}
        tenantSlug="test-tenant"
      />
    )
    expect(screen.getByText('3 agents')).toBeDefined()
  })

  it('renders singular agent count', () => {
    render(
      <WorkspaceCard
        workspace={baseWorkspace}
        agentCount={1}
        tenantSlug="test-tenant"
      />
    )
    expect(screen.getByText('1 agent')).toBeDefined()
  })

  it('renders round_robin mode badge', () => {
    render(
      <WorkspaceCard workspace={baseWorkspace} agentCount={2} tenantSlug="test-tenant" />
    )
    expect(screen.getByText('Round robin')).toBeDefined()
  })

  it('renders parallel mode badge', () => {
    const ws = { ...baseWorkspace, collaboration_mode: 'parallel' as const }
    render(<WorkspaceCard workspace={ws} agentCount={2} tenantSlug="test-tenant" />)
    expect(screen.getByText('Parallel')).toBeDefined()
  })

  it('renders memory strategy tag', () => {
    render(
      <WorkspaceCard workspace={baseWorkspace} agentCount={2} tenantSlug="test-tenant" />
    )
    expect(screen.getByText('Conversation')).toBeDefined()
  })

  it('links to workspace detail page', () => {
    render(
      <WorkspaceCard workspace={baseWorkspace} agentCount={2} tenantSlug="test-tenant" />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/t/test-tenant/workspaces/ws-1')
  })
})
