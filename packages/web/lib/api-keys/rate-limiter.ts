import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

let limiterInstance: Ratelimit | null | undefined = undefined

export function getRateLimiter(): Ratelimit | null {
  if (limiterInstance !== undefined) {
    return limiterInstance
  }

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url) {
    limiterInstance = null
    return null
  }

  const redis = new Redis({ url, token: token ?? '' })

  limiterInstance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: false,
  })

  return limiterInstance
}

export async function checkRateLimit(
  identifier: string
): Promise<{ success: boolean; reset?: number }> {
  const limiter = getRateLimiter()

  if (!limiter) {
    return { success: true }
  }

  const result = await limiter.limit(identifier)
  return { success: result.success, reset: result.reset }
}

// Reset singleton for testing
export function _resetRateLimiter(): void {
  limiterInstance = undefined
}
