/**
 * Tipos y helpers según documentación OpenPay:
 * https://documents.openpay.mx/docs/webhooks
 * https://documents.openpay.mx/docs/api/index.html#webhooks
 */

/** Eventos de cargo / contracargo que usamos en checkout con tarjeta */
export const OPENPAY_WEBHOOK_EVENT_TYPES = [
  'charge.succeeded',
  'charge.failed',
  'charge.cancelled',
  'charge.refunded',
  'chargeback.created',
  'chargeback.accepted',
  'chargeback.rejected',
] as const

export type OpenPayWebhookBody = {
  type?: string
  event_date?: string
  verification_code?: string
  transaction?: { id?: string; status?: string; order_id?: string }
  /** Forma alternativa (no documentada en guía principal; compatibilidad) */
  data?: { object?: { id?: string } }
}

export function parseOpenPayWebhookBody(body: Record<string, unknown>): OpenPayWebhookBody {
  return body as OpenPayWebhookBody
}

/** ID del cargo/transacción — doc oficial: transaction.id */
export function getWebhookTransactionId(body: OpenPayWebhookBody): string | null {
  if (body.transaction?.id) return body.transaction.id
  return body.data?.object?.id ?? null
}

export function verifyOpenPayWebhookBasicAuth(
  authorizationHeader: string | null
): boolean {
  const expectedUser = process.env.OPENPAY_WEBHOOK_USER
  const expectedPass = process.env.OPENPAY_WEBHOOK_PASSWORD
  if (!expectedUser || !expectedPass) {
    console.error('[openpay-webhook] OPENPAY_WEBHOOK_USER/PASSWORD no configurados — rechazando webhook')
    return false
  }

  if (!authorizationHeader?.startsWith('Basic ')) return false
  const decoded = Buffer.from(authorizationHeader.slice(6), 'base64').toString('utf8')
  const colon = decoded.indexOf(':')
  if (colon < 0) return false
  const user = decoded.slice(0, colon)
  const pass = decoded.slice(colon + 1)
  return user === expectedUser && pass === expectedPass
}
