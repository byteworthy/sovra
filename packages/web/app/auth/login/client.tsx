'use client'

import { useState } from 'react'
import { OAuthButton } from '@/components/auth/oauth-button'
import { Separator } from '@/components/ui/separator'
import { LoginForm } from '@/components/auth/login-form'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'
import { createSupabaseBrowserClient } from '@/lib/auth/client'
import { buildAuthCallbackUrl } from '@/lib/auth/redirect'

interface LoginPageClientProps {
  nextPath: string
}

export function LoginPageClient({ nextPath }: LoginPageClientProps) {
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  async function handleOAuth(provider: 'google' | 'github') {
    setOauthLoading(provider)
    const supabase = createSupabaseBrowserClient()
    const adapter = new SupabaseAuthAdapter(supabase)
    await adapter.signInWithOAuth(provider, buildAuthCallbackUrl(window.location.origin, nextPath))
  }

  return (
    <>
      <div className="space-y-2 mt-6">
        <OAuthButton
          provider="google"
          loading={oauthLoading === 'google'}
          disabled={oauthLoading !== null}
          onClick={() => handleOAuth('google')}
        />
        <OAuthButton
          provider="github"
          loading={oauthLoading === 'github'}
          disabled={oauthLoading !== null}
          onClick={() => handleOAuth('github')}
        />
      </div>

      <div className="my-4">
        <Separator text="or" />
      </div>

      <LoginForm nextPath={nextPath} />
    </>
  )
}
