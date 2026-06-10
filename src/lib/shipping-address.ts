export type ShippingAddressFields = {
  street?: string
  numExterior?: string
  numInterior?: string
  referencias?: string
  colonia?: string
  municipio?: string
  city?: string
  state?: string
  zip?: string
  zip_code?: string
  country?: string
  phone?: string
  email?: string
}

export function normalizeShippingAddress(
  raw: unknown
): { ok: true; address: Record<string, string> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Dirección inválida.' }
  }

  const input = raw as Record<string, unknown>
  const pick = (key: string) => String(input[key] ?? '').trim()

  const street = pick('street')
  const zip = pick('zip') || pick('zip_code')
  const colonia = pick('colonia')
  const municipio = pick('municipio') || pick('city')
  const state = pick('state')

  if (!street) return { ok: false, error: 'Ingresa la calle.' }
  if (!zip || zip.replace(/\D/g, '').length !== 5) {
    return { ok: false, error: 'Ingresa un código postal válido de 5 dígitos.' }
  }
  if (!colonia) return { ok: false, error: 'Ingresa la colonia.' }
  if (!municipio) return { ok: false, error: 'Ingresa el municipio o ciudad.' }
  if (!state) return { ok: false, error: 'Ingresa el estado.' }

  const address: Record<string, string> = {
    street,
    colonia,
    municipio,
    state,
    zip: zip.replace(/\D/g, '').slice(0, 5),
    country: pick('country') || 'México',
  }

  const numExterior = pick('numExterior')
  const numInterior = pick('numInterior')
  const referencias = pick('referencias')

  if (numExterior) address.numExterior = numExterior
  if (numInterior) address.numInterior = numInterior
  if (referencias) address.referencias = referencias
  if (!numExterior && !referencias) {
    return { ok: false, error: 'Ingresa número exterior o referencias para ubicar el domicilio.' }
  }

  const phone = pick('phone')
  const email = pick('email')
  if (phone) address.phone = phone
  if (email) address.email = email

  return { ok: true, address }
}

export function isShippingAddressIncomplete(
  addr: ShippingAddressFields | Record<string, string> | null | undefined
): boolean {
  if (!addr) return true
  const street = addr.street?.trim()
  const zip = (addr.zip ?? addr.zip_code ?? '').replace(/\D/g, '')
  const colonia = addr.colonia?.trim()
  const municipio = (addr.municipio ?? addr.city ?? '').trim()
  const state = addr.state?.trim()
  const hasLocation = !!(addr.numExterior?.trim() || addr.referencias?.trim())
  return !street || zip.length !== 5 || !colonia || !municipio || !state || !hasLocation
}

export function formatShippingAddressLines(
  addr: ShippingAddressFields | Record<string, string> | null | undefined
): { street: string | null; city: string | null } {
  if (!addr) return { street: null, city: null }

  const street = [
    addr.street,
    addr.numExterior ? `No. ${addr.numExterior}` : '',
    addr.numInterior ? `Int. ${addr.numInterior}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  const city = [
    addr.municipio ?? addr.city,
    addr.state,
    addr.zip ?? addr.zip_code,
    addr.country,
  ]
    .filter(Boolean)
    .join(', ')

  return {
    street: street || null,
    city: city || null,
  }
}
