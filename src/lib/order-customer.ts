import { formatMexicanPhone, normalizeMexicanPhone } from '@/lib/checkout-validation'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ShippingContactFields = {
  phone?: string
  Phone?: string
  telefono?: string
  tel?: string
  email?: string
  Email?: string
  correo?: string
}

export type OrderContactSource = {
  customer_email?: string | null
  customer_phone?: string | null
  shipping_address?: ShippingContactFields | null
}

function shippingAddr(order: OrderContactSource): ShippingContactFields | null {
  const addr = order.shipping_address
  return addr && typeof addr === 'object' ? addr : null
}

/** Correo del cliente: columna dedicada o fallback en dirección (órdenes Wix). */
export function resolveOrderEmail(order: OrderContactSource): string | null {
  const direct = order.customer_email?.trim().toLowerCase()
  if (direct && EMAIL_RE.test(direct)) return direct

  const addr = shippingAddr(order)
  if (!addr) return null

  for (const key of ['email', 'Email', 'correo'] as const) {
    const raw = addr[key]?.trim().toLowerCase()
    if (raw && EMAIL_RE.test(raw)) return raw
  }

  return null
}

/** Teléfono del cliente: columna dedicada o fallback en dirección (órdenes Wix). */
export function resolveOrderPhone(order: OrderContactSource): string | null {
  const direct = normalizeMexicanPhone(order.customer_phone)
  if (direct) return direct

  const addr = shippingAddr(order)
  if (!addr) return null

  return normalizeMexicanPhone(
    addr.phone ?? addr.Phone ?? addr.telefono ?? addr.tel ?? ''
  )
}

export function formatOrderPhone(order: OrderContactSource): string | null {
  const digits = resolveOrderPhone(order)
  return digits ? formatMexicanPhone(digits) : null
}
