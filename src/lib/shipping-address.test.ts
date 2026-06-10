import { describe, expect, it } from 'vitest'
import {
  isShippingAddressIncomplete,
  normalizeShippingAddress,
} from './shipping-address'

describe('normalizeShippingAddress', () => {
  it('accepts valid address', () => {
    const result = normalizeShippingAddress({
      street: 'Av. Reforma',
      numExterior: '100',
      colonia: 'Centro',
      municipio: 'Guadalajara',
      state: 'Jalisco',
      zip: '44100',
    })
    expect(result.ok).toBe(true)
  })

  it('rejects missing street', () => {
    expect(
      normalizeShippingAddress({
        colonia: 'Centro',
        municipio: 'GDL',
        state: 'Jalisco',
        zip: '44100',
        referencias: 'Frente al parque',
      }).ok
    ).toBe(false)
  })
})

describe('isShippingAddressIncomplete', () => {
  it('flags recovered order with only country', () => {
    expect(isShippingAddressIncomplete({ country: 'México', phone: '3317454602' })).toBe(true)
  })

  it('accepts complete address', () => {
    expect(
      isShippingAddressIncomplete({
        street: 'Calle 1',
        numExterior: '10',
        colonia: 'Centro',
        municipio: 'Monterrey',
        state: 'NL',
        zip: '64000',
        country: 'México',
      })
    ).toBe(false)
  })
})
