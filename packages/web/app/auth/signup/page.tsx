import { AuthCard } from '@/components/auth/auth-card'
import { SignupPageClient } from './client'
import { sanitizeRedirectPath } from '@/lib/auth/redirect'

export const metadata = {
  title: 'Create account | Sovra',
}

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const nextPath = sanitizeRedirectPath(params.next)

  return (
    <AuthCard aria-label="Create account form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-2">Start building production AI apps today</p>
      </div>

      <SignupPageClient nextPath={nextPath} />
    </AuthCard>
  )
}
