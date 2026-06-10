import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fulfillPaidOrder } from '@/lib/checkout-fulfillment'
import { getOpenPayError } from '@/lib/openpay-errors'
import { openpayFetch } from '@/lib/openpay-server'
import { recoverOrderFromOpenPayChargeId } from '@/lib/openpay-order-recovery'

function splitCustomerName(full: string | null): { firstName: string; lastName: string } {
  const trimmed = (full ?? '').trim()
  if (!trimmed) return { firstName: 'Cliente', lastName: '' }
  const space = trimmed.indexOf(' ')
  if (space === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, space),
    lastName:  trimmed.slice(space + 1),
  }
}

type OrderRow = {
  id: string
  wix_order_number: number | null
  status: string
  profile_id: string | null
  subtotal: number
  shipping_cost: number
  discount: number
  total: number
  coupon_code: string | null
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  shipping_address: Record<string, string | undefined> | null
  items: Array<{
    product_id: string
    quantity: number
    unit_price: number
    product: { name?: string } | { name?: string }[] | null
  }> | null
}

function orderResponse(
  order: OrderRow,
  status: string,
  extra?: Record<string, unknown>
) {
  return {
    orderId:  order.id,
    status,
    loggedIn: !!order.profile_id,
    ...extra,
  }
}

// GET /api/checkout/3ds-confirm?chargeId=… — Paso 8 del flujo 3D Secure (Openpay)
export async function GET(req: NextRequest) {
  try {
    const chargeId = req.nextUrl.searchParams.get('chargeId')?.trim()
    if (!chargeId) {
      return NextResponse.json({ error: 'Falta el identificador del cargo.' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        `id, wix_order_number, status, profile_id, subtotal, shipping_cost, discount, total, coupon_code,
         customer_email, customer_name, customer_phone, shipping_address,
         items:order_items(product_id, quantity, unit_price, product:products(name))`
      )
      .eq('openpay_transaction_id', chargeId)
      .single()

    if (orderError || !order) {
      const recovered = await recoverOrderFromOpenPayChargeId(supabase, chargeId)
      if (!recovered.ok) {
        return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
      }

      const { data: recoveredOrder } = await supabase
        .from('orders')
        .select(
          `id, wix_order_number, status, profile_id, subtotal, shipping_cost, discount, total, coupon_code,
           customer_email, customer_name, customer_phone, shipping_address,
           items:order_items(product_id, quantity, unit_price, product:products(name))`
        )
        .eq('id', recovered.orderId)
        .single()

      if (!recoveredOrder) {
        return NextResponse.json({ error: 'Orden no encontrada.' }, { status: 404 })
      }

      return NextResponse.json(
        orderResponse(recoveredOrder as OrderRow, recovered.status)
      )
    }

    const typedOrder = order as OrderRow

    if (typedOrder.status === 'paid') {
      return NextResponse.json(orderResponse(typedOrder, 'paid'))
    }

    const openpayRes = await openpayFetch(`/charges/${encodeURIComponent(chargeId)}`)
    const charge = await openpayRes.json()

    if (!openpayRes.ok) {
      console.error('[3ds-confirm] OpenPay GET charge failed — status:', charge.status)
      return NextResponse.json(
        { error: getOpenPayError(charge) },
        { status: 502 }
      )
    }

    console.log('[3ds-confirm] charge status:', charge.status, '| order:', typedOrder.id)

    if (charge.status === 'completed') {
      await supabase.from('orders').update({ status: 'paid' }).eq('id', typedOrder.id)

      const { firstName, lastName } = splitCustomerName(typedOrder.customer_name)
      const rawAddr = (typedOrder.shipping_address ?? {}) as Record<string, string | undefined>
      const shippingAddress = {
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
      }

      const items = (typedOrder.items ?? []).map((row) => {
        const product = row.product
        const name = Array.isArray(product)
          ? product[0]?.name
          : product?.name
        return {
          productId: row.product_id,
          name:      name ?? 'Producto',
          quantity:  row.quantity,
          price:     row.unit_price,
        }
      })

      await fulfillPaidOrder(supabase, {
        orderId:         typedOrder.id,
        wixOrderNumber:  typedOrder.wix_order_number,
        profileId:       typedOrder.profile_id,
        items,
        customer: {
          firstName,
          lastName,
          email: typedOrder.customer_email ?? '',
          phone: typedOrder.customer_phone ?? '',
        },
        shippingAddress,
        subtotal:        typedOrder.subtotal,
        shippingCost:    typedOrder.shipping_cost,
        total:           typedOrder.total,
        validCouponCode: typedOrder.coupon_code,
        productIds:      items.map((i) => i.productId),
      })

      return NextResponse.json(orderResponse(typedOrder, 'paid'))
    }

    if (charge.status === 'in_progress') {
      return NextResponse.json(orderResponse(typedOrder, 'pending'))
    }

    if (charge.status === 'charge_pending') {
      return NextResponse.json(orderResponse(typedOrder, 'pending', { pending3ds: true }))
    }

    if (charge.status === 'failed') {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', typedOrder.id)
      return NextResponse.json(
        orderResponse(typedOrder, 'failed', { error: getOpenPayError(charge) })
      )
    }

    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', typedOrder.id)
    return NextResponse.json(
      orderResponse(typedOrder, 'failed', { error: getOpenPayError(charge) })
    )
  } catch (err) {
    console.error('[3ds-confirm] Error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}
