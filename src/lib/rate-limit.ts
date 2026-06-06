import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'

type RateLimitResult = {
  success: boolean
  remaining: number
  reset: number
}

type MemoryBucket = { count: number; resetAt: number }

const memoryStore = new Map<string, MemoryBucket>()

function memoryRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = memoryStore.get(key)

  if (!bucket || now >= bucket.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, reset: bucket.resetAt }
  }

  bucket.count += 1
  return { success: true, remaining: limit - bucket.count, reset: bucket.resetAt }
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

function createUpstashLimiter(
  prefix: string,
  limit: number,
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`
): Ratelimit | null {
  if (!redisUrl || !redisToken) return null
  const redis = new Redis({ url: redisUrl, token: redisToken })
  return new Ratelimit({
    redis,
    limiter:    Ratelimit.slidingWindow(limit, window),
    prefix:     `casaempire:${prefix}`,
    analytics:  false,
  })
}

const limiters = {
  contact:  createUpstashLimiter('contact', 5, '1 h'),
  checkout: createUpstashLimiter('checkout', 10, '1 h'),
  coupons:  createUpstashLimiter('coupons', 20, '1 h'),
  testEmail: createUpstashLimiter('test-email', 3, '1 h'),
} as const

const memoryWindows = {
  contact:  60 * 60 * 1000,
  checkout: 60 * 60 * 1000,
  coupons:  60 * 60 * 1000,
  testEmail: 60 * 60 * 1000,
} as const

const memoryLimits = {
  contact:  5,
  checkout: 10,
  coupons:  20,
  testEmail: 3,
} as const

export type RateLimitScope = keyof typeof limiters

export function getClientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

export async function checkRateLimit(
  scope: RateLimitScope,
  req: NextRequest | Request
): Promise<RateLimitResult> {
  const ip = getClientIp(req)
  const limiter = limiters[scope]

  if (limiter) {
    const result = await limiter.limit(ip)
    return {
      success:   result.success,
      remaining: result.remaining,
      reset:     result.reset,
    }
  }

  return memoryRateLimit(`${scope}:${ip}`, memoryLimits[scope], memoryWindows[scope])
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset':     String(result.reset),
  }
}
