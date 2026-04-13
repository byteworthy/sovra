import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let chatLimiter: Ratelimit | null | undefined
let embedLimiter: Ratelimit | null | undefined

function createLimiter(
  window: `${number} ${'s' | 'm' | 'h' | 'd'}`,
  maxRequests: number,
  prefix: string
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url) return null

  return new Ratelimit({
    redis: new Redis({ url, token: token ?? '' }),
    limiter: Ratelimit.slidingWindow(maxRequests, window),
    analytics: false,
    prefix,
  })
}

export function getChatLimiter(): Ratelimit | null {
  if (chatLimiter !== undefined) return chatLimiter
  chatLimiter = createLimiter('1 m', 20, 'rl:chat')
  return chatLimiter
}

export function getEmbedLimiter(): Ratelimit | null {
  if (embedLimiter !== undefined) return embedLimiter
  embedLimiter = createLimiter('1 m', 30, 'rl:embed')
  return embedLimiter
}

export async function checkSessionRateLimit(
  limiter: Ratelimit | null,
  userId: string
): Promise<{ success: boolean; retryAfter?: number }> {
  if (!limiter) return { success: true }

  const result = await limiter.limit(userId)
  if (result.success) return { success: true }

  const retryAfter = result.reset
    ? Math.ceil((result.reset - Date.now()) / 1000)
    : 60

  return { success: false, retryAfter }
}

export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  )
}
