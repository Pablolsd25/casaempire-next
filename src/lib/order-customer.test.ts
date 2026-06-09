import { describe, expect, it } from 'vitest'
import {
  formatOrderPhone,
  resolveOrderEmail,
  resolveOrderPhone,
} from './order-customer'

describe('resolveOrderEmail', () => {
  it('uses customer_email column first', () => {
    expect(
      resolveOrderEmail({
        customer_email: 'cliente@ejemplo.com',
        shipping_address: { email: 'otro@ejemplo.com' },
      })
    ).toBe('cliente@ejemplo.com')
  })

  it('falls back to shipping_address.email from Wix', () => {
    expect(
      resolveOrderEmail({
        customer_email: null,
        shipping_address: { email: 'Rosineli@ejemplo.com' },
      })
    ).toBe('rosineli@ejemplo.com')
  })

  it('returns null when no email', () => {
    expect(resolveOrderEmail({ customer_email: null, shipping_address: {} })).toBeNull()
  })
})

describe('resolveOrderPhone', () => {
  it('uses customer_phone column first', () => {
    expect(
      resolveOrderPhone({
        customer_phone: '5512345678',
        shipping_address: { phone: '5599999999' },
      })
    ).toBe('5512345678')
  })

  it('falls back to shipping_address.phone from Wix', () => {
    expect(
      resolveOrderPhone({
        customer_phone: null,
        shipping_address: { phone: '+52 55 1234 5678' },
      })
    ).toBe('5512345678')
  })
})

describe('formatOrderPhone', () => {
  it('formats resolved phone', () => {
    expect(
      formatOrderPhone({ shipping_address: { phone: '5512345678' } })
    ).toBe('55 1234 5678')
  })
})
