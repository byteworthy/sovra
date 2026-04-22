import { beforeEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LoginForm } from '@/components/auth/login-form'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: () => ({}),
}))

const mockSignIn = vi.fn().mockResolvedValue({ error: null })
const mockSignInWithMagicLink = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/auth/supabase-adapter', () => ({
  SupabaseAuthAdapter: class SupabaseAuthAdapterMock {
    signIn = mockSignIn
    signInWithMagicLink = mockSignInWithMagicLink
  },
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email input, password input, and submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(document.getElementById('password')).not.toBeNull()
    expect(screen.getByRole('button', { name: /sign in$/i })).toBeDefined()
  })

  it('renders "Sign in" button text', () => {
    render(<LoginForm />)
    const button = screen.getByRole('button', { name: /sign in$/i })
    expect(button.textContent).toBe('Sign in')
  })

  it('renders "Forgot password?" link', () => {
    render(<LoginForm />)
    const link = screen.getByText(/forgot password/i).closest('a')
    expect(link?.getAttribute('href')).toContain('/auth/forgot-password')
  })

  it('renders footer with "Sign up" link', () => {
    render(<LoginForm />)
    const link = screen.getByText(/sign up/i).closest('a')
    expect(link?.getAttribute('href')).toContain('/auth/signup')
  })

  it('navigates to provided next path after successful sign in', async () => {
    render(<LoginForm nextPath="/t/acme/dashboard" />)

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(document.getElementById('password')!, {
      target: { value: 'supersecret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in$/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'supersecret')
      expect(mockPush).toHaveBeenCalledWith('/t/acme/dashboard')
    })
  })
})
