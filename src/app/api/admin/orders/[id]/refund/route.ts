import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkAdminAccess } from '@/lib/admin-auth'

const OPENPAY_API = process.env.NEXT_PUBLIC_OPENPAY_SANDBOX === 'true'
  ? 'https://sandbox-api.openpay.mx/v1'
  : 'https://api.openpay.mx/v1'

const MERCHANT_ID = process.env.NEXT_PUBLIC_OPENPAY_MERCHANT_ID!
const PRIVATE_KEY  = process.env.OPENPAY_PRIVATE_KEY!

function authHeader() {
  return 'Basic ' + Buffer.from(`${PRIVATE_KEY}:`).toString('base64')
}

// POST /api/admin/orders/[id]/refund
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const denied = await checkAdminAccess()
  if (denied) return denied

  const supabase = createAdminClient()

  // ── Obtener orden ─────────────────────────────────────────────────────────
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, openpay_transaction_id, total')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })

  if (order.status === 'cancelled') {
    return NextResponse.json({ error: 'La orden ya está cancelada.' }, { status: 400 })
  }

  if (!order.openpay_transaction_id) {
    return NextResponse.json({ error: 'Esta orden no tiene transacción de OpenPay asociada.' }, { status: 400 })
  }

  // ── Llamar a OpenPay para reembolsar ──────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const description = (body as { description?: string }).description
    ?? 'Reembolso solicitado por administrador'

  const refundRes = await fetch(
    `${OPENPAY_API}/${MERCHANT_ID}/charges/${order.openpay_transaction_id}/refund`,
    {
      method:  'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body:    JSON.stringify({ description, amount: order.total }),
    }
  )

  const refundData = await refundRes.json()

  if (!refundRes.ok) {
    const msg = refundData.description ?? refundData.error_code ?? 'Error al reembolsar en OpenPay.'
    console.error('[refund] OpenPay error:', refundData)
    return NextResponse.json({ error: `OpenPay: ${msg}` }, { status: 400 })
  }

  // ── Marcar orden como cancelada en Supabase ───────────────────────────────
  const { data: updated, error: updateErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    console.error('[refund] Error actualizando orden:', updateErr)
    // El reembolso YA se realizó — no bloqueamos, solo logueamos
  }

  console.log('[refund] Reembolso exitoso:', order.openpay_transaction_id, '→ orden:', id)

  return NextResponse.json({
    success: true,
    orderId: id,
    refundId: refundData.id ?? null,
    order: updated ?? order,
  })
}
