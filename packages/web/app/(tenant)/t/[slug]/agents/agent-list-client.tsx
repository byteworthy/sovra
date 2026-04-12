'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bot, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AgentCard } from '@/components/agent/agent-card'
import { AgentForm } from '@/components/agent/agent-form'
import { deleteAgent } from '@/lib/agent/actions'
import { useToast } from '@/lib/toast'

interface Agent {
  id: string
  name: string
  description: string | null
  model_provider: string
  model_name: string
  status?: 'idle' | 'running' | 'error'
  system_prompt: string | null
  temperature: number
  max_tokens: number
  tools: string[]
}

interface AgentListClientProps {
  agents: Agent[]
  tenantId: string
  tenantSlug: string
}

export function AgentListClient({ agents, tenantId, tenantSlug }: AgentListClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  async function handleDelete(agentId: string) {
    if (deleting) return
    setDeleting(agentId)
    try {
      const { error } = await deleteAgent(tenantId, agentId)
      if (error) {
        toast('error', 'Failed to delete', error)
        return
      }
      toast('success', 'Agent deleted')
      refresh()
    } catch {
      toast('error', 'Something went wrong')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Agents</h2>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create agent
        </Button>
      </div>

      {/* Agent grid or empty state */}
      {agents.length === 0 ? (
        <EmptyState
          icon={<Bot className="h-8 w-8" />}
          heading="No agents yet"
          body="Create your first AI agent to start chatting."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create agent
            </Button>
          }
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.04 }}
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              tenantSlug={tenantSlug}
              onEdit={(a) => setEditAgent(agents.find((ag) => ag.id === a.id) ?? null)}
              onDelete={handleDelete}
            />
          ))}
        </motion.div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <AgentForm
          mode="create"
          tenantId={tenantId}
          onSuccess={() => {
            setShowCreate(false)
            refresh()
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Edit sheet */}
      {editAgent && (
        <AgentForm
          mode="edit"
          agent={editAgent}
          tenantId={tenantId}
          onSuccess={() => {
            setEditAgent(null)
            refresh()
          }}
          onCancel={() => setEditAgent(null)}
        />
      )}
    </div>
  )
}
