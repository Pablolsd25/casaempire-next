import { describe, expect, it } from 'vitest'
import {
  MAX_ITEM_QUANTITY,
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
