'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { AuthCard } from '@/components/auth/auth-card'
import { FormField } from '@/components/ui/form-field'
import { PasswordInput } from '@/components/auth/password-input'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type FieldErrors = Partial<Record<'password' | 'confirmPassword', string>>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const result = resetSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors
        if (!errs[field]) errs[field] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const adapter = new SupabaseAuthAdapter(supabase)
      const { error: updateError } = await adapter.updatePassword(password)

      if (updateError) {
        setError(updateError)
        return
      }

      router.push('/auth/login?success=Password+updated.+Sign+in+with+your+new+password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard aria-label="Reset password form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="destructive">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="New password" id="password" error={fieldErrors.password}>
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-error={!!fieldErrors.password}
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirm password" id="confirmPassword" error={fieldErrors.confirmPassword}>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            data-error={!!fieldErrors.confirmPassword}
            autoComplete="new-password"
          />
        </FormField>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 btn-gradient-border"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Updating...
            </>
          ) : (
            'Update password'
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  )
}
