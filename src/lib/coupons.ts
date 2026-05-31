import type { SupabaseClient } from '@supabase/supabase-js'
import type { Coupon } from '@/types'

export interface CouponValidationResult {
  valid: boolean
  message: string
  /** Monto de descuento aplicado al subtotal (0 en envío gratis) */
  discount: number
  /** Si el cupón otorga envío gratis */
  freeShipping: boolean
  coupon?: Coupon
}

const FIELDS = 'id, code, type, value, min_purchase, max_uses, used_count, expires_at, is_active, created_at'

/**
 * Valida un código de cupón contra el subtotal del carrito.
 * Usa el cliente admin (service_role) — la tabla coupons no es accesible públicamente.
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  subtotal: number,
): Promise<CouponValidationResult> {
  const code = (rawCode ?? '').trim()
  if (!code) {
    return { valid: false, message: 'Ingresa un código.', discount: 0, freeShipping: false }
  }

  const { data: coupon } = await supabase
    .from('coupons')
    .select(FIELDS)
    .ilike('code', code)
    .maybeSingle()

  if (!coupon) {
    return { valid: false, message: 'El cupón no existe.', discount: 0, freeShipping: false }
  }
  if (!coupon.is_active) {
    return { valid: false, message: 'Este cupón ya no está activo.', discount: 0, freeShipping: false }
  }
  if (coupon.expires_at && new Date(coupon.expires_at) <= new Date()) {
    return { valid: false, message: 'Este cupón ha expirado.', discount: 0, freeShipping: false }
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, message: 'Este cupón alcanzó su límite de usos.', discount: 0, freeShipping: false }
  }
  if (subtotal < Number(coupon.min_purchase)) {
    return {
      valid: false,
      message: `Compra mínima de $${Number(coupon.min_purchase).toLocaleString('es-MX')} para usar este cupón.`,
      discount: 0,
      freeShipping: false,
    }
  }

  // Calcular descuento según tipo
  let discount = 0
  let freeShipping = false
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal * Number(coupon.value)) / 100 * 100) / 100
  } else if (coupon.type === 'fixed') {
    discount = Math.min(Number(coupon.value), subtotal) // no pasar del subtotal
  } else if (coupon.type === 'free_shipping') {
    freeShipping = true
  }

  return {
    valid: true,
    message: 'Cupón aplicado.',
    discount,
    freeShipping,
    coupon: coupon as Coupon,
  }
}
