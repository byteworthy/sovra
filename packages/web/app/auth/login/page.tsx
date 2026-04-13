import { AuthCard } from '@/components/auth/auth-card'
import { OAuthButton } from '@/components/auth/oauth-button'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/login-form'
import { Alert } from '@/components/ui/alert'
import { LoginPageClient } from './client'

export const metadata = {
  title: 'Sign in | ByteSwarm',
}

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorFromUrl = params.error

  return (
    <AuthCard aria-label="Sign in form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-2">Welcome back to ByteSwarm</p>
      </div>

      {errorFromUrl && (
        <div className="mb-4">
          <Alert variant="destructive">{errorFromUrl}</Alert>
        </div>
      )}

      <LoginPageClient />
    </AuthCard>
  )
}
