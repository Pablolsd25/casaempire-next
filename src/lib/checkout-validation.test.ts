import { describe, expect, it } from 'vitest'
import {
  MAX_ITEM_QUANTITY,
  formatMexicanPhone,
  normalizeMexicanPhone,
  validateCheckoutCustomer,
  validateClientAmount,
  validateItemQuantities,
} from './checkout-validation'

describe('validateItemQuantities', () => {
  it('rejects empty cart', () => {
    expect(validateItemQuantities([])).toBe('El carrito está vacío.')
  })

  it('rejects non-positive quantity', () => {
    expect(
      validateItemQuantities([{ productId: 'a', quantity: 0 }])
    ).toBe('La cantidad debe ser un número entero mayor a 0.')
  })

  it('rejects negative quantity', () => {
    expect(
      validateItemQuantities([{ productId: 'a', quantity: -3 }])
    ).toBe('La cantidad debe ser un número entero mayor a 0.')
  })

  it('rejects quantity above max', () => {
    expect(
      validateItemQuantities([{ productId: 'a', quantity: MAX_ITEM_QUANTITY + 1 }])
    ).toBe(`La cantidad máxima por producto es ${MAX_ITEM_QUANTITY}.`)
  })

  it('accepts valid items', () => {
    expect(
      validateItemQuantities([{ productId: 'a', quantity: 2 }])
    ).toBeNull()
  })
})

describe('validateClientAmount', () => {
  it('rejects tampered client amount', () => {
    expect(validateClientAmount(10, 100)).toMatch(/cambió/)
  })

  it('accepts matching amount within tolerance', () => {
    expect(validateClientAmount(100, 100)).toBeNull()
    expect(validateClientAmount(100.01, 100)).toBeNull()
  })

  it('rejects invalid amount', () => {
    expect(validateClientAmount(0, 100)).toBe('Monto de pago inválido.')
  })
})

describe('normalizeMexicanPhone', () => {
  it('accepts 10 digits', () => {
    expect(normalizeMexicanPhone('5512345678')).toBe('5512345678')
  })

  it('strips country code and formatting', () => {
    expect(normalizeMexicanPhone('+52 55 1234 5678')).toBe('5512345678')
  })

  it('rejects too short', () => {
    expect(normalizeMexicanPhone('55123')).toBeNull()
  })
})

describe('formatMexicanPhone', () => {
  it('formats 10 digits', () => {
    expect(formatMexicanPhone('5512345678')).toBe('55 1234 5678')
  })
})

describe('validateCheckoutCustomer', () => {
  const valid = {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@ejemplo.com',
    phone: '5512345678',
  }

  it('accepts valid contact data', () => {
    const result = validateCheckoutCustomer(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.customer).toEqual({
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@ejemplo.com',
        phone: '5512345678',
      })
    }
  })

  it('rejects missing first name', () => {
    expect(validateCheckoutCustomer({ ...valid, firstName: '  ' }).ok).toBe(false)
  })

  it('rejects missing last name', () => {
    expect(validateCheckoutCustomer({ ...valid, lastName: '' }).ok).toBe(false)
  })

  it('rejects invalid email', () => {
    expect(validateCheckoutCustomer({ ...valid, email: 'no-es-correo' }).ok).toBe(false)
  })

  it('rejects invalid phone', () => {
    expect(validateCheckoutCustomer({ ...valid, phone: '123' }).ok).toBe(false)
  })
})
