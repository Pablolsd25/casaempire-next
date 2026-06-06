import { describe, expect, it } from 'vitest'
import { checkRateLimit } from './rate-limit'

function mockRequest(ip = '203.0.113.1'): Request {
  return new Request('http://localhost/api/contact', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('checkRateLimit (in-memory fallback)', () => {
  it('allows requests under the limit', async () => {
    const ip = `test-allow-${Date.now()}`
    const result = await checkRateLimit('contact', mockRequest(ip))
    expect(result.success).toBe(true)
    expect(result.remaining).toBeGreaterThanOrEqual(0)
  })

  it('blocks after exceeding contact limit', async () => {
    const ip = `test-block-${Date.now()}`
    let last = await checkRateLimit('contact', mockRequest(ip))
    for (let i = 0; i < 4; i++) {
      last = await checkRateLimit('contact', mockRequest(ip))
      expect(last.success).toBe(true)
    }
    last = await checkRateLimit('contact', mockRequest(ip))
    expect(last.success).toBe(false)
    expect(last.remaining).toBe(0)
  })
})
