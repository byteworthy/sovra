'use client'

import { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/lib/toast'

export interface ApiKeyData {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  expires_at: string | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
}

interface ApiKeyRowProps {
  apiKey: ApiKeyData
  onRevoke: (id: string) => void
}

type BadgeVariant = 'active' | 'expired' | 'revoked'

function getStatus(apiKey: ApiKeyData): BadgeVariant {
  if (apiKey.revoked_at) return 'revoked'
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return 'expired'
  return 'active'
}

const STATUS_BADGE: Record<BadgeVariant, string> = {
  active: 'bg-green-500/[0.12] text-green-400',
  expired: 'bg-zinc-500/[0.12] text-zinc-400',
  revoked: 'bg-red-500/[0.12] text-red-400',
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiration'
  return `Expires ${new Date(expiresAt).toLocaleDateString()}`
}

export function ApiKeyRow({ apiKey, onRevoke }: ApiKeyRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const { toast } = useToast()
  const status = getStatus(apiKey)

  // Build masked display: bsk_••••••••{last4 of prefix}
  const last4 = apiKey.key_prefix.slice(-4)
  const masked = `bsk_••••••••${last4}`

  async function handleRevoke() {
    setRevoking(true)
    try {
      const res = await fetch(`/api/keys/${apiKey.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onRevoke(apiKey.id)
      setConfirmOpen(false)
      toast('success', 'API key revoked')
    } catch {
      toast('error', 'Could not revoke key. Try again.')
    } finally {
      setRevoking(false)
    }
  }

  function handleCopyId() {
    void navigator.clipboard.writeText(apiKey.id)
    toast('success', 'Key ID copied to clipboard')
    setMenuOpen(false)
  }

  function handleRevealLast4() {
    toast('info', `Last 4: ${last4}`)
    setMenuOpen(false)
  }

  return (
    <>
      <div
        className="group h-[64px] flex items-center px-4 border-b border-border last:border-b-0 bg-card hover:bg-zinc-900/40 transition-colors duration-100 relative"
        onMouseLeave={() => setMenuOpen(false)}
      >
        {/* Left: name + masked */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">{apiKey.name}</span>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                STATUS_BADGE[status]
              )}
            >
              {status}
            </span>
          </div>
          <span className="text-sm font-mono text-muted-foreground">{masked}</span>
        </div>

        {/* Middle: expiry */}
        <div className="hidden sm:flex flex-col items-end mr-8 min-w-[120px]">
          <span className="text-xs text-muted-foreground">{formatExpiry(apiKey.expires_at)}</span>
        </div>

        {/* Right: actions */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label="Key actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-border bg-zinc-900 shadow-xl py-1">
              <button
                onClick={handleCopyId}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800/60 transition-colors"
              >
                Copy key ID
              </button>
              <button
                onClick={handleRevealLast4}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800/60 transition-colors"
              >
                Reveal last 4
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => { setConfirmOpen(true); setMenuOpen(false) }}
                className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800/60 transition-colors"
                disabled={status === 'revoked'}
              >
                Revoke key
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Revoke confirmation dialog */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 max-w-[400px] w-full mx-4 rounded-xl border border-border bg-zinc-900 p-6 shadow-xl">
            <h2 className="text-base font-semibold mb-2">Revoke this API key?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Revoke this API key? Applications using it will stop working immediately.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 text-sm font-semibold rounded-md border border-border hover:border-zinc-600 transition-colors"
              >
                Keep key
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {revoking ? 'Revoking...' : 'Revoke key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
