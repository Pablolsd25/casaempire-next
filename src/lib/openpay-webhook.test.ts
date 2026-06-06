import { afterEach, describe, expect, it } from 'vitest'
import { verifyOpenPayWebhookBasicAuth } from './openpay-webhook'

const originalUser = process.env.OPENPAY_WEBHOOK_USER
const originalPass = process.env.OPENPAY_WEBHOOK_PASSWORD

afterEach(() => {
  if (originalUser === undefined) delete process.env.OPENPAY_WEBHOOK_USER
  else process.env.OPENPAY_WEBHOOK_USER = originalUser
  if (originalPass === undefined) delete process.env.OPENPAY_WEBHOOK_PASSWORD
  else process.env.OPENPAY_WEBHOOK_PASSWORD = originalPass
})

describe('verifyOpenPayWebhookBasicAuth', () => {
  it('rejects when credentials are not configured (fail-closed)', () => {
    delete process.env.OPENPAY_WEBHOOK_USER
    delete process.env.OPENPAY_WEBHOOK_PASSWORD
    expect(verifyOpenPayWebhookBasicAuth(null)).toBe(false)
  })

  it('rejects missing Authorization header', () => {
    process.env.OPENPAY_WEBHOOK_USER = 'webhook'
    process.env.OPENPAY_WEBHOOK_PASSWORD = 'secret'
    expect(verifyOpenPayWebhookBasicAuth(null)).toBe(false)
  })

  it('accepts valid Basic Auth', () => {
    process.env.OPENPAY_WEBHOOK_USER = 'webhook'
    process.env.OPENPAY_WEBHOOK_PASSWORD = 'secret'
    const token = Buffer.from('webhook:secret').toString('base64')
    expect(verifyOpenPayWebhookBasicAuth(`Basic ${token}`)).toBe(true)
  })

  it('rejects wrong password', () => {
    process.env.OPENPAY_WEBHOOK_USER = 'webhook'
    process.env.OPENPAY_WEBHOOK_PASSWORD = 'secret'
    const token = Buffer.from('webhook:wrong').toString('base64')
    expect(verifyOpenPayWebhookBasicAuth(`Basic ${token}`)).toBe(false)
  })
})
