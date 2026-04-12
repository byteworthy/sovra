'use client'

import { useState, useRef } from 'react'
import { Plus, X, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { ApiKeyData } from './ApiKeyRow'

const PERMISSIONS = [
  'agents:read',
  'agents:write',
  'conversations:read',
  'conversations:write',
  'tools:execute',
  'admin:read',
] as const

type Permission = (typeof PERMISSIONS)[number]

type ExpirationOption = 'none' | '30d' | '90d' | '1y' | 'custom'

function expiryToDate(option: ExpirationOption, customDate: string): string | undefined {
  const now = new Date()
  if (option === 'none') return undefined
  if (option === '30d') { now.setDate(now.getDate() + 30); return now.toISOString() }
  if (option === '90d') { now.setDate(now.getDate() + 90); return now.toISOString() }
  if (option === '1y') { now.setFullYear(now.getFullYear() + 1); return now.toISOString() }
  if (option === 'custom' && customDate) return new Date(customDate).toISOString()
  return undefined
}

interface CreateApiKeyDialogProps {
  onCreated: (key: ApiKeyData) => void
}

export function CreateApiKeyDialog({ onCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'form' | 'reveal'>('form')
  const [name, setName] = useState('')
  const [expiration, setExpiration] = useState<ExpirationOption>('none')
  const [customDate, setCustomDate] = useState('')
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [rawKey, setRawKey] = useState('')
  const [copied, setCopied] = useState(false)
  const keyRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  function handleOpen() {
    setStep('form')
    setName('')
    setExpiration('none')
    setCustomDate('')
    setPermissions([])
    setRawKey('')
    setCopied(false)
    setOpen(true)
  }

  function handleClose() {
    if (step === 'reveal') return // block close during reveal
    setOpen(false)
  }

  function togglePermission(perm: Permission) {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)

    try {
      const body: Record<string, unknown> = { name: name.trim(), permissions }
      const expires_at = expiryToDate(expiration, customDate)
      if (expires_at) body.expires_at = expires_at

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error()
      const data = await res.json() as { raw_key: string } & ApiKeyData
      setRawKey(data.raw_key)
      onCreated(data)
      setStep('reveal')
    } catch {
      toast('error', 'Could not create API key. Check your permissions and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(rawKey)
    setCopied(true)
    // Trigger highlight animation
    if (keyRef.current) {
      keyRef.current.classList.remove('key-reveal-highlight')
      void keyRef.current.offsetWidth // reflow
      keyRef.current.classList.add('key-reveal-highlight')
    }
    toast('success', 'Key copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleConfirmCopied() {
    setOpen(false)
    setStep('form')
    setRawKey('')
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create API key
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Dialog */}
            <motion.div
              initial={VARIANTS.cardEnter.initial}
              animate={VARIANTS.cardEnter.animate}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              transition={VARIANTS.cardEnter.transition}
              className="relative z-10 w-full max-w-[480px] mx-4 glass-card rounded-xl p-6"
              role="dialog"
              aria-modal="true"
            >
              {step === 'form' ? (
                <form onSubmit={handleSubmit}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-semibold tracking-tight">New API key</h2>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Key name */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5" htmlFor="key-name">
                      Key name
                    </label>
                    <input
                      id="key-name"
                      type="text"
                      required
                      autoFocus
                      placeholder="e.g. Production app"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-md border border-border bg-zinc-900/60 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                    />
                  </div>

                  {/* Expiration */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-1.5" htmlFor="key-expiration">
                      Expiration
                    </label>
                    <select
                      id="key-expiration"
                      value={expiration}
                      onChange={(e) => setExpiration(e.target.value as ExpirationOption)}
                      className="w-full rounded-md border border-border bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors appearance-none"
                    >
                      <option value="none">No expiration</option>
                      <option value="30d">30 days</option>
                      <option value="90d">90 days</option>
                      <option value="1y">1 year</option>
                      <option value="custom">Custom</option>
                    </select>
                    {expiration === 'custom' && (
                      <input
                        type="date"
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-2 w-full rounded-md border border-border bg-zinc-900/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
                      />
                    )}
                  </div>

                  {/* Permissions */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold mb-2">Permissions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERMISSIONS.map((perm) => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={permissions.includes(perm)}
                            onChange={() => togglePermission(perm)}
                            className="h-4 w-4 rounded border-border bg-zinc-900 accent-primary cursor-pointer"
                          />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors font-mono">
                            {perm}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:border-zinc-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !name.trim()}
                      className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? 'Creating...' : 'Create API key'}
                    </button>
                  </div>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Header */}
                  <div className="mb-5">
                    <h2 className="text-xl font-semibold tracking-tight">API key created</h2>
                  </div>

                  {/* Warning banner */}
                  <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="text-sm text-amber-400 font-semibold">
                      Copy this key now. It will not be shown again.
                    </p>
                  </div>

                  {/* Key reveal */}
                  <div
                    ref={keyRef}
                    className="flex items-center gap-3 rounded-md border border-border bg-zinc-900/60 px-3 py-2 mb-6"
                  >
                    <span className="flex-1 text-sm font-mono text-foreground break-all select-all">
                      {rawKey}
                    </span>
                    <button
                      onClick={handleCopy}
                      className={cn(
                        'shrink-0 h-7 w-7 flex items-center justify-center rounded-md transition-colors',
                        copied
                          ? 'text-green-400'
                          : 'text-muted-foreground hover:text-foreground hover:bg-zinc-800/60'
                      )}
                      aria-label="Copy API key"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Confirm */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleConfirmCopied}
                      className="px-4 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      I copied my key
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
