'use client'

import { useState } from 'react'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

interface VerifyEmailClientProps {
  email?: string
}

export function VerifyEmailClient({ email }: VerifyEmailClientProps) {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    if (!email) return
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const adapter = new SupabaseAuthAdapter(supabase)
      await adapter.signInWithMagicLink(email, window.location.origin + '/auth/callback')
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleResend}
      disabled={loading || sent || !email}
      className="mx-auto"
    >
      {loading ? (
        <>
          <Spinner size="sm" />
          Sending...
        </>
      ) : sent ? (
        'Verification email resent'
      ) : (
        'Resend verification email'
      )}
    </Button>
  )
}
