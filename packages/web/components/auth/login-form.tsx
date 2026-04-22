'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { VARIANTS } from '@/lib/motion'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { PasswordInput } from './password-input'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  appendNextParam,
  buildAuthCallbackUrl,
  sanitizeRedirectPath,
} from '@/lib/auth/redirect'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>

interface LoginFormProps {
  nextPath?: string
}

export function LoginForm({ nextPath = '/onboarding' }: LoginFormProps) {
  const router = useRouter()
  const safeNextPath = sanitizeRedirectPath(nextPath)
  const [loading, setLoading] = useState(false)
  const [magicLinkLoading, setMagicLinkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [shaking, setShaking] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const result = loginSchema.safeParse({ email, password })
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
      const { error: signInError } = await adapter.signIn(email, password)

      if (signInError) {
        setShaking(true)
        setError(signInError)
        setTimeout(() => setShaking(false), 400)
        return
      }

      router.push(safeNextPath)
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    setError(null)
    if (!email) {
      setFieldErrors({ email: 'Enter your email first' })
      return
    }

    setMagicLinkLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const adapter = new SupabaseAuthAdapter(supabase)
      const { error: linkError } = await adapter.signInWithMagicLink(
        email,
        buildAuthCallbackUrl(window.location.origin, safeNextPath)
      )

      if (linkError) {
        setError(linkError)
        return
      }

      setMagicLinkSent(true)
    } finally {
      setMagicLinkLoading(false)
    }
  }

  return (
    <motion.div animate={shaking ? VARIANTS.shake.animate : {}} transition={VARIANTS.shake.transition}>
      <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4">
        {error && (
          <Alert variant="destructive" title="Incorrect email or password">
            Check your details or{' '}
            <Link
              href={appendNextParam('/auth/forgot-password', safeNextPath)}
              className="font-semibold underline underline-offset-2"
            >
              reset your password
            </Link>
          </Alert>
        )}

        {magicLinkSent && (
          <Alert variant="info">Check your email for a sign-in link</Alert>
        )}

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
            autoComplete="current-password"
          />
        </FormField>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleMagicLink}
            disabled={magicLinkLoading}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {magicLinkLoading ? 'Sending...' : 'Sign in with magic link'}
          </button>
          <Link
            href={appendNextParam('/auth/forgot-password', safeNextPath)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 btn-gradient-border active:scale-[0.98] transition-transform duration-75"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{' '}
          <Link
            href={appendNextParam('/auth/signup', safeNextPath)}
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </form>
    </motion.div>
  )
}
