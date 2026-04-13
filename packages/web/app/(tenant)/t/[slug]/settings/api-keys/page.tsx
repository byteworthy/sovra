'use client'

import { useState, useEffect } from 'react'
import { KeyRound } from 'lucide-react'
import { motion } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import { ApiKeyRow } from '@/components/api-keys/ApiKeyRow'
import { CreateApiKeyDialog } from '@/components/api-keys/CreateApiKeyDialog'
import type { ApiKeyData } from '@/components/api-keys/ApiKeyRow'

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    setLoading(true)
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json() as { keys: ApiKeyData[] }
        setKeys(data.keys)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleCreated(newKey: ApiKeyData) {
    // Add optimistically -- raw_key is stripped from list responses but the
    // row data fields are present on the creation response
    setKeys((prev) => [newKey, ...prev])
  }

  function handleRevoke(id: string) {
    setKeys((prev) =>
      prev.map((k) =>
        k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k
      )
    )
  }

  return (
    <div className="max-w-3xl p-6">
      {/* Page title */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authenticate external applications with your API.
          </p>
        </div>
        <CreateApiKeyDialog onCreated={handleCreated} />
      </div>

      {/* Key list */}
      <div className="mt-6">
        {loading ? (
          <div className="rounded-xl border border-border bg-card">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[64px] border-b border-border last:border-b-0 animate-pulse bg-surface-3/20" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 h-12 w-12 rounded-full bg-surface-3/60 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold mb-2">No API keys</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-[320px]">
              Create an API key to connect external applications to your account.
            </p>
            <CreateApiKeyDialog onCreated={handleCreated} />
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {keys.map((key, i) => (
              <motion.div
                key={key.id}
                initial={VARIANTS.listItem.initial}
                animate={VARIANTS.listItem.animate}
                transition={{ ...VARIANTS.listItem.transition, delay: i * 0.03 }}
              >
                <ApiKeyRow apiKey={key} onRevoke={handleRevoke} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
