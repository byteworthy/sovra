import Link from 'next/link'
import { AuthCard } from '@/components/auth/auth-card'
import { VerifyEmailClient } from './client'

export const metadata = {
  title: 'Verify email | Sovra',
}

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  const email = params.email

  return (
    <AuthCard aria-label="Verify email">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{' '}
          {email ? <strong className="text-foreground">{email}</strong> : 'your email'}
          . Click it to activate your account.
        </p>

        <VerifyEmailClient email={email} />

        <p className="text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary hover:text-primary/80 transition-colors">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
