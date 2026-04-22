import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginPageClient } from '@/app/auth/login/client'
import { SignupPageClient } from '@/app/auth/signup/client'

const mockSignInWithOAuth = vi.fn().mockResolvedValue(undefined)

vi.mock('@/components/auth/oauth-button', () => ({
  OAuthButton: ({
    provider,
    onClick,
    disabled,
  }: {
    provider: 'google' | 'github'
    onClick: () => void
    disabled?: boolean
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {provider}
    </button>
  ),
}))

vi.mock('@/components/auth/login-form', () => ({
  LoginForm: ({ nextPath }: { nextPath?: string }) => <div>login-form:{nextPath}</div>,
}))

vi.mock('@/components/auth/signup-form', () => ({
  SignupForm: ({ nextPath }: { nextPath?: string }) => <div>signup-form:{nextPath}</div>,
}))

vi.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: () => ({}),
}))

vi.mock('@/lib/auth/supabase-adapter', () => ({
  SupabaseAuthAdapter: class SupabaseAuthAdapterMock {
    signInWithOAuth = mockSignInWithOAuth
  },
}))

describe('auth page clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('LoginPageClient forwards nextPath into OAuth callback URL', async () => {
    render(<LoginPageClient nextPath="/t/acme/dashboard?tab=usage" />)
    fireEvent.click(screen.getByRole('button', { name: 'google' }))

    await waitFor(() => {
      const expectedOrigin = window.location.origin
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        'google',
        `${expectedOrigin}/auth/callback?next=%2Ft%2Facme%2Fdashboard%3Ftab%3Dusage`
      )
    })
  })

  it('SignupPageClient forwards nextPath into OAuth callback URL', async () => {
    render(<SignupPageClient nextPath="/t/acme/workspaces" />)
    fireEvent.click(screen.getByRole('button', { name: 'github' }))

    await waitFor(() => {
      const expectedOrigin = window.location.origin
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        'github',
        `${expectedOrigin}/auth/callback?next=%2Ft%2Facme%2Fworkspaces`
      )
    })
  })
})
