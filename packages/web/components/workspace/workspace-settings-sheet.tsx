'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import { X } from 'lucide-react'
import { VARIANTS } from '@/lib/motion'
import { updateWorkspace } from '@/lib/workspace/actions'
import type {
  Workspace,
  WorkspaceFormData,
  CollaborationMode,
  MemoryStrategy,
  ConflictResolution,
} from '@/lib/workspace/types'

interface AgentOption {
  id: string
  name: string
  model_provider: string
  model_name: string
}

interface WorkspaceSettingsSheetProps {
  workspace: Workspace
  availableAgents: AgentOption[]
  assignedAgentIds: string[]
  open: boolean
  onClose: () => void
  onSaved?: () => void
}

const COLLAB_MODE_OPTIONS: { value: CollaborationMode; label: string; description: string }[] = [
  { value: 'round_robin', label: 'Round Robin', description: 'Each agent responds in turn, cycling through all assigned agents.' },
  { value: 'parallel', label: 'Parallel', description: 'All agents respond simultaneously to the same input.' },
  { value: 'sequential', label: 'Sequential', description: 'Agents respond in a fixed order you define.' },
  { value: 'hierarchical', label: 'Hierarchical', description: 'A lead agent delegates tasks to sub-agents as needed.' },
  { value: 'democratic', label: 'Democratic', description: 'Agents vote to determine the best response when they disagree.' },
]

const MEMORY_STRATEGY_OPTIONS: { value: MemoryStrategy; label: string; description: string }[] = [
  { value: 'conversation', label: 'Conversation', description: 'Full message history passed to each agent on every turn.' },
  { value: 'summary', label: 'Summary', description: 'Older messages condensed periodically to reduce token usage.' },
  { value: 'vector', label: 'Vector', description: 'Relevant past context retrieved by semantic similarity.' },
  { value: 'hybrid', label: 'Hybrid', description: 'Summary compression combined with vector retrieval for best coverage.' },
]

const CONFLICT_OPTIONS: { value: ConflictResolution; label: string }[] = [
  { value: 'vote', label: 'Vote' },
  { value: 'hierarchy', label: 'Hierarchy' },
  { value: 'consensus', label: 'Consensus' },
]

const TAB_CONTENT_VARIANTS = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 8 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -8 }),
}

export function WorkspaceSettingsSheet({
  workspace,
  availableAgents,
  assignedAgentIds,
  open,
  onClose,
  onSaved,
}: WorkspaceSettingsSheetProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [prevTab, setPrevTab] = useState('general')

  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(assignedAgentIds)
  const [collabMode, setCollabMode] = useState<CollaborationMode>(workspace.collaboration_mode)
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>(workspace.conflict_resolution)
  const [maxConcurrent, setMaxConcurrent] = useState(assignedAgentIds.length || 2)
  const [memoryStrategy, setMemoryStrategy] = useState<MemoryStrategy>(workspace.memory_strategy)
  const [compressionEnabled, setCompressionEnabled] = useState(workspace.compression_enabled)
  const [compressionThreshold, setCompressionThreshold] = useState(workspace.compression_threshold)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wasOpenRef = useRef(open)

  const isDirty =
    name !== workspace.name ||
    description !== (workspace.description ?? '') ||
    collabMode !== workspace.collaboration_mode ||
    memoryStrategy !== workspace.memory_strategy ||
    compressionEnabled !== workspace.compression_enabled ||
    compressionThreshold !== workspace.compression_threshold ||
    JSON.stringify([...selectedAgentIds].sort()) !== JSON.stringify([...assignedAgentIds].sort())

  // Reset on open
  useEffect(() => {
    const wasOpen = wasOpenRef.current
    if (!wasOpen && open) {
      setName(workspace.name)
      setDescription(workspace.description ?? '')
      setSelectedAgentIds(assignedAgentIds)
      setCollabMode(workspace.collaboration_mode)
      setConflictResolution(workspace.conflict_resolution)
      setMemoryStrategy(workspace.memory_strategy)
      setCompressionEnabled(workspace.compression_enabled)
      setCompressionThreshold(workspace.compression_threshold)
      setActiveTab('general')
      setError(null)
    }
    wasOpenRef.current = open
  }, [
    open,
    assignedAgentIds,
    workspace.name,
    workspace.description,
    workspace.collaboration_mode,
    workspace.conflict_resolution,
    workspace.memory_strategy,
    workspace.compression_enabled,
    workspace.compression_threshold,
  ])

  const tabDirection = activeTab > prevTab ? 1 : -1

  const handleTabChange = (tab: string) => {
    setPrevTab(activeTab)
    setActiveTab(tab)
  }

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    )
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const data: Partial<WorkspaceFormData> = {
      name: name.trim(),
      description: description.trim() || undefined,
      collaboration_mode: collabMode,
      conflict_resolution: conflictResolution,
      memory_strategy: memoryStrategy,
      compression_enabled: compressionEnabled,
      compression_threshold: compressionThreshold,
      agent_ids: selectedAgentIds,
    }

    const result = await updateWorkspace(workspace.id, data)

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }

    onSaved?.()
    onClose()
  }

  const showConflictSelect = collabMode === 'democratic' || collabMode === 'parallel'
  const showMaxConcurrent = collabMode === 'parallel'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog" aria-label="Workspace settings">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        className="relative w-full sm:w-[480px] h-full bg-card border-l border-border flex flex-col overflow-hidden"
        {...VARIANTS.slideInRight}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-xl font-semibold">Workspace settings</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-surface-3 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <Tabs.List className="flex gap-1 px-6 pt-3 border-b border-border shrink-0">
            {['general', 'collaboration', 'memory'].map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="px-3 py-2 text-sm font-semibold capitalize text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary -mb-px transition-colors"
              >
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <div className="flex-1 overflow-y-auto">
            {/* Tab content with slide animation */}
            <AnimatePresence mode="wait" custom={tabDirection}>
              <motion.div
                key={activeTab}
                custom={tabDirection}
                variants={TAB_CONTENT_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="px-6 py-5 space-y-5"
              >
                {activeTab === 'general' && (
                  <GeneralTab
                    name={name}
                    description={description}
                    availableAgents={availableAgents}
                    selectedAgentIds={selectedAgentIds}
                    onNameChange={setName}
                    onDescriptionChange={setDescription}
                    onToggleAgent={toggleAgent}
                  />
                )}
                {activeTab === 'collaboration' && (
                  <CollaborationTab
                    collabMode={collabMode}
                    conflictResolution={conflictResolution}
                    maxConcurrent={maxConcurrent}
                    showConflictSelect={showConflictSelect}
                    showMaxConcurrent={showMaxConcurrent}
                    onCollabModeChange={setCollabMode}
                    onConflictResolutionChange={setConflictResolution}
                    onMaxConcurrentChange={setMaxConcurrent}
                  />
                )}
                {activeTab === 'memory' && (
                  <MemoryTab
                    memoryStrategy={memoryStrategy}
                    compressionEnabled={compressionEnabled}
                    compressionThreshold={compressionThreshold}
                    onMemoryStrategyChange={setMemoryStrategy}
                    onCompressionEnabledChange={setCompressionEnabled}
                    onCompressionThresholdChange={setCompressionThreshold}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs.Root>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-3">
          {isDirty && (
            <span className="text-xs text-status-warning mr-auto">Unsaved changes</span>
          )}
          {error && (
            <span className="text-xs text-status-error mr-auto">{error}</span>
          )}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="h-9 px-4 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// Sub-components for each tab to keep the main component manageable

function GeneralTab({
  name,
  description,
  availableAgents,
  selectedAgentIds,
  onNameChange,
  onDescriptionChange,
  onToggleAgent,
}: {
  name: string
  description: string
  availableAgents: AgentOption[]
  selectedAgentIds: string[]
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onToggleAgent: (id: string) => void
}) {
  return (
    <>
      <div>
        <label className="text-sm font-semibold block mb-1.5" htmlFor="ws-name">
          Workspace name
        </label>
        <input
          id="ws-name"
          autoFocus
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Workspace name"
        />
      </div>

      <div>
        <label className="text-sm font-semibold block mb-1.5" htmlFor="ws-description">
          Description
          <span className="font-normal text-muted-foreground ml-1">(optional)</span>
        </label>
        <textarea
          id="ws-description"
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Describe what this workspace is for..."
        />
      </div>

      <div>
        <span className="text-sm font-semibold block mb-2">Agents</span>
        {availableAgents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents available.</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto border border-border rounded-md p-1">
            {availableAgents.map((agent) => (
              <label
                key={agent.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-3/50 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedAgentIds.includes(agent.id)}
                  onChange={() => onToggleAgent(agent.id)}
                  className="rounded border-border"
                />
                <span className="text-sm font-semibold flex-1">{agent.name}</span>
                <span className="text-xs text-muted-foreground bg-surface-3 px-2 py-0.5 rounded font-mono">
                  {agent.model_provider}/{agent.model_name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function CollaborationTab({
  collabMode,
  conflictResolution,
  maxConcurrent,
  showConflictSelect,
  showMaxConcurrent,
  onCollabModeChange,
  onConflictResolutionChange,
  onMaxConcurrentChange,
}: {
  collabMode: CollaborationMode
  conflictResolution: ConflictResolution
  maxConcurrent: number
  showConflictSelect: boolean
  showMaxConcurrent: boolean
  onCollabModeChange: (v: CollaborationMode) => void
  onConflictResolutionChange: (v: ConflictResolution) => void
  onMaxConcurrentChange: (v: number) => void
}) {
  return (
    <>
      <div>
        <label className="text-sm font-semibold block mb-2" htmlFor="collab-mode">
          Collaboration mode
        </label>
        <select
          id="collab-mode"
          value={collabMode}
          onChange={(e) => onCollabModeChange(e.target.value as CollaborationMode)}
          className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {COLLAB_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1.5">
          {COLLAB_MODE_OPTIONS.find((o) => o.value === collabMode)?.description}
        </p>
      </div>

      {showConflictSelect && (
        <div>
          <label className="text-sm font-semibold block mb-2" htmlFor="conflict-res">
            Conflict resolution
          </label>
          <select
            id="conflict-res"
            value={conflictResolution}
            onChange={(e) => onConflictResolutionChange(e.target.value as ConflictResolution)}
            className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CONFLICT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {showMaxConcurrent && (
        <div>
          <label className="text-sm font-semibold block mb-2" htmlFor="max-concurrent">
            Max concurrent agents
          </label>
          <input
            id="max-concurrent"
            type="number"
            min={1}
            max={20}
            value={maxConcurrent}
            onChange={(e) => onMaxConcurrentChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </>
  )
}

function MemoryTab({
  memoryStrategy,
  compressionEnabled,
  compressionThreshold,
  onMemoryStrategyChange,
  onCompressionEnabledChange,
  onCompressionThresholdChange,
}: {
  memoryStrategy: MemoryStrategy
  compressionEnabled: boolean
  compressionThreshold: number
  onMemoryStrategyChange: (v: MemoryStrategy) => void
  onCompressionEnabledChange: (v: boolean) => void
  onCompressionThresholdChange: (v: number) => void
}) {
  return (
    <>
      <div>
        <label className="text-sm font-semibold block mb-2" htmlFor="memory-strategy">
          Memory strategy
        </label>
        <select
          id="memory-strategy"
          value={memoryStrategy}
          onChange={(e) => onMemoryStrategyChange(e.target.value as MemoryStrategy)}
          className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {MEMORY_STRATEGY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1.5">
          {MEMORY_STRATEGY_OPTIONS.find((o) => o.value === memoryStrategy)?.description}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Enable context compression</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automatically compress context when approaching token limit
          </p>
        </div>
        <button
          role="switch"
          aria-checked={compressionEnabled}
          onClick={() => onCompressionEnabledChange(!compressionEnabled)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            compressionEnabled ? 'bg-primary' : 'bg-surface-3'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
              compressionEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {compressionEnabled && (
        <div>
          <label className="text-sm font-semibold block mb-2" htmlFor="compression-threshold">
            Compress at % of limit
          </label>
          <input
            id="compression-threshold"
            name="compression_threshold"
            type="number"
            min={0}
            max={100}
            value={compressionThreshold}
            onChange={(e) => onCompressionThresholdChange(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Context compresses when {compressionThreshold}% of the model&apos;s token limit is used
          </p>
        </div>
      )}
    </>
  )
}
