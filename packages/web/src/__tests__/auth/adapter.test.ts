import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'
import { SupabaseAuthAdapter } from '@/lib/auth/supabase-adapter'

describe('SupabaseAuthAdapter', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>
  let adapter: SupabaseAuthAdapter

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    adapter = new SupabaseAuthAdapter(mockClient as never)
  })

  it('signUp calls supabase.auth.signUp with email and password', async () => {
    mockClient.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    await adapter.signUp('user@example.com', 'password123')
    expect(mockClient.auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('signIn calls supabase.auth.signInWithPassword with email and password', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    await adapter.signIn('user@example.com', 'password123')
    expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    })
  })

  it('signInWithMagicLink calls supabase.auth.signInWithOtp with emailRedirectTo', async () => {
    mockClient.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })
    await adapter.signInWithMagicLink('user@example.com', 'https://example.com/callback')
    expect(mockClient.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: { emailRedirectTo: 'https://example.com/callback' },
    })
  })

  it('signInWithOAuth calls supabase.auth.signInWithOAuth with provider and redirectTo', async () => {
    mockClient.auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
    await adapter.signInWithOAuth('google', 'https://example.com/callback')
    expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://example.com/callback' },
    })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockClient.auth.signOut.mockResolvedValue({ error: null })
    await adapter.signOut()
    expect(mockClient.auth.signOut).toHaveBeenCalled()
  })

  it('resetPassword calls supabase.auth.resetPasswordForEmail with email and redirectTo', async () => {
    mockClient.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    await adapter.resetPassword('user@example.com', 'https://example.com/reset')
    expect(mockClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://example.com/reset',
    })
  })

  it('updatePassword calls supabase.auth.updateUser with new password', async () => {
    mockClient.auth.updateUser.mockResolvedValue({ data: { user: null }, error: null })
    await adapter.updatePassword('newPassword123')
    expect(mockClient.auth.updateUser).toHaveBeenCalledWith({ password: 'newPassword123' })
  })
})
