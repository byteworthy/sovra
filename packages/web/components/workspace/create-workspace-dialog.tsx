'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Check } from 'lucide-react'
import { VARIANTS } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { createWorkspace } from '@/lib/workspace/actions'
import {
  workspaceFormSchema,
  COLLABORATION_MODES,
  type CollaborationMode,
} from '@/lib/workspace/types'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  model_name: string
}

interface CreateWorkspaceDialogProps {
  tenantId: string
  agents: Agent[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MODE_DESCRIPTIONS: Record<CollaborationMode, string> = {
  round_robin: 'Each agent responds in turn, cycling through all assigned agents.',
  parallel: 'All agents respond simultaneously to the same input.',
  sequential: 'Agents respond in a fixed order you define.',
  hierarchical: 'A lead agent delegates tasks to sub-agents as needed.',
  democratic: 'Agents vote to determine the best response when they disagree.',
}

const MODE_LABELS: Record<CollaborationMode, string> = {
  round_robin: 'Round robin',
  parallel: 'Parallel',
  sequential: 'Sequential',
  hierarchical: 'Hierarchical',
  democratic: 'Democratic',
}

interface FormState {
  name: string
  description: string
  collaboration_mode: CollaborationMode
  agent_ids: string[]
}

function getInitialForm(): FormState {
  return {
    name: '',
    description: '',
    collaboration_mode: 'round_robin',
    agent_ids: [],
  }
}

export function CreateWorkspaceDialog({
  tenantId,
  agents,
  open,
  onOpenChange,
}: CreateWorkspaceDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(getInitialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  function toggleAgent(agentId: string) {
    setForm((prev) => ({
      ...prev,
      agent_ids: prev.agent_ids.includes(agentId)
        ? prev.agent_ids.filter((id) => id !== agentId)
        : [...prev.agent_ids, agentId],
    }))
  }

  function handleClose() {
    setForm(getInitialForm())
    setErrors({})
    onOpenChange(false)
  }

  async function handleSubmit() {
    const parsed = workspaceFormSchema.safeParse({
      ...form,
      memory_strategy: 'conversation',
      conflict_resolution: 'vote',
      compression_enabled: true,
      compression_threshold: 80,
    })

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString()
        if (key) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const result = await createWorkspace(tenantId, parsed.data)
      if (result.error) {
        toast('error', 'Could not create workspace', result.error)
        return
      }
      toast('success', 'Workspace created')
      handleClose()
      router.refresh()
    } catch {
      toast('error', 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence>
            {open && (
              <motion.div
                key="create-workspace-dialog"
                {...VARIANTS.cardEnter}
                className="glass-card rounded-xl p-6"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-xl font-semibold tracking-tight">
                    New workspace
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-surface-3 transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Form body */}
                <div className="space-y-4">
                  {/* Workspace name */}
                  <FormField label="Workspace name" id="ws-name" error={errors.name}>
                    <Input
                      id="ws-name"
                      autoFocus
                      placeholder="My workspace"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      data-error={!!errors.name}
                    />
                  </FormField>

                  {/* Description */}
                  <FormField label="Description" id="ws-description" error={errors.description}>
                    <textarea
                      id="ws-description"
                      rows={2}
                      placeholder="What is this workspace for?"
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 hover:border-primary/20 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </FormField>

                  {/* Collaboration mode */}
                  <FormField label="Collaboration mode" id="ws-mode" error={errors.collaboration_mode}>
                    <Select.Root
                      value={form.collaboration_mode}
                      onValueChange={(v) => updateField('collaboration_mode', v as CollaborationMode)}
                    >
                      <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 text-sm hover:border-primary/20 transition-colors focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring">
                        <Select.Value />
                        <Select.Icon>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="z-50 rounded-lg border border-border bg-popover p-1 shadow-lg">
                          <Select.Viewport>
                            {COLLABORATION_MODES.map((mode) => (
                              <Select.Item
                                key={mode}
                                value={mode}
                                className="flex items-start gap-2 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-accent/10 outline-none h-[56px]"
                              >
                                <Select.ItemIndicator className="mt-0.5">
                                  <Check className="h-3.5 w-3.5" />
                                </Select.ItemIndicator>
                                <div className="flex flex-col gap-0.5">
                                  <Select.ItemText className="font-medium">
                                    {MODE_LABELS[mode]}
                                  </Select.ItemText>
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    {MODE_DESCRIPTIONS[mode]}
                                  </span>
                                </div>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </FormField>

                  {/* Agent multi-select */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Agents</label>
                    <div
                      className={cn(
                        'rounded-md border border-input bg-background/50 overflow-y-auto',
                        agents.length > 0 ? 'max-h-[200px]' : ''
                      )}
                    >
                      {agents.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                          No agents yet. Create agents first.
                        </p>
                      ) : (
                        agents.map((agent) => {
                          const checked = form.agent_ids.includes(agent.id)
                          return (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={() => toggleAgent(agent.id)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                                'hover:bg-surface-3/50 border-b border-border/50 last:border-b-0'
                              )}
                            >
                              {/* Checkbox */}
                              <div
                                className={cn(
                                  'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                                  checked
                                    ? 'bg-primary border-primary'
                                    : 'border-input bg-background'
                                )}
                              >
                                {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              {/* Agent name */}
                              <span className="text-sm text-foreground flex-1">{agent.name}</span>
                              {/* Model chip */}
                              <span className="text-xs text-muted-foreground bg-surface-3 px-2 py-0.5 rounded shrink-0">
                                {agent.model_name}
                              </span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={handleClose} disabled={submitting}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create workspace'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
