import type { createAdminClient } from '@/lib/supabase/admin'
import { SHIPPING_COST } from '@/lib/constants'
import { normalizeMexicanPhone } from '@/lib/checkout-validation'
import { cancelCheckoutOrder, insertCheckoutOrder } from '@/lib/checkout-order'
import { fulfillPaidOrder } from '@/lib/checkout-fulfillment'
import { idempotencyKeyVariants } from '@/lib/idempotency-key'
import { openpayFetch } from '@/lib/openpay-server'

type Supabase = ReturnType<typeof createAdminClient>

type OpenPayCustomer = {
  name?: string
  last_name?: string
  email?: string
  phone_number?: string
}

export type OpenPayCharge = {
  id: string
  status: string
  amount: number
  order_id?: string
  creation_date?: string
  customer?: OpenPayCustomer
}

type InferredItem = {
  productId: string | null
  name: string
  quantity: number
  price: number
}

function chargeToOrderStatus(
  chargeStatus: string
): 'paid' | 'pending' | 'cancelled' | null {
  if (chargeStatus === 'completed') return 'paid'
  if (chargeStatus === 'in_progress' || chargeStatus === 'charge_pending') {
    return 'pending'
  }
  if (chargeStatus === 'failed') return 'cancelled'
  return null
}

async function getDefaultShippingCost(supabase: Supabase): Promise<number> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'shipping_cost')
    .maybeSingle()
  return data?.value ? parseFloat(data.value) : SHIPPING_COST
}

export async function findOrderIdByOpenPayCharge(
  supabase: Supabase,
  charge: Pick<OpenPayCharge, 'id' | 'order_id'>
): Promise<string | null> {
  const { data: byTx } = await supabase
    .from('orders')
    .select('id')
    .eq('openpay_transaction_id', charge.id)
    .maybeSingle()
  if (byTx?.id) return byTx.id

  if (!charge.order_id) return null

  for (const key of idempotencyKeyVariants(charge.order_id)) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('idempotency_key', key)
      .maybeSingle()
    if (data?.id) return data.id
  }

  return null
}

async function inferLineItems(
  supabase: Supabase,
  subtotal: number
): Promise<InferredItem[]> {
  const { data: products } = await supabase
    .from('products')
    .select('id, name, price')
    .eq('is_active', true)
    .order('price', { ascending: false })

  const list = (products ?? []).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    price: Number(p.price),
  }))

  const match = (target: number) =>
    list.find((p) => Math.abs(p.price - target) < 0.02)

  const single = match(subtotal)
  if (single) {
    return [{ productId: single.id, name: single.name, quantity: 1, price: single.price }]
  }

  for (const p of list) {
    if (Math.abs(p.price * 2 - subtotal) < 0.02) {
      return [{ productId: p.id, name: p.name, quantity: 2, price: p.price }]
    }
  }

  for (let i = 0; i < list.length; i++) {
    for (let j = i; j < list.length; j++) {
      const sum = list[i].price + list[j].price
      if (Math.abs(sum - subtotal) < 0.02) {
        if (i === j) {
          return [
            { productId: list[i].id, name: list[i].name, quantity: 2, price: list[i].price },
          ]
        }
        return [
          { productId: list[i].id, name: list[i].name, quantity: 1, price: list[i].price },
          { productId: list[j].id, name: list[j].name, quantity: 1, price: list[j].price },
        ]
      }
    }
  }

  return [
    {
      productId: null,
      name:      'Producto (orden recuperada)',
      quantity:  1,
      price:     subtotal,
    },
  ]
}

function splitCustomerName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim()
  if (!trimmed) return { firstName: 'Cliente', lastName: '' }
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName:  trimmed.slice(space + 1),
  }
}

async function fulfillRecoveredOrder(
  supabase: Supabase,
  orderId: string
): Promise<void> {
  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, wix_order_number, status, profile_id, subtotal, shipping_cost, discount, total,
       coupon_code, customer_email, customer_name, customer_phone, shipping_address,
       items:order_items(product_id, quantity, unit_price, name, product:products(name))`
    )
    .eq('id', orderId)
    .single()

  if (!order) return

  const items = (order.items ?? []) as Array<{
    product_id: string | null
    quantity: number
    unit_price: number
    name: string | null
    product: { name?: string } | { name?: string }[] | null
  }>

  const { firstName, lastName } = splitCustomerName(order.customer_name ?? '')
  const rawAddr = (order.shipping_address ?? {}) as Record<string, string | undefined>
  const mappedItems = items.map((row) => {
    const product = row.product
    const productName = Array.isArray(product) ? product[0]?.name : product?.name
    return {
      productId: row.product_id ?? '',
      name:      row.name ?? productName ?? 'Producto',
      quantity:  row.quantity,
      price:     Number(row.unit_price),
    }
  })

  await fulfillPaidOrder(supabase, {
    orderId,
    wixOrderNumber: order.wix_order_number ?? null,
    profileId:       order.profile_id ?? null,
    items:           mappedItems.filter((i) => i.productId),
    customer: {
      firstName,
      lastName,
      email: order.customer_email ?? '',
      phone: order.customer_phone ?? '',
    },
    shippingAddress: {
      street:      rawAddr.street ?? '',
      numExterior: rawAddr.numExterior,
      numInterior: rawAddr.numInterior,
      referencias: rawAddr.referencias,
      colonia:     rawAddr.colonia,
      municipio:   rawAddr.municipio,
      city:        rawAddr.city,
      state:       rawAddr.state ?? '',
      zip:         rawAddr.zip ?? '',
      country:     rawAddr.country,
    },
    subtotal:        Number(order.subtotal ?? 0),
    shippingCost:    Number(order.shipping_cost ?? 0),
    total:           Number(order.total ?? 0),
    validCouponCode: order.coupon_code ?? null,
    productIds:      mappedItems.map((i) => i.productId).filter(Boolean),
    sendEmail:       true,
  })
}

export async function syncOrderWithOpenPayCharge(
  supabase: Supabase,
  charge: OpenPayCharge,
  options?: { fulfill?: boolean }
): Promise<{
  orderId: string
  created: boolean
  status: string
} | null> {
  const mappedStatus = chargeToOrderStatus(charge.status)
  if (!mappedStatus) return null

  const existingId = await findOrderIdByOpenPayCharge(supabase, charge)

  if (existingId) {
    const { data: existing } = await supabase
      .from('orders')
      .select('status')
      .eq('id', existingId)
      .single()

    const wasPaid = existing?.status === 'paid'

    await supabase
      .from('orders')
      .update({
        status:                 mappedStatus,
        openpay_transaction_id: charge.id,
      })
      .eq('id', existingId)

    if (mappedStatus === 'paid' && !wasPaid && options?.fulfill !== false) {
      await fulfillRecoveredOrder(supabase, existingId)
    }

    return { orderId: existingId, created: false, status: mappedStatus }
  }

  if (mappedStatus === 'cancelled') return null

  const total = Number(charge.amount)
  const shippingCost = await getDefaultShippingCost(supabase)
  const subtotal = Math.max(0, total - shippingCost)
  const customer = charge.customer ?? {}
  const customerName =
    [customer.name, customer.last_name].filter(Boolean).join(' ').trim() || 'Cliente'
  const customerEmail = customer.email?.trim().toLowerCase() ?? ''
  const customerPhone = normalizeMexicanPhone(customer.phone_number) ?? ''
  const idempotency =
    charge.order_id && idempotencyKeyVariants(charge.order_id).find((k) => k.includes('-'))
      ? idempotencyKeyVariants(charge.order_id).find((k) => k.includes('-'))!
      : charge.order_id ?? null

  const insertResult = await insertCheckoutOrder(supabase, {
    profile_id:             null,
    status:                 mappedStatus,
    subtotal,
    shipping_cost:          shippingCost,
    discount:               0,
    coupon_code:            null,
    total,
    openpay_transaction_id: charge.id,
    shipping_address:       { country: 'México', ...(customerPhone ? { phone: customerPhone } : {}) },
    customer_email:         customerEmail,
    customer_name:          customerName,
    customer_phone:         customerPhone,
    idempotency_key:        idempotency,
    created_at:             charge.creation_date,
  })

  if (!insertResult.ok) {
    console.error('[openpay-recovery] No se pudo crear orden:', insertResult.error)
    return null
  }

  const lineItems = await inferLineItems(supabase, subtotal)
  await supabase.from('order_items').insert(
    lineItems.map((item) => ({
      order_id:   insertResult.order.id,
      product_id: item.productId,
      quantity:   item.quantity,
      unit_price: item.price,
      name:       item.name,
    }))
  )

  if (mappedStatus === 'paid' && options?.fulfill !== false) {
    await fulfillRecoveredOrder(supabase, insertResult.order.id)
  }

  return {
    orderId: insertResult.order.id,
    created: true,
    status:  mappedStatus,
  }
}

export async function recoverOrderFromOpenPayChargeId(
  supabase: Supabase,
  chargeId: string,
  options?: { fulfill?: boolean }
): Promise<
  | { ok: true; orderId: string; created: boolean; status: string }
  | { ok: false; error: string }
> {
  const res = await openpayFetch(`/charges/${encodeURIComponent(chargeId)}`)
  const charge = (await res.json()) as OpenPayCharge

  if (!res.ok) {
    return { ok: false, error: 'Cargo no encontrado en OpenPay.' }
  }

  const result = await syncOrderWithOpenPayCharge(supabase, charge, options)
  if (!result) {
    return { ok: false, error: `Estado de cargo no recuperable: ${charge.status}` }
  }

  return { ok: true, ...result }
}

export async function fetchOpenPayCharge(chargeId: string): Promise<OpenPayCharge | null> {
  const res = await openpayFetch(`/charges/${encodeURIComponent(chargeId)}`)
  if (!res.ok) return null
  return (await res.json()) as OpenPayCharge
}

export { cancelCheckoutOrder }
