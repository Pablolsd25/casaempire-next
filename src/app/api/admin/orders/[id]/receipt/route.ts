import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAccess } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildOrderReceiptPdf, type ReceiptOrder } from '@/lib/order-receipt-pdf'
import { formatOrderNumber } from '@/lib/order-number'
import { resolveOrderEmail, resolveOrderPhone } from '@/lib/order-customer'

type ReceiptOrderRow = {
  id: string
  wix_order_number: number | null
  created_at: string
  status: string
  customer_name: string | null
  customer_email: string | null
  customer_phone?: string | null
  subtotal: number
  shipping_cost: number | null
  discount: number | null
  total: number
  coupon_code: string | null
  openpay_transaction_id: string | null
  tracking_number: string | null
  shipping_address: Record<string, string> | null
  items: Array<{
    quantity: number
    unit_price: number
    name: string | null
    product: { name?: string } | { name?: string }[] | null
  }> | null
}

/** GET /api/admin/orders/[id]/receipt — descarga recibo PDF (no factura fiscal) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await checkAdminAccess()
  if (denied) return denied

  const { id } = await params
  const supabase = createAdminClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(quantity, unit_price, name, product:products(name))
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    console.error('[receipt] Orden no encontrada:', id, error?.message)
    return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
  }

  const typedOrder = order as ReceiptOrderRow

  const contact = {
    customer_email: typedOrder.customer_email,
    customer_phone: typedOrder.customer_phone,
    shipping_address: typedOrder.shipping_address,
  }
  const customerPhone = resolveOrderPhone(contact)
  const customerEmail = resolveOrderEmail(contact)

  const items = (typedOrder.items ?? []).map((row) => {
    const product = row.product
    const productName = Array.isArray(product) ? product[0]?.name : product?.name
    return {
      name: row.name ?? productName ?? 'Producto',
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
    }
  })

  const receiptOrder: ReceiptOrder = {
    id: typedOrder.id,
    wix_order_number: typedOrder.wix_order_number,
    created_at: typedOrder.created_at,
    status: typedOrder.status,
    customer_name: typedOrder.customer_name,
    customer_email: customerEmail,
    customer_phone: customerPhone,
    subtotal: Number(typedOrder.subtotal),
    shipping_cost: Number(typedOrder.shipping_cost ?? 0),
    discount: Number(typedOrder.discount ?? 0),
    total: Number(typedOrder.total),
    coupon_code: typedOrder.coupon_code,
    openpay_transaction_id: typedOrder.openpay_transaction_id,
    tracking_number: typedOrder.tracking_number,
    shipping_address: typedOrder.shipping_address,
    items,
  }

  let pdf: ArrayBuffer
  try {
    pdf = buildOrderReceiptPdf(receiptOrder)
  } catch (err) {
    console.error('[receipt] Error generando PDF:', err)
    return NextResponse.json(
      { error: 'No se pudo generar el PDF del recibo.' },
      { status: 500 }
    )
  }

  const shortId = formatOrderNumber(typedOrder, { withHash: false })

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="recibo-${shortId}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
