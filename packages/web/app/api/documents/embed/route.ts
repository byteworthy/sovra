import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Json } from '@byteswarm/shared/types/database'
import { createSupabaseServerClient } from '@/lib/auth/server'
import { embedText } from '@/lib/vector/embed'
import { getEmbedLimiter, checkSessionRateLimit, rateLimitResponse } from '@/lib/rate-limit'

const embedRequestSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000, 'Content exceeds 50000 character limit'),
  metadata: z.record(z.unknown()).optional().default({}),
  agentId: z.string().uuid().optional(),
})

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = await checkSessionRateLimit(getEmbedLimiter(), user.id)
  if (!rl.success) return rateLimitResponse(rl.retryAfter!)

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = embedRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { content, metadata, agentId } = parsed.data

  // Resolve tenant_id from user's tenant membership
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant found for user' }, { status: 403 })
  }

  let embedding: number[]
  try {
    embedding = await embedText(content)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Embedding failed'
    if (message.includes('API key') || message.includes('apiKey') || message.includes('401')) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 503 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }

  if (embedding.length !== 1536) {
    return NextResponse.json(
      { error: `Embedding dimension mismatch: expected 1536, got ${embedding.length}` },
      { status: 500 }
    )
  }

  const { data: doc, error: insertError } = await supabase
    .from('vector_documents')
    .insert({
      tenant_id: tenantUser.tenant_id,
      agent_id: agentId ?? null,
      content,
      metadata: metadata as unknown as Json,
      embedding: JSON.stringify(embedding),
    })
    .select('id, content, metadata')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(doc, { status: 201 })
}
