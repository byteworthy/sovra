'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Check } from 'lucide-react'
import { VARIANTS } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { AgentToolsSelector } from './agent-tools-selector'
import { AgentStatusBadge } from './agent-status-badge'
import {
  agentFormSchema,
  SUPPORTED_PROVIDERS,
  PROVIDER_MODELS,
  type SupportedProvider,
} from '@/lib/agent/types'
import { createAgent, updateAgent } from '@/lib/agent/actions'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  description: string | null
  system_prompt: string | null
  model_provider: string
  model_name: string
  temperature: number
  max_tokens: number
  tools: string[]
  status?: 'idle' | 'running' | 'error'
}

interface AgentFormProps {
  mode: 'create' | 'edit'
  agent?: Agent
  tenantId: string
  onSuccess: () => void
  onCancel: () => void
}

function getInitialState(agent?: Agent) {
  return {
    name: agent?.name ?? '',
    description: agent?.description ?? '',
    system_prompt: agent?.system_prompt ?? '',
    model_provider: (agent?.model_provider ?? 'openai') as SupportedProvider,
    model_name: agent?.model_name ?? 'gpt-4o',
    temperature: agent?.temperature ?? 0.7,
    max_tokens: agent?.max_tokens ?? 4096,
    tools: agent?.tools ?? [],
  }
}

export function AgentForm({ mode, agent, tenantId, onSuccess, onCancel }: AgentFormProps) {
  const { toast } = useToast()
  const [form, setForm] = useState(() => getInitialState(agent))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const isDirty = mode === 'edit' && agent
    ? JSON.stringify(getInitialState(agent)) !== JSON.stringify(form)
    : false

  const updateField = useCallback(<K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  function handleProviderChange(provider: SupportedProvider) {
    const models = PROVIDER_MODELS[provider]
    updateField('model_provider', provider)
    updateField('model_name', models[0])
  }

  async function handleSubmit() {
    const result = agentFormSchema.safeParse(form)
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString()
        if (key) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const response = mode === 'create'
        ? await createAgent(tenantId, result.data)
        : await updateAgent(tenantId, agent!.id, result.data)

      if (response.error) {
        toast('error', 'Error', response.error)
        return
      }

      toast('success', mode === 'create' ? 'Agent created' : 'Changes saved')
      onSuccess()
    } catch {
      toast('error', 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const availableModels = PROVIDER_MODELS[form.model_provider] ?? []

  const providerSelect = (
    <FormField label="Provider" id="provider" error={errors.model_provider}>
      <Select.Root value={form.model_provider} onValueChange={(v) => handleProviderChange(v as SupportedProvider)}>
        <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 text-sm hover:border-zinc-600 transition-colors focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <Select.Value />
          <Select.Icon><ChevronDown className="h-4 w-4 text-muted-foreground" /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-50 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <Select.Viewport>
              {SUPPORTED_PROVIDERS.map((p) => (
                <Select.Item key={p} value={p} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/10 outline-none">
                  <Select.ItemIndicator><Check className="h-3.5 w-3.5" /></Select.ItemIndicator>
                  <Select.ItemText>{p}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </FormField>
  )

  const modelSelect = (
    <FormField label="Model" id="model" error={errors.model_name}>
      <Select.Root value={form.model_name} onValueChange={(v) => updateField('model_name', v)}>
        <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background/50 px-3 text-sm hover:border-zinc-600 transition-colors focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring">
          <Select.Value />
          <Select.Icon><ChevronDown className="h-4 w-4 text-muted-foreground" /></Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-50 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <Select.Viewport>
              {availableModels.map((m) => (
                <Select.Item key={m} value={m} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent/10 outline-none">
                  <Select.ItemIndicator><Check className="h-3.5 w-3.5" /></Select.ItemIndicator>
                  <Select.ItemText>{m}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </FormField>
  )

  const footer = (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <div>
        {isDirty && (
          <span className="text-xs text-amber-400">Unsaved changes</span>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Saving...' : mode === 'create' ? 'Create agent' : 'Save changes'}
        </Button>
      </div>
    </div>
  )

  if (mode === 'create') {
    return (
      <Dialog.Root open onOpenChange={(open) => { if (!open) onCancel() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2">
            <AnimatePresence>
              <motion.div
                {...VARIANTS.cardEnter}
                className="glass-card rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold">Create agent</Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors" aria-label="Close">
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                <div className="space-y-4">
                  <FormField label="Name" id="name" error={errors.name}>
                    <Input
                      id="name"
                      autoFocus
                      placeholder="My Agent"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      data-error={!!errors.name}
                    />
                  </FormField>

                  <FormField label="Description" id="description" error={errors.description}>
                    <textarea
                      id="description"
                      rows={2}
                      placeholder="What does this agent do?"
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 hover:border-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </FormField>

                  {providerSelect}
                  {modelSelect}

                  <FormField label="System prompt" id="system_prompt" error={errors.system_prompt}>
                    <textarea
                      id="system_prompt"
                      rows={6}
                      placeholder="You are a helpful assistant..."
                      value={form.system_prompt}
                      onChange={(e) => updateField('system_prompt', e.target.value)}
                      className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 hover:border-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </FormField>
                </div>

                {footer}
              </motion.div>
            </AnimatePresence>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // Edit mode: tabbed sheet
  return (
    <AnimatePresence>
      <motion.div
        {...VARIANTS.slideInRight}
        className="fixed right-0 top-0 z-50 h-full w-full max-w-[480px] border-l border-border bg-card shadow-xl overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Edit agent</h2>
            <button
              onClick={onCancel}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Tabs.Root defaultValue="general">
            <Tabs.List className="flex border-b border-border mb-4">
              {['general', 'model', 'tools', 'prompt'].map((tab) => (
                <Tabs.Trigger
                  key={tab}
                  value={tab}
                  className={cn(
                    'px-3 py-2 text-sm font-medium capitalize transition-colors',
                    'border-b-2 border-transparent',
                    'data-[state=active]:border-primary data-[state=active]:text-foreground',
                    'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {/* General tab */}
            <Tabs.Content value="general" className="space-y-4">
              <FormField label="Name" id="edit-name" error={errors.name}>
                <Input
                  id="edit-name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  data-error={!!errors.name}
                />
              </FormField>

              <FormField label="Description" id="edit-description" error={errors.description}>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 hover:border-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </FormField>

              {agent && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <AgentStatusBadge status={agent.status ?? 'idle'} />
                </div>
              )}
            </Tabs.Content>

            {/* Model tab */}
            <Tabs.Content value="model" className="space-y-4">
              {providerSelect}
              {modelSelect}

              <FormField label="Temperature" id="temperature">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Precise</span>
                    <span className="text-sm font-mono tabular-nums">{form.temperature.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">Creative</span>
                  </div>
                  <input
                    type="range"
                    id="temperature"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.temperature}
                    onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-zinc-800 accent-primary cursor-pointer"
                  />
                </div>
              </FormField>

              <FormField label="Max tokens" id="max_tokens" error={errors.max_tokens}>
                <Input
                  id="max_tokens"
                  type="number"
                  min={1}
                  max={128000}
                  value={form.max_tokens}
                  onChange={(e) => updateField('max_tokens', parseInt(e.target.value, 10) || 1)}
                  data-error={!!errors.max_tokens}
                />
              </FormField>
            </Tabs.Content>

            {/* Tools tab */}
            <Tabs.Content value="tools" className="py-2">
              <AgentToolsSelector
                selectedTools={form.tools}
                onChange={(tools) => updateField('tools', tools)}
              />
            </Tabs.Content>

            {/* Prompt tab */}
            <Tabs.Content value="prompt" className="space-y-2">
              <FormField label="System prompt" id="edit-system-prompt" error={errors.system_prompt}>
                <div className="relative">
                  <textarea
                    id="edit-system-prompt"
                    rows={10}
                    value={form.system_prompt}
                    onChange={(e) => updateField('system_prompt', e.target.value)}
                    className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 hover:border-zinc-600 transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                  <span className="absolute bottom-2 right-2 text-xs text-muted-foreground tabular-nums">
                    {form.system_prompt.length} / 10,000
                  </span>
                </div>
              </FormField>
            </Tabs.Content>
          </Tabs.Root>

          {footer}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
