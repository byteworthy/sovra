import { AuthCard } from '@/components/auth/auth-card'
import { Alert } from '@/components/ui/alert'
import { LoginPageClient } from './client'
import { sanitizeRedirectPath } from '@/lib/auth/redirect'

export const metadata = {
  title: 'Sign in | Sovra',
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorFromUrl = params.error
  const nextPath = sanitizeRedirectPath(params.next)

  return (
    <AuthCard aria-label="Sign in form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-2">Welcome back to Sovra</p>
      </div>

      {errorFromUrl && (
        <div className="mb-4">
          <Alert variant="destructive">{errorFromUrl}</Alert>
        </div>
      )}

      <LoginPageClient nextPath={nextPath} />
    </AuthCard>
  )
}
