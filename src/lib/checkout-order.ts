import type { createAdminClient } from '@/lib/supabase/admin'

type Supabase = ReturnType<typeof createAdminClient>

export type CheckoutOrderInsert = {
  profile_id: string | null
  status: 'pending' | 'paid' | 'cancelled'
  subtotal: number
  shipping_cost: number
  discount: number
  coupon_code: string | null
  total: number
  openpay_transaction_id?: string | null
  shipping_address: Record<string, string>
  customer_email: string
  customer_name: string
  customer_phone: string
  idempotency_key: string | null
  created_at?: string
}

export type InsertedOrder = {
  id: string
  wix_order_number: number | null
  status: string
}

export function enrichShippingWithPhone(
  shippingAddress: Record<string, string>,
  phone: string
): Record<string, string> {
  if (!phone) return shippingAddress
  return { ...shippingAddress, phone }
}

/** Inserta orden; si falta columna customer_phone, guarda teléfono en shipping_address. */
export async function insertCheckoutOrder(
  supabase: Supabase,
  payload: CheckoutOrderInsert
): Promise<{ ok: true; order: InsertedOrder } | { ok: false; error: string }> {
  const shipping_address = enrichShippingWithPhone(
    payload.shipping_address,
    payload.customer_phone
  )

  const base: Record<string, unknown> = {
    profile_id:             payload.profile_id,
    status:                 payload.status,
    subtotal:               payload.subtotal,
    shipping_cost:          payload.shipping_cost,
    discount:               payload.discount,
    coupon_code:            payload.coupon_code,
    total:                  payload.total,
    openpay_transaction_id: payload.openpay_transaction_id ?? null,
    shipping_address,
    customer_email:         payload.customer_email,
    customer_name:          payload.customer_name,
    idempotency_key:        payload.idempotency_key,
  }

  if (payload.created_at) base.created_at = payload.created_at

  const withPhone = { ...base, customer_phone: payload.customer_phone }
  const first = await supabase
    .from('orders')
    .insert(withPhone)
    .select('id, wix_order_number, status')
    .single()

  const missingPhoneColumn =
    first.error?.code === '42703' ||
    first.error?.code === 'PGRST204' ||
    first.error?.message?.includes('customer_phone')

  if (missingPhoneColumn) {
    const retry = await supabase
      .from('orders')
      .insert(base)
      .select('id, wix_order_number, status')
      .single()
    if (retry.error) return { ok: false, error: retry.error.message }
    return { ok: true, order: retry.data as InsertedOrder }
  }

  if (first.error) return { ok: false, error: first.error.message }
  return { ok: true, order: first.data as InsertedOrder }
}

export async function cancelCheckoutOrder(
  supabase: Supabase,
  orderId: string
): Promise<void> {
  await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
}
