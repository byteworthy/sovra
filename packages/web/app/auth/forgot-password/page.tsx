'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { CheckCircle2 } from 'lucide-react'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { AuthCard } from '@/components/auth/auth-card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

const emailSchema = z.string().email('Enter a valid email address')

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEmailError(undefined)

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setEmailError(result.error.issues[0].message)
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const adapter = new SupabaseAuthAdapter(supabase)
      const { error: resetError } = await adapter.resetPassword(
        email,
        window.location.origin + '/reset-password'
      )

      if (resetError) {
        setError(resetError)
        return
      }

      setSent(true)
      setCooldown(60)
    } finally {
      setLoading(false)
    }
  }, [email])

  const seconds = String(cooldown).padStart(2, '0')

  return (
    <AuthCard aria-label="Forgot password form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="destructive">{error}</Alert>
        </div>
      )}

      {sent && (
        <div className="mb-4">
          <Alert variant="info">Check {email} for a reset link</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Email" id="email" error={emailError}>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-error={!!emailError}
            autoComplete="email"
          />
        </FormField>

        <Button
          type="submit"
          disabled={loading || cooldown > 0}
          className="w-full h-11 btn-gradient-border"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Sending...
            </>
          ) : sent && cooldown <= 0 ? (
            'Resend reset email'
          ) : sent ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Email sent
            </>
          ) : (
            'Send reset link'
          )}
        </Button>

        {cooldown > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Resend in 0:{seconds}
          </p>
        )}

        <p className="text-sm text-muted-foreground text-center">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
