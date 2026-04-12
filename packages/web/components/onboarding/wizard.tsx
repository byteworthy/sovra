'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { createTenant } from '@/lib/tenant/actions'
import { createInvitation } from '@/lib/rbac/invitation'
import { TRANSITIONS } from '@/lib/motion'
import { Button } from '@/components/ui/button'

const STEP_TRANSITION = {
  initial: { opacity: 0, x: 100 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -100 },
  transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
}

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [workspaceName, setWorkspaceName] = useState('')
  const [slug, setSlug] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [emails, setEmails] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [inviteCount, setInviteCount] = useState(0)

  function updateName(name: string) {
    setWorkspaceName(name)
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 48)
    )
  }

  async function handleCreateWorkspace() {
    if (!workspaceName.trim() || !slug) return
    setCreating(true)
    setCreateError(null)

    const result = await createTenant({ name: workspaceName.trim(), slug })
    setCreating(false)

    if (result.error) {
      setCreateError(result.error)
      return
    }

    if (result.tenant) {
      setTenantId(result.tenant.id)
      setStep(2)
    }
  }

  async function handleSendInvites() {
    if (!tenantId || !emails.trim()) return
    setSending(true)

    const emailList = emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)

    let sent = 0
    for (const email of emailList) {
      const result = await createInvitation({
        tenantId,
        roleId: inviteRole,
        email,
        inviteType: 'email',
      })
      if (!result.error) sent++
    }

    setSending(false)
    setInviteCount(sent)
    setStep(3)
  }

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Progress bar */}
      <motion.div
        className="h-0.5 bg-primary rounded-full mb-6"
        animate={{ width: `${step * 33.33}%` }}
        transition={TRANSITIONS.spring}
      />

      {/* Step dots */}
      <div className="flex justify-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-2 rounded-full transition-colors duration-200 ${
              s === step ? 'bg-primary' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step-1" {...STEP_TRANSITION}>
            <h1 className="text-2xl font-semibold tracking-tight">Name your workspace</h1>
            <p className="text-sm text-muted-foreground mt-2">
              This is where your team and AI agents will live
            </p>

            <div className="space-y-1.5 mt-6">
              <label htmlFor="ws-name" className="text-sm font-semibold">
                Workspace name
              </label>
              <input
                id="ws-name"
                value={workspaceName}
                onChange={(e) => updateName(e.target.value)}
                placeholder="My workspace"
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                autoFocus
              />
              {slug && (
                <p className="text-xs text-muted-foreground">/t/{slug}</p>
              )}
              {createError && (
                <p className="text-xs text-destructive">{createError}</p>
              )}
            </div>

            <Button
              onClick={handleCreateWorkspace}
              disabled={creating || !workspaceName.trim()}
              className="w-full h-11 mt-6 border-t border-white/12"
            >
              {creating ? 'Creating...' : 'Create workspace'}
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step-2" {...STEP_TRANSITION}>
            <h1 className="text-2xl font-semibold tracking-tight">Invite your team</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Add teammates so you can build together. You can always do this later.
            </p>

            <div className="space-y-4 mt-6">
              <div className="space-y-1.5">
                <label htmlFor="invite-emails" className="text-sm font-semibold">
                  Email addresses
                </label>
                <input
                  id="invite-emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="alice@co.com, bob@co.com"
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-sm font-semibold">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleSendInvites}
              disabled={sending || !emails.trim()}
              className="w-full h-11 mt-6"
            >
              {sending ? 'Sending...' : 'Send invites'}
            </Button>

            <button
              onClick={() => setStep(3)}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground mt-3 transition-colors"
            >
              Skip invites for now
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step-3" {...STEP_TRANSITION} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex justify-center mb-4"
            >
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </motion.div>

            <h1 className="text-2xl font-semibold tracking-tight">You&apos;re all set</h1>
            <p className="text-sm text-muted-foreground mt-2">
              <strong>{workspaceName}</strong> is ready. Start by creating your first AI agent.
            </p>

            {inviteCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {inviteCount} invite{inviteCount > 1 ? 's' : ''} sent
              </p>
            )}

            <Button
              onClick={() => router.push(`/t/${slug}/dashboard`)}
              className="w-full h-11 mt-6 border-t border-white/12"
            >
              Open your dashboard
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
