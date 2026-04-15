import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Missing NEXT_PUBLIC_SUPABASE_URL — get it from your Supabase project settings'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Missing SUPABASE_SERVICE_ROLE_KEY').optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_').optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_').optional(),
  API_KEY_HASH_SECRET: z.string().min(32, 'API_KEY_HASH_SECRET must be at least 32 characters').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OPENAI_API_KEY must start with sk-').optional(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-', 'ANTHROPIC_API_KEY must start with sk-ant-').optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Invalid environment variables:')
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment variables. See errors above.')
  }
  return parsed.data
}
