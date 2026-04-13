'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, CheckCircle2 } from 'lucide-react'
import * as Select from '@radix-ui/react-select'
import { usePermission } from '@/lib/rbac/hooks'
import { useTenant } from '@/lib/tenant/context'
import { createInvitation, createInviteLink } from '@/lib/rbac/invitation'
import { useToast } from '@/lib/toast'
import { TRANSITIONS } from '@/lib/motion'
import { Button } from '@/components/ui/button'

export function InviteForm({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { allowed } = usePermission('tenant:invite')
  const { tenantId } = useTenant()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('member')
  const [sending, setSending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  const [showLinkMode, setShowLinkMode] = useState(false)
  const [linkRoleId, setLinkRoleId] = useState('member')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!allowed) return null

  async function handleSendInvite() {
    if (!email.trim()) {
      setEmailError('Email is required')
      return
    }
    setSending(true)
    setEmailError(null)

    const result = await createInvitation({
      tenantId,
      roleId,
      email: email.trim(),
      inviteType: 'email',
    })
    setSending(false)

    if (result.error) {
      setEmailError(result.error)
      return
    }

    toast('success', `Invitation sent to ${email.trim()}`)
    setEmail('')
    onToggle()
  }

  async function handleGenerateLink() {
    setGeneratingLink(true)
    const result = await createInviteLink(tenantId, linkRoleId)
    setGeneratingLink(false)

    if (result.error) {
      toast('error', result.error)
      return
    }

    if (result.invitation?.token) {
      const link = `${window.location.origin}/invite/${result.invitation.token}`
      setGeneratedLink(link)
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return
    await navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    toast('success', 'Invite link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={TRANSITIONS.spring}
          className="overflow-hidden"
        >
          <div className="bg-card border border-border rounded-lg p-4 mt-4">
            {/* Email invite mode */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label htmlFor="invite-email" className="text-sm font-semibold">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setEmailError(null)
                  }}
                  placeholder="colleague@company.com"
                  className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                />
                {emailError && (
                  <p className="text-xs text-destructive">{emailError}</p>
                )}
              </div>

              <RoleSelect value={roleId} onChange={setRoleId} />

              <Button onClick={handleSendInvite} disabled={sending}>
                {sending ? 'Sending...' : 'Send invitation'}
              </Button>
            </div>

            {/* Invite link mode */}
            <button
              onClick={() => setShowLinkMode(!showLinkMode)}
              className="text-sm text-muted-foreground hover:text-foreground cursor-pointer mt-3 transition-colors"
            >
              Or share invite link
            </button>

            <AnimatePresence>
              {showLinkMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 items-center mt-3">
                    <RoleSelect value={linkRoleId} onChange={setLinkRoleId} />

                    {!generatedLink ? (
                      <Button onClick={handleGenerateLink} disabled={generatingLink} variant="secondary">
                        {generatingLink ? 'Generating...' : 'Generate link'}
                      </Button>
                    ) : (
                      <>
                        <input
                          readOnly
                          value={generatedLink}
                          className="h-10 flex-1 rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-muted-foreground"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="h-10 w-10 flex items-center justify-center rounded-md border border-input hover:bg-surface-3/70 transition-colors"
                          aria-label="Copy link"
                        >
                          {copied ? (
                            <CheckCircle2 className="h-4 w-4 text-status-online" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-40 rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </select>
  )
}
