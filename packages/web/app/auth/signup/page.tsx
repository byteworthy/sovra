import { AuthCard } from '@/components/auth/auth-card'
import { SignupPageClient } from './client'

export const metadata = {
  title: 'Create account | ByteSwarm',
}

export default function SignupPage() {
  return (
    <AuthCard aria-label="Create account form">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground mt-2">Start building production AI apps today</p>
      </div>

      <SignupPageClient />
    </AuthCard>
  )
}
