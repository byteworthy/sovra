'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { PasswordInput } from './password-input'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { appendNextParam, sanitizeRedirectPath } from '@/lib/auth/redirect'

const signupSchema = z.object({
  fullName: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof signupSchema>, string>>

interface SignupFormProps {
  nextPath?: string
}

export function SignupForm({ nextPath = '/onboarding' }: SignupFormProps) {
  const router = useRouter()
  const safeNextPath = sanitizeRedirectPath(nextPath)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const result = signupSchema.safeParse({ fullName, email, password })
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
      const { error: signUpError } = await adapter.signUp(email, password)

      if (signUpError) {
        if (signUpError.toLowerCase().includes('already')) {
          setError('exists')
        } else {
          setError(signUpError)
        }
        return
      }

      router.push(safeNextPath)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
      {error === 'exists' ? (
        <Alert variant="destructive" title="An account with this email already exists">
          <Link
            href={appendNextParam('/auth/login', safeNextPath)}
            className="font-semibold underline underline-offset-2"
          >
            Sign in instead
          </Link>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">{error}</Alert>
      ) : null}

      <FormField label="Full name" id="fullName" error={fieldErrors.fullName}>
        <Input
          id="fullName"
          type="text"
          placeholder="Jane Smith"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          data-error={!!fieldErrors.fullName}
          autoComplete="name"
        />
      </FormField>

      <FormField label="Email" id="email" error={fieldErrors.email}>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-error={!!fieldErrors.email}
          autoComplete="email"
        />
      </FormField>

      <FormField label="Password" id="password" error={fieldErrors.password}>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          data-error={!!fieldErrors.password}
          autoComplete="new-password"
        />
      </FormField>

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-11 btn-gradient-border active:scale-[0.98] transition-transform duration-75"
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            Creating account...
          </>
        ) : (
          'Create account'
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Already have an account?{' '}
        <Link
          href={appendNextParam('/auth/login', safeNextPath)}
          className="text-primary font-semibold hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
