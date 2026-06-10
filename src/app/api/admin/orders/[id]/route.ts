import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/admin-auth'
import { sendShippingNotification } from '@/lib/email/templates'
import { resolveOrderEmail } from '@/lib/order-customer'
import { resolveWixOrderNumber } from '@/lib/order-number'
import { normalizeShippingAddress } from '@/lib/shipping-address'

// PATCH /api/admin/orders/[id] — actualizar status, tracking, notas o dirección
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()
  const body = await req.json()
  const { status, tracking_number, notes, shipping_address } = body

  // ── Actualizar dirección de envío ─────────────────────────────────────────
  if (shipping_address !== undefined && status === undefined) {
    const normalized = normalizeShippingAddress(shipping_address)
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('orders')
      .select('shipping_address')
      .eq('id', id)
      .single()

    const prev = (existing?.shipping_address ?? {}) as Record<string, string>
    const merged: Record<string, string> = {
      ...prev,
      ...normalized.address,
    }
    if (prev.phone && !merged.phone) merged.phone = prev.phone
    if (prev.email && !merged.email) merged.email = prev.email

    const { data: order, error } = await supabase
      .from('orders')
      .update({ shipping_address: merged })
      .eq('id', id)
      .select()
      .single()

    if (error || !order) {
      return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 400 })
    }
    return NextResponse.json(order)
  }

  // ── Actualizar tracking_number (sin cambiar status) ───────────────────────
  if (tracking_number !== undefined && status === undefined && notes === undefined) {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ tracking_number: tracking_number || null })
      .eq('id', id)
      .select()
      .single()
    if (error || !order) return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 400 })
    return NextResponse.json(order)
  }

  // ── Actualizar nota interna ───────────────────────────────────────────────
  if (notes !== undefined && status === undefined) {
    const { data: order, error } = await supabase
      .from('orders')
      .update({ notes: notes || null })
      .eq('id', id)
      .select()
      .single()
    if (error || !order) return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 400 })
    return NextResponse.json(order)
  }

  // ── Actualizar status ─────────────────────────────────────────────────────
  const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
  }

  const { data: order, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select('*, items:order_items(unit_price, quantity, product:products(name))')
    .single()

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? 'Error al actualizar' }, { status: 400 })
  }

  // ── Disparar email de envío cuando pasa a "shipped" ───────────────────────
  const customerEmail = resolveOrderEmail(order)
  if (status === 'shipped' && customerEmail) {
    try {
      const addr = order.shipping_address as {
        street?: string; city?: string; state?: string; zip?: string; country?: string
      } | null

      const resolvedWix = await resolveWixOrderNumber(supabase, order.id, order.wix_order_number)

      await sendShippingNotification({
        to:             customerEmail,
        orderId:        order.id,
        wixOrderNumber: resolvedWix,
        name:           order.customer_name ?? customerEmail,
        trackingNumber: order.tracking_number ?? undefined,
        shippingAddress: addr ? {
          street:  addr.street  ?? '',
          city:    addr.city    ?? '',
          state:   addr.state   ?? '',
          zip:     addr.zip     ?? '',
          country: addr.country ?? 'México',
        } : undefined,
      })
    } catch (emailErr) {
      console.warn('[admin] Error al enviar email de envío:', emailErr)
    }
  }

  return NextResponse.json(order)
}

// DELETE /api/admin/orders/[id] — eliminar orden y sus items
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const supabase = createAdminClient()

  // Delete line items first (foreign key)
  await supabase.from('order_items').delete().eq('order_id', id)

  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
