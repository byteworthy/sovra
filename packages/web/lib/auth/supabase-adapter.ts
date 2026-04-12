import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthAdapter, AuthUser, AuthSession, AuthResult, OAuthProvider } from '@byteswarm/shared'
import type { Database } from '@byteswarm/shared'

function mapUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  }
}

function mapSession(session: {
  user: { id: string; email?: string; user_metadata?: Record<string, unknown> }
  access_token: string
  refresh_token: string
  expires_at?: number
} | null): AuthSession | null {
  if (!session) return null
  const user = mapUser(session.user)
  if (!user) return null
  return {
    user,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
  }
}

export class SupabaseAuthAdapter implements AuthAdapter {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({ email, password })
    return {
      user: mapUser(data.user),
      session: mapSession(data.session),
      error: error?.message ?? null,
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password })
    return {
      user: mapUser(data.user),
      session: mapSession(data.session),
      error: error?.message ?? null,
    }
  }

  async signInWithMagicLink(email: string, redirectTo: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })
    return { error: error?.message ?? null }
  }

  async signInWithOAuth(provider: OAuthProvider, redirectTo: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    return { error: error?.message ?? null }
  }

  async signOut(): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signOut()
    return { error: error?.message ?? null }
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.supabase.auth.getClaims()
    if (error || !data) return null
    // getClaims validates the JWT signature — use getUser to build session from claims
    const { data: userData } = await this.supabase.auth.getUser()
    if (!userData.user) return null
    return {
      user: {
        id: userData.user.id,
        email: userData.user.email ?? '',
        fullName: (userData.user.user_metadata?.full_name as string | undefined) ?? null,
        avatarUrl: (userData.user.user_metadata?.avatar_url as string | undefined) ?? null,
      },
      accessToken: data.claims.sub ?? '',
      refreshToken: '',
      expiresAt: typeof data.claims.exp === 'number' ? data.claims.exp : 0,
    }
  }

  async getUser(): Promise<AuthUser | null> {
    const { data, error } = await this.supabase.auth.getUser()
    if (error) return null
    return mapUser(data.user)
  }

  async resetPassword(email: string, redirectTo: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error: error?.message ?? null }
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword })
    return { error: error?.message ?? null }
  }
}
