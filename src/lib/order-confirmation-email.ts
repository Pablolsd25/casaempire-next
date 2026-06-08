import type { createAdminClient } from '@/lib/supabase/admin'
import { sendOrderConfirmation } from '@/lib/email/templates'
import { LEGAL } from '@/lib/site-legal'

type Supabase = ReturnType<typeof createAdminClient>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type OrderEmailRow = {
  id: string
  status: string
  wix_order_number: number | null
  confirmation_email_sent_at: string | null
  customer_email: string | null
  customer_name: string | null
  subtotal: number
  shipping_cost: number
  total: number
  shipping_address: Record<string, string | undefined> | null
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    product: { name?: string } | { name?: string }[] | null
  }> | null
}

function splitCustomerName(full: string | null): string {
  return (full ?? '').trim() || 'Cliente'
}

function mapOrderItems(
  rows: OrderEmailRow['items']
): Array<{ productId: string; name: string; quantity: number; price: number }> {
  return (rows ?? []).map((row) => {
    const product = row.product
    const name = Array.isArray(product) ? product[0]?.name : product?.name
    return {
      productId: row.product_id,
      name:      name ?? 'Producto',
      quantity:  row.quantity,
      price:     row.unit_price,
    }
  })
}

export async function sendCustomerOrderConfirmationIfNeeded(
  supabase: Supabase,
  orderId: string
): Promise<boolean> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `id, status, wix_order_number, confirmation_email_sent_at,
       customer_email, customer_name, subtotal, shipping_cost, total, shipping_address,
       items:order_items(product_id, quantity, unit_price, product:products(name))`
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    console.error('[email] Orden no encontrada para confirmación:', orderId, error?.message)
    return false
  }

  const row = order as OrderEmailRow

  if (row.confirmation_email_sent_at) return true
  if (row.status !== 'paid') return false

  const email = row.customer_email?.trim().toLowerCase() ?? ''
  if (!email || !EMAIL_RE.test(email)) {
    console.error('[email] Email de cliente inválido o vacío — orden', orderId, '|', email || '(vacío)')
    return false
  }

  const rawAddr = (row.shipping_address ?? {}) as Record<string, string | undefined>
  const items = mapOrderItems(row.items)

  try {
    await sendOrderConfirmation({
      to:               email,
      orderId:          row.id,
      wixOrderNumber:   row.wix_order_number,
      items,
      subtotal:         row.subtotal,
      shipping:         row.shipping_cost,
      total:            row.total,
      name:             splitCustomerName(row.customer_name),
      shippingAddress: {
        street:      rawAddr.street ?? '',
        numExterior: rawAddr.numExterior,
        numInterior: rawAddr.numInterior,
        colonia:     rawAddr.colonia,
        municipio:   rawAddr.municipio,
        referencias: rawAddr.referencias,
        city:        rawAddr.city,
        state:       rawAddr.state ?? '',
        zip:         rawAddr.zip ?? '',
        country:     rawAddr.country ?? 'México',
      },
      replyTo: LEGAL.email,
    })

    await supabase
      .from('orders')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', orderId)

    console.info('[email] Confirmación enviada al cliente:', email, '| orden', orderId)
    return true
  } catch (err) {
    console.error('[email] Confirmación al cliente falló — orden', orderId, '|', email, err)
    return false
  }
}
