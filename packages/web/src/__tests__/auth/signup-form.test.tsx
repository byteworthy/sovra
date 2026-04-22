import { beforeEach, describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SignupForm } from '@/components/auth/signup-form'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/lib/auth/client', () => ({
  createSupabaseBrowserClient: () => ({}),
}))

const mockSignUp = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/auth/supabase-adapter', () => ({
  SupabaseAuthAdapter: class SupabaseAuthAdapterMock {
    signUp = mockSignUp
  },
}))

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders fullName, email, and password inputs', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText(/full name/i)).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(document.getElementById('password')).not.toBeNull()
  })

  it('renders "Create account" button', () => {
    render(<SignupForm />)
    const button = screen.getByRole('button', { name: /create account/i })
    expect(button.textContent).toBe('Create account')
  })

  it('renders footer with "Sign in" link', () => {
    render(<SignupForm />)
    const link = screen.getByText(/sign in/i).closest('a')
    expect(link?.getAttribute('href')).toContain('/auth/login')
  })

  it('navigates to provided next path after successful signup', async () => {
    render(<SignupForm nextPath="/t/acme/workspaces" />)

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: 'Jane Smith' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    })
    fireEvent.change(document.getElementById('password')!, {
      target: { value: 'supersecret' },
    })
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('jane@example.com', 'supersecret')
      expect(mockPush).toHaveBeenCalledWith('/t/acme/workspaces')
    })
  })
})
