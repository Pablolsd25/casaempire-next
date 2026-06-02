/** Mensajes de error OpenPay homologados para el cliente (sin detalles sensibles del emisor) */

const DECLINED_GENERIC =
  'Tu tarjeta fue declinada. Intenta con otra tarjeta o contacta a tu banco.'

/** Códigos que deben mostrarse como declinación genérica (OpenPay homologación) */
const SENSITIVE_DECLINE_CODES = new Set([
  3001, 3003, 3004, 3005, 3006, 3008, 3009, 3010, 3011, 3012,
])

const OPENPAY_ERROR_MESSAGES: Record<number, string> = {
  1001: 'Los datos enviados son inválidos. Verifica la información e intenta de nuevo.',
  1002: 'No estás autorizado para realizar esta operación.',
  1003: 'La solicitud contiene parámetros incorrectos.',
  1004: 'El servicio de pagos no está disponible en este momento. Intenta más tarde.',
  2004: 'El número de tarjeta no es válido. Verifica los dígitos.',
  2005: 'La tarjeta ha expirado. Usa una tarjeta vigente.',
  2006: 'El código de seguridad (CVV) no fue proporcionado.',
  2007: 'Esta tarjeta de prueba solo funciona en modo sandbox.',
  2009: 'El código de seguridad (CVV) es incorrecto.',
  2010: 'La autenticación 3D Secure falló. Intenta de nuevo.',
  2011: 'Este tipo de tarjeta no admite pagos en línea.',
  3002: 'La tarjeta ha expirado. Usa una tarjeta vigente.',
  3007: 'Esta operación no está permitida para esta tarjeta.',
  4001: 'El pago no pudo completarse. Intenta más tarde.',
  4002: 'El pago no pudo completarse. Intenta más tarde.',
}

export function getOpenPayError(charge: {
  error_code?: number
  description?: string
}): string {
  const code = charge.error_code
  if (code != null && SENSITIVE_DECLINE_CODES.has(code)) {
    return DECLINED_GENERIC
  }
  if (code != null && OPENPAY_ERROR_MESSAGES[code]) {
    return OPENPAY_ERROR_MESSAGES[code]
  }
  return charge.description ?? DECLINED_GENERIC
}

/** Errores de tokenización OpenPay.js (código string) */
export function getOpenPayTokenError(code: string): string {
  const tokenErrors: Record<string, string> = {
    '400': 'Los datos de la tarjeta son inválidos.',
    '401': 'No autorizado. Verifica la configuración.',
    '402': DECLINED_GENERIC,
    '500': 'Error del servicio de pagos. Intenta más tarde.',
  }
  return tokenErrors[code] ?? DECLINED_GENERIC
}
