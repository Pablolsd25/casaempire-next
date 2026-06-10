import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getWebhookTransactionId,
  parseOpenPayWebhookBody,
  verifyOpenPayWebhookBasicAuth,
} from '@/lib/openpay-webhook'
import { openpayFetch } from '@/lib/openpay-server'
import { sendCustomerOrderConfirmationIfNeeded } from '@/lib/order-confirmation-email'
import { idempotencyKeyVariants } from '@/lib/idempotency-key'
import { syncOrderWithOpenPayCharge } from '@/lib/openpay-order-recovery'

async function fetchCharge(transactionId: string) {
  try {
    const res = await openpayFetch(`/charges/${transactionId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function findOrderIdByTransaction(
  supabase: ReturnType<typeof createAdminClient>,
  transactionId: string | null,
  merchantOrderId: string | null | undefined
): Promise<string | null> {
  if (transactionId) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('openpay_transaction_id', transactionId)
      .maybeSingle()
    if (data?.id) return data.id
  }
  if (merchantOrderId) {
    for (const key of idempotencyKeyVariants(merchantOrderId)) {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('idempotency_key', key)
        .maybeSingle()
      if (data?.id) return data.id
    }
  }
  return null
}

async function logWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  payload: {
    event_type:     string
    transaction_id: string | null
    raw_payload:    Record<string, unknown>
    order_id?:      string | null
    status:         'received' | 'processed' | 'ignored' | 'error'
    error_message?: string
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from('webhook_events')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    console.error('[webhook] No se pudo guardar en webhook_events:', error.message, error.code)
    return null
  }
  return data?.id ?? null
}

async function updateWebhookLog(
  supabase: ReturnType<typeof createAdminClient>,
  logId: string,
  update: { status: 'processed' | 'ignored' | 'error'; error_message?: string; order_id?: string | null }
) {
  try {
    await supabase.from('webhook_events').update(update).eq('id', logId)
  } catch { /* silencioso */ }
}

function okResponse() {
  return NextResponse.json({ received: true }, { status: 200 })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/openpay
// OpenPay requiere HTTP 200; reintenta si no recibe éxito.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!verifyOpenPayWebhookBasicAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  let logId: string | null = null
  let body: Record<string, unknown> = {}

  try {
    body = await req.json()
    const parsed = parseOpenPayWebhookBody(body)
    const type = parsed.type ?? ''
    const transactionId = getWebhookTransactionId(parsed)
    const merchantOrderId = parsed.transaction?.order_id

    logId = await logWebhookEvent(supabase, {
      event_type:     type || 'unknown',
      transaction_id: transactionId,
      raw_payload:    body,
      status:         'received',
    })

    if (!type) {
      if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
      return okResponse()
    }

    // ── verification: al registrar webhook en dashboard ─────────────────────
    if (type === 'verification') {
      const code = parsed.verification_code ?? '(sin código)'
      if (logId) {
        await updateWebhookLog(supabase, logId, {
          status:        'processed',
          error_message: `Código de verificación recibido: ${code}. Cópialo en el dashboard de OpenPay.`,
        })
      }
      console.log('[webhook] verification — código:', code)
      return okResponse()
    }

    // ── charge.succeeded ─────────────────────────────────────────────────────
    if (type === 'charge.succeeded') {
      if (!transactionId) {
        if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
        return okResponse()
      }

      const charge = await fetchCharge(transactionId)
      if (charge?.status === 'completed' || charge?.status === 'in_progress') {
        let orderId = await findOrderIdByTransaction(supabase, transactionId, merchantOrderId)

        if (!orderId) {
          const recovered = await syncOrderWithOpenPayCharge(supabase, charge, {
            fulfill: true,
          })
          orderId = recovered?.orderId ?? null
        } else {
          const newStatus = charge.status === 'completed' ? 'paid' : 'pending'
          const { data: existing } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single()

          await supabase
            .from('orders')
            .update({
              status:                 newStatus,
              openpay_transaction_id: transactionId,
            })
            .eq('id', orderId)

          if (newStatus === 'paid' && existing?.status !== 'paid') {
            await sendCustomerOrderConfirmationIfNeeded(supabase, orderId)
          }
        }

        if (logId) {
          await updateWebhookLog(supabase, logId, {
            status:   'processed',
            order_id: orderId,
          })
        }
      } else {
        if (logId) {
          await updateWebhookLog(supabase, logId, {
            status:        'error',
            error_message: `OpenPay status inesperado: ${charge?.status ?? 'null'}`,
          })
        }
      }

    // ── charge.failed ───────────────────────────────────────────────────────
    } else if (type === 'charge.failed') {
      if (!transactionId) {
        if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
        return okResponse()
      }

      const charge = await fetchCharge(transactionId)
      if (charge && charge.status !== 'completed' && charge.status !== 'in_progress') {
        const { data: updatedOrder } = await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('openpay_transaction_id', transactionId)
          .select('id')
          .single()

        if (logId) {
          await updateWebhookLog(supabase, logId, {
            status:   'processed',
            order_id: updatedOrder?.id ?? null,
          })
        }
      } else if (logId) {
        await updateWebhookLog(supabase, logId, { status: 'ignored' })
      }

    // ── charge.cancelled / charge.refunded ──────────────────────────────────
    } else if (type === 'charge.cancelled' || type === 'charge.refunded') {
      if (!transactionId) {
        if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
        return okResponse()
      }

      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('openpay_transaction_id', transactionId)
        .select('id')
        .single()

      if (logId) {
        await updateWebhookLog(supabase, logId, {
          status:   'processed',
          order_id: updatedOrder?.id ?? null,
        })
      }

    // ── chargeback.created — investigación iniciada ─────────────────────────
    } else if (type === 'chargeback.created') {
      const { data: order } = transactionId
        ? await supabase
            .from('orders')
            .select('id')
            .eq('openpay_transaction_id', transactionId)
            .single()
        : { data: null }

      if (logId) {
        await updateWebhookLog(supabase, logId, {
          status:        'processed',
          order_id:      order?.id ?? null,
          error_message: 'Contracargo recibido — en revisión por el banco.',
        })
      }

    // ── chargeback.accepted — contracargo perdido ───────────────────────────
    } else if (type === 'chargeback.accepted') {
      if (!transactionId) {
        if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
        return okResponse()
      }

      const { data: updatedOrder } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('openpay_transaction_id', transactionId)
        .select('id')
        .single()

      if (logId) {
        await updateWebhookLog(supabase, logId, {
          status:        'processed',
          order_id:      updatedOrder?.id ?? null,
          error_message: 'Contracargo aceptado — fondos devueltos al cliente.',
        })
      }

    // ── chargeback.rejected — ganado a favor del comercio ───────────────────
    } else if (type === 'chargeback.rejected') {
      const { data: order } = transactionId
        ? await supabase
            .from('orders')
            .select('id')
            .eq('openpay_transaction_id', transactionId)
            .single()
        : { data: null }

      if (logId) {
        await updateWebhookLog(supabase, logId, {
          status:        'processed',
          order_id:      order?.id ?? null,
          error_message: 'Contracargo rechazado — a favor del comercio.',
        })
      }

    // ── Compatibilidad: nombres antiguos (por si algún entorno los envía) ───
    } else if (type === 'charge.chargeback.accepted') {
      if (transactionId) {
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('openpay_transaction_id', transactionId)
      }
      if (logId) await updateWebhookLog(supabase, logId, { status: 'processed' })

    } else if (type === 'charge.chargeback.in_review') {
      if (logId) await updateWebhookLog(supabase, logId, { status: 'processed' })

    } else {
      console.log('[webhook] Evento no manejado (se registra):', type)
      if (logId) await updateWebhookLog(supabase, logId, { status: 'ignored' })
    }

    return okResponse()

  } catch (err) {
    console.error('[webhook] Error inesperado:', err)
    if (logId) {
      await updateWebhookLog(supabase, logId, {
        status:        'error',
        error_message: String(err),
      })
    } else {
      await logWebhookEvent(supabase, {
        event_type:     'unknown',
        transaction_id: null,
        raw_payload:    body,
        status:         'error',
        error_message:  String(err),
      })
    }
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
